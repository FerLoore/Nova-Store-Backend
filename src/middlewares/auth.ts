import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/data-source";
import { NovaUsuario } from "../entities/novaUsuario";
import { NovaRolModulo, NivelModulo, NombreModulo, MODULOS_VALIDOS } from "../entities/novaRolModulo";

// Tipado para req.user
export interface AuthUser {
    usuario_id: number;
    usuario_nombre: string;
    usuario_email: string;
    rol_id: number;
    rol_nombre: string;
    permisos: string[];                        // legado, se conserva
    permisosModulo: Record<NombreModulo, NivelModulo>; // nuevo
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

// ─── Caché de permisos por módulo por rol ───────────────────────────────────
const rolModuloCache = new Map<number, Record<NombreModulo, NivelModulo>>();

export function invalidateRolCache(rolId: number): void {
    rolModuloCache.delete(rolId);
}

export function invalidateAllRolCache(): void {
    rolModuloCache.clear();
}

// ─── Helpers de nivel ───────────────────────────────────────────────────────
const NIVEL_ORDEN: Record<NivelModulo, number> = {
    NINGUNO: 0,
    LECTURA: 1,
    ESCRITURA: 2
};

function nivelSuficiente(nivelActual: NivelModulo, nivelMinimo: NivelModulo): boolean {
    return NIVEL_ORDEN[nivelActual] >= NIVEL_ORDEN[nivelMinimo];
}

// Mapa de todos los módulos en NINGUNO (base vacía)
function mapaVacio(): Record<NombreModulo, NivelModulo> {
    const m: Partial<Record<NombreModulo, NivelModulo>> = {};
    for (const mod of MODULOS_VALIDOS) m[mod] = "NINGUNO";
    return m as Record<NombreModulo, NivelModulo>;
}

// Mapa con todos en ESCRITURA (para ADMINISTRADOR)
function mapaEscritura(): Record<NombreModulo, NivelModulo> {
    const m: Partial<Record<NombreModulo, NivelModulo>> = {};
    for (const mod of MODULOS_VALIDOS) m[mod] = "ESCRITURA";
    return m as Record<NombreModulo, NivelModulo>;
}

/** Carga y cachea los permisos por módulo para un rol. */
async function loadPermisosModulo(rolId: number): Promise<Record<NombreModulo, NivelModulo>> {
    // ADMINISTRADOR: bypass total
    if (rolId === 1) return mapaEscritura();

    if (rolModuloCache.has(rolId)) {
        return rolModuloCache.get(rolId)!;
    }

    const filas = await AppDataSource.getRepository(NovaRolModulo).find({
        where: { rmo_rol: rolId }
    });

    const mapa = mapaVacio();
    for (const fila of filas) {
        if (MODULOS_VALIDOS.includes(fila.rmo_modulo as NombreModulo)) {
            mapa[fila.rmo_modulo as NombreModulo] = fila.rmo_nivel;
        }
    }

    rolModuloCache.set(rolId, mapa);
    return mapa;
}

/** Lee JWT_SECRET de forma perezosa y valida longitud mínima. */
function getSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 16) {
        throw new Error("JWT_SECRET debe tener al menos 16 caracteres");
    }
    return secret;
}

/** Extrae el usuario completo + permisos desde la BD en cada petición. */
async function loadUserFromDb(usuario_id: number): Promise<AuthUser | null> {
    const repo = AppDataSource.getRepository(NovaUsuario);
    const usuario = await repo.findOne({
        where: { usuario_id, usuario_activo: 1 },
        relations: { rol: { permisos: true } }
    });

    if (!usuario || !usuario.rol || usuario.rol.rol_activo !== 1) return null;

    const permisosModulo = await loadPermisosModulo(usuario.rol.rol_id);

    return {
        usuario_id: usuario.usuario_id,
        usuario_nombre: usuario.usuario_nombre,
        usuario_email: usuario.usuario_email,
        rol_id: usuario.rol.rol_id,
        rol_nombre: usuario.rol.rol_nombre,
        permisos: (usuario.rol.permisos ?? []).map((p) => p.permiso_codigo),
        permisosModulo
    };
}

