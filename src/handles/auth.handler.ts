import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/data-source";
import { NovaUsuario } from "../entities/novaUsuario";
import { NovaRol } from "../entities/novaRol";

const usuarioRepo = () => AppDataSource.getRepository(NovaUsuario);
const rolRepo = () => AppDataSource.getRepository(NovaRol);

const JWT_SECRET = process.env.JWT_SECRET || "nova_secret_key_change_in_prod";
const JWT_EXPIRES = "8h";

// Obtener códigos de permisos de un rol desde la BD
const getPermisosForRol = async (rolId: number): Promise<string[]> => {
    try {
        const rows = await AppDataSource.query(
            `SELECT p.PERM_CODIGO AS "permiso_codigo"
             FROM NOVA_ROL_PERMISO rp
             JOIN NOVA_PERMISO p ON rp.PERM_PERMISO = p.PERM_PERMISO
             WHERE rp.ROL_ROL = :1`,
            [rolId]
        );
        return rows.map((r: any) => r.permiso_codigo);
    } catch {
        return [];
    }
};

// Menú basado en rol y permisos asignados
const buildMenu = (rolNombre: string, permisos: string[] = []) => {
    const isAdmin = rolNombre?.toUpperCase().includes("ADMIN");
    if (isAdmin) {
        return [
            { clave: "usuarios",    etiqueta: "Usuarios",          ruta: "/usuarios" },
            { clave: "roles",       etiqueta: "Roles y Permisos",   ruta: "/roles" },
            { clave: "clientes",    etiqueta: "Clientes",           ruta: "/clientes" },
            { clave: "productos",   etiqueta: "Productos",          ruta: "/productos" },
            { clave: "inventario",  etiqueta: "Inventario y Stock", ruta: "/inventario" },
            { clave: "proveedores", etiqueta: "Proveedores",        ruta: "/proveedores" },
            { clave: "compras",     etiqueta: "Compras",            ruta: "/compras" },
            { clave: "ventas",      etiqueta: "Ventas",             ruta: "/ventas" },
        ];
    }
    const menu = [];
    if (permisos.includes("USUARIOS_GESTIONAR")) {
        menu.push({ clave: "usuarios", etiqueta: "Usuarios", ruta: "/usuarios" });
    }
    if (permisos.includes("ROLES_GESTIONAR")) {
        menu.push({ clave: "roles", etiqueta: "Roles y Permisos", ruta: "/roles" });
    }
    if (permisos.includes("CLIENTES_GESTIONAR")) {
        menu.push({ clave: "clientes", etiqueta: "Clientes", ruta: "/clientes" });
    }
    if (permisos.includes("PRODUCTOS_GESTIONAR") || permisos.includes("PRODUCTOS_VER")) {
        menu.push({ clave: "productos", etiqueta: "Productos", ruta: "/productos" });
        menu.push({ clave: "inventario", etiqueta: "Inventario y Stock", ruta: "/inventario" });
        menu.push({ clave: "proveedores", etiqueta: "Proveedores", ruta: "/proveedores" });
    }
    return menu;
};

// Sanitizar usuario (sin password)
const sanitize = (u: NovaUsuario, rol?: NovaRol, permisos: string[] = []) => ({
    usuario_id:     u.usuario_id,
    usuario_nombre: u.usuario_nombre,
    usuario_email:  u.usuario_email,
    rol_id:         u.rol_id,
    rol_nombre:     rol?.rol_nombre ?? u.rol?.rol_nombre ?? "",
    permisos,
});

