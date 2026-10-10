import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/data-source";
import { NovaUsuario } from "../entities/novaUsuario";
import { isValidEmail } from "../utils/validation";

// Hash falso para igualar tiempos cuando el usuario no existe
const DUMMY_HASH = "$2b$10$dummy.hash.to.prevent.timing.attacks.xxxxxxxxxxxxxxxx";

/** Lee JWT_SECRET de forma perezosa y valida mínimo 16 caracteres. */
function getSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 16) {
        throw new Error("JWT_SECRET debe tener al menos 16 caracteres en .env");
    }
    return secret;
}

/** Construye el menú filtrado por permisos del usuario. */
function buildMenu(permisos: string[]) {
    const MENU_ITEMS = [
        { clave: "usuarios",  etiqueta: "Usuarios",         ruta: "/usuarios",  permiso: "USUARIOS_GESTIONAR" },
        { clave: "roles",     etiqueta: "Roles y permisos",  ruta: "/roles",     permiso: "ROLES_GESTIONAR" },
        { clave: "clientes",  etiqueta: "Clientes",          ruta: "/clientes",  permiso: "CLIENTES_GESTIONAR" },
        { clave: "productos", etiqueta: "Productos",          ruta: "/productos", permiso: ["PRODUCTOS_VER", "PRODUCTOS_GESTIONAR"] },
    ];

    return MENU_ITEMS
        .filter((item) => {
            const needed = Array.isArray(item.permiso) ? item.permiso : [item.permiso];
            return needed.some((p) => permisos.includes(p));
        })
        .map(({ clave, etiqueta, ruta }) => ({ clave, etiqueta, ruta }));
}

// POST /auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { usuario_email, usuario_password } = req.body;

        // Validaciones básicas
        if (!usuario_email || !isValidEmail(String(usuario_email))) {
            res.status(400).json({ message: "Formato de email inválido" });
            return;
        }
        if (!usuario_password) {
            res.status(400).json({ message: "La contraseña es requerida" });
            return;
        }

        const repo = AppDataSource.getRepository(NovaUsuario);
        const usuario = await repo.findOne({
            where: { usuario_email: String(usuario_email) },
            relations: { rol: { permisos: true } }
        });

        // Comparar siempre para igualar tiempos (timing-safe)
        const hashToCompare = usuario?.usuario_password ?? DUMMY_HASH;
        const passwordOk = await bcrypt.compare(String(usuario_password), hashToCompare);

        if (!usuario || !passwordOk) {
            res.status(401).json({ message: "Credenciales inválidas" });
            return;
        }

        if (usuario.usuario_activo !== 1) {
            res.status(403).json({ message: "Usuario inactivo" });
            return;
        }
        if (!usuario.rol || usuario.rol.rol_activo !== 1) {
            res.status(403).json({ message: "El rol asignado está inactivo" });
            return;
        }

        const permisos = (usuario.rol.permisos ?? []).map((p) => p.permiso_codigo);

        const expiresIn = (process.env.JWT_EXPIRES_IN || "8h") as string;
        const token = jwt.sign(
            { sub: usuario.usuario_id },
            getSecret(),
            { expiresIn } as jwt.SignOptions
        );

        const menu = buildMenu(permisos);

        res.json({
            token,
            usuario: {
                usuario_id:     usuario.usuario_id,
                usuario_nombre: usuario.usuario_nombre,
                usuario_email:  usuario.usuario_email,
                rol_id:         usuario.rol.rol_id,
                rol_nombre:     usuario.rol.rol_nombre,
                permisos
            },
            menu
        });
    } catch (error: any) {
        console.error("ERROR LOGIN:", error);
        if (error?.message?.includes("JWT_SECRET")) {
            res.status(500).json({ message: "Error de configuración del servidor" });
            return;
        }
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// GET /auth/me — requiere authenticate previo
export const me = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user!;
        const menu = buildMenu(user.permisos);
        res.json({ usuario: user, menu });
    } catch (error) {
        console.error("ERROR /auth/me:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};