/** Middleware: verifica Bearer JWT y recarga usuario desde BD. */
export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        res.status(401).json({ message: "No autenticado" });
        return;
    }

    const token = header.slice(7);
    let payload: { sub?: unknown };
    try {
        payload = jwt.verify(token, getSecret()) as { sub?: unknown };
    } catch {
        res.status(401).json({ message: "Token inválido o expirado" });
        return;
    }

    const usuario_id = Number(payload.sub);
    if (!Number.isInteger(usuario_id) || usuario_id < 1) {
        res.status(401).json({ message: "Token malformado" });
        return;
    }

    const user = await loadUserFromDb(usuario_id);
    if (!user) {
        res.status(401).json({ message: "Usuario inactivo o sin rol válido" });
        return;
    }

    req.user = user;
    next();
};

// ─── Middleware NUEVO: requirePermiso ───────────────────────────────────────
/**
 * Verifica que el usuario tenga al menos nivelMinimo en el módulo dado.
 * ADMINISTRADOR (rol_id=1) siempre pasa.
 */
export const requirePermiso = (modulo: NombreModulo, nivelMinimo: NivelModulo) =>
    (req: Request, res: Response, next: NextFunction): void => {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: "No autenticado" });
            return;
        }
        // ADMINISTRADOR bypass total
        if (user.rol_id === 1) { next(); return; }

        const nivelActual = user.permisosModulo?.[modulo] ?? "NINGUNO";
        if (!nivelSuficiente(nivelActual, nivelMinimo)) {
            res.status(403).json({
                message: `Se requiere nivel ${nivelMinimo} en módulo ${modulo}. Nivel actual: ${nivelActual}`
            });
            return;
        }
        next();
    };

/**
 * Selecciona LECTURA para GET/HEAD, ESCRITURA para el resto.
 * Nuevo sistema por módulo.
 */
export const requirePermisoByMethod = (modulo: NombreModulo) =>
    (req: Request, res: Response, next: NextFunction): void => {
        const nivelMinimo: NivelModulo = ["GET", "HEAD"].includes(req.method.toUpperCase())
            ? "LECTURA"
            : "ESCRITURA";
        requirePermiso(modulo, nivelMinimo)(req, res, next);
    };

// ─── Middlewares LEGADOS (conservados para no romper nada todavía) ──────────

/** @deprecated Usar requirePermiso() en su lugar */
export const requirePermission = (...codigos: string[]) =>
    (req: Request, res: Response, next: NextFunction): void => {
        const permisos = req.user?.permisos ?? [];
        const tiene = codigos.some((c) => permisos.includes(c));
        if (!tiene) {
            res.status(403).json({ message: "No tienes permiso para realizar esta acción" });
            return;
        }
        next();
    };

/** @deprecated Usar requirePermisoByMethod() en su lugar */
export const requirePermissionByMethod = (opts: {
    lectura: string[];
    escritura: string[];
}) =>
    (req: Request, res: Response, next: NextFunction): void => {
        const metodo = req.method.toUpperCase();
        const codigos = ["GET", "HEAD"].includes(metodo) ? opts.lectura : opts.escritura;
        const permisos = req.user?.permisos ?? [];
        const tiene = codigos.some((c) => permisos.includes(c));
        if (!tiene) {
            res.status(403).json({ message: "No tienes permiso para realizar esta acción" });
            return;
        }
        next();
    };

/** @deprecated Usar requirePermiso() en su lugar */
export const requireRole = (...roles: string[]) =>
    (req: Request, res: Response, next: NextFunction): void => {
        const userRole = (req.user?.rol_nombre || "").trim().toUpperCase();
        const isAllowed = roles.some((r) => {
            const target = r.trim().toUpperCase();
            return userRole === target || (target === "ADMIN" && userRole.includes("ADMIN"));
        });

        if (!isAllowed) {
            res.status(403).json({
                message: `Acceso restringido. Se requiere rol ${roles.join(" o ")} para realizar esta acción`
            });
            return;
        }
        next();
    };
