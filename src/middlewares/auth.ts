import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/data-source";
import { NovaUsuario } from "../entities/novaUsuario";

// Tipado para req.user
export interface AuthUser {
    usuario_id: number;
    usuario_nombre: string;
    usuario_email: string;
    rol_id: number;
    rol_nombre: string;
    permisos: string[];
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
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

    return {
        usuario_id: usuario.usuario_id,
        usuario_nombre: usuario.usuario_nombre,
        usuario_email: usuario.usuario_email,
        rol_id: usuario.rol.rol_id,
        rol_nombre: usuario.rol.rol_nombre,
        permisos: (usuario.rol.permisos ?? []).map((p) => p.permiso_codigo)
    };
}

/** Middleware: verifica Bearer JWT y recarga usuario desde BD. */
export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ message: "Token de autenticación requerido" });
        return;
    }

    const token = authHeader.slice(7);
    try {
        const payload = jwt.verify(token, getSecret()) as unknown as { sub: number };
        const user = await loadUserFromDb(payload.sub);

        if (!user) {
            res.status(403).json({ message: "Usuario inactivo o sin rol válido" });
            return;
        }

        req.user = user;
        next();
    } catch (err: any) {
        if (err?.name === "TokenExpiredError") {
            res.status(401).json({ message: "El token ha expirado" });
        } else if (err?.message?.includes("JWT_SECRET")) {
            res.status(500).json({ message: "Error de configuración del servidor" });
        } else {
            res.status(401).json({ message: "Token inválido" });
        }
    }
};

/** Middleware: requiere al menos uno de los permisos indicados. */
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

/** Middleware: elige permiso según método HTTP. GET/HEAD usan lectura; el resto escritura. */
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