// ──────────────────────────────────────────────
// POST /auth/register
// ──────────────────────────────────────────────
export const register = async (req: Request, res: Response) => {
    try {
        const { usuario_nombre, usuario_email, usuario_password, rol_id } = req.body;

        if (!usuario_nombre || !usuario_email || !usuario_password) {
            return res.status(400).json({ message: "Nombre, correo y contraseña son obligatorios" });
        }

        // Verificar si el correo ya existe
        const existe = await usuarioRepo().findOneBy({ usuario_email });
        if (existe) {
            return res.status(400).json({ message: "El correo electrónico ya está registrado" });
        }

        // Determinar rol: si no se provee, usar el primer rol ADMINISTRADOR
        let rolFinal: NovaRol | null = null;
        if (rol_id) {
            rolFinal = await rolRepo().findOneBy({ rol_id: Number(rol_id), rol_activo: 1 });
            if (!rolFinal) {
                return res.status(400).json({ message: "El rol especificado no existe o está inactivo" });
            }
        } else {
            // Asignar rol 1 (ADMINISTRADOR) por defecto si no se especifica
            rolFinal = await rolRepo().findOneBy({ rol_id: 1 });
            if (!rolFinal) {
                // Si no existe el rol 1, tomar el primer rol activo
                rolFinal = await rolRepo().findOne({ where: { rol_activo: 1 } });
            }
            if (!rolFinal) {
                return res.status(500).json({ message: "No hay roles activos disponibles. Crea un rol primero." });
            }
        }

        const hashedPassword = await bcrypt.hash(usuario_password, 10);

        const nuevo = usuarioRepo().create({
            usuario_nombre,
            usuario_email,
            usuario_password: hashedPassword,
            rol_id: rolFinal.rol_id,
            usuario_activo: 1,
        });

        const guardado = await usuarioRepo().save(nuevo);
        const usuarioData = sanitize(guardado, rolFinal);

        const token = jwt.sign(
            { sub: guardado.usuario_id, rol_id: rolFinal.rol_id },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );

        return res.status(201).json({
            message: "Usuario registrado exitosamente",
            token,
            usuario: usuarioData,
            menu: buildMenu(rolFinal.rol_nombre),
        });
    } catch (error: any) {
        console.error("ERROR EN REGISTER:", error);
        if (error.code === "ORA-00001") {
            return res.status(400).json({ message: "El correo electrónico ya está registrado" });
        }
        return res.status(500).json({ message: "Error al registrar usuario" });
    }
};

// ──────────────────────────────────────────────
// POST /auth/login
// ──────────────────────────────────────────────
export const login = async (req: Request, res: Response) => {
    try {
        const { usuario_email, usuario_password } = req.body;

        if (!usuario_email || !usuario_password) {
            return res.status(400).json({ message: "Correo y contraseña son obligatorios" });
        }

        const usuario = await usuarioRepo().findOne({
            where: { usuario_email, usuario_activo: 1 },
            relations: { rol: true },
        });

        if (!usuario) {
            return res.status(401).json({ message: "Credenciales inválidas" });
        }

        const passwordOk = await bcrypt.compare(usuario_password, usuario.usuario_password);
        if (!passwordOk) {
            return res.status(401).json({ message: "Credenciales inválidas" });
        }

        const permisos = await getPermisosForRol(usuario.rol_id);
        const usuarioData = sanitize(usuario, usuario.rol, permisos);

        const token = jwt.sign(
            { sub: usuario.usuario_id, rol_id: usuario.rol_id },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );

        return res.json({
            token,
            usuario: usuarioData,
            menu: buildMenu(usuario.rol?.rol_nombre ?? "", permisos),
        });
    } catch (error) {
        console.error("ERROR EN LOGIN:", error);
        return res.status(500).json({ message: "Error al iniciar sesión" });
    }
};

// ──────────────────────────────────────────────
// GET /auth/me  (requiere token válido)
// ──────────────────────────────────────────────
export const me = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Token requerido" });
        }

        const token = authHeader.slice(7);
        let payload: any;
        try {
            payload = jwt.verify(token, JWT_SECRET);
        } catch {
            return res.status(401).json({ message: "Token inválido o expirado" });
        }

        const usuario = await usuarioRepo().findOne({
            where: { usuario_id: payload.sub, usuario_activo: 1 },
            relations: { rol: true },
        });

        if (!usuario) {
            return res.status(401).json({ message: "Usuario no encontrado o inactivo" });
        }

        const permisos = await getPermisosForRol(usuario.rol_id);
        const usuarioData = sanitize(usuario, usuario.rol, permisos);

        return res.json({
            usuario: usuarioData,
            menu: buildMenu(usuario.rol?.rol_nombre ?? "", permisos),
        });
    } catch (error) {
        console.error("ERROR EN ME:", error);
        return res.status(500).json({ message: "Error al obtener sesión" });
    }
};

// ──────────────────────────────────────────────
// GET /auth/roles  (roles activos para el registro)
// ──────────────────────────────────────────────
export const getRolesPublicos = async (_req: Request, res: Response) => {
    try {
        const roles = await rolRepo().find({ where: { rol_activo: 1 } });
        return res.json(roles);
    } catch (error) {
        console.error("ERROR EN GET ROLES:", error);
        return res.status(500).json({ message: "Error obteniendo roles" });
    }
};
