import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/data-source";
import { NovaUsuario } from "../entities/novaUsuario";
import { NovaRol } from "../entities/novaRol";
import { NovaRolModulo, MODULOS_VALIDOS, NivelModulo, NombreModulo } from "../entities/novaRolModulo";
import { isValidEmail, trimOrNull, getOraCode } from "../utils/validation";

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

/** Construye el mapa módulo→nivel para el rol dado. */
async function buildPermisosModulo(rolId: number): Promise<Record<NombreModulo, NivelModulo>> {
    const mapa: Partial<Record<NombreModulo, NivelModulo>> = {};
    for (const mod of MODULOS_VALIDOS) mapa[mod] = "NINGUNO";

    // ADMINISTRADOR: bypass total
    if (rolId === 1) {
        for (const mod of MODULOS_VALIDOS) mapa[mod] = "ESCRITURA";
        return mapa as Record<NombreModulo, NivelModulo>;
    }

    const filas = await AppDataSource.getRepository(NovaRolModulo).find({
        where: { rmo_rol: rolId }
    });
    for (const fila of filas) {
        if (MODULOS_VALIDOS.includes(fila.rmo_modulo as NombreModulo)) {
            mapa[fila.rmo_modulo as NombreModulo] = fila.rmo_nivel;
        }
    }
    return mapa as Record<NombreModulo, NivelModulo>;
}

/** Construye el menú según el mapa de permisos por módulo. */
function buildMenuFromModulos(permisosModulo: Record<NombreModulo, NivelModulo>) {
    const MENU_ITEMS = [
        { clave: "usuarios",     etiqueta: "Usuarios",          ruta: "/usuarios",             modulo: "USUARIOS" as NombreModulo },
        { clave: "roles",        etiqueta: "Roles y permisos",  ruta: "/roles",                modulo: "ROLES" as NombreModulo },
        { clave: "clientes",     etiqueta: "Clientes",          ruta: "/clientes",             modulo: "CLIENTES" as NombreModulo },
        { clave: "productos",    etiqueta: "Productos",         ruta: "/productos",            modulo: "PRODUCTOS" as NombreModulo },
        { clave: "marcas",       etiqueta: "Marcas",            ruta: "/marcas",               modulo: "PRODUCTOS" as NombreModulo },
        { clave: "inventario",   etiqueta: "Inventario",        ruta: "/inventario",           modulo: "INVENTARIO" as NombreModulo },
        { clave: "proveedores",  etiqueta: "Proveedores",       ruta: "/proveedores",          modulo: "COMPRAS" as NombreModulo },
        { clave: "compras",      etiqueta: "Compras",           ruta: "/compras",              modulo: "COMPRAS" as NombreModulo },
        { clave: "pedidos",      etiqueta: "Nuevo Pedido",      ruta: "/pedidos",              modulo: "PEDIDOS" as NombreModulo },
        { clave: "aprobaciones", etiqueta: "Aprobaciones",      ruta: "/pedidos/aprobaciones", modulo: "APROBACIONES" as NombreModulo },
        { clave: "ventas",       etiqueta: "Ventas",            ruta: "/ventas",               modulo: "VENTAS" as NombreModulo },
        { clave: "reportes",     etiqueta: "Reportes",          ruta: "/reportes",             modulo: "REPORTES" as NombreModulo },
        { clave: "auditoria",    etiqueta: "Auditoría",         ruta: "/auditoria",            modulo: "AUDITORIA" as NombreModulo },
    ];

    return MENU_ITEMS
        .filter((item) => (permisosModulo[item.modulo] ?? "NINGUNO") !== "NINGUNO")
        .map(({ clave, etiqueta, ruta }) => ({ clave, etiqueta, ruta }));
}

// POST /auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { usuario_email, usuario_password } = req.body;

        const emailNormalizado = String(usuario_email).trim().toLowerCase();

        if (!emailNormalizado || !isValidEmail(emailNormalizado)) {
            res.status(400).json({ message: "Formato de email inválido" });
            return;
        }
        if (!usuario_password) {
            res.status(400).json({ message: "La contraseña es requerida" });
            return;
        }

        const repo = AppDataSource.getRepository(NovaUsuario);
        const usuario = await repo.findOne({
            where: { usuario_email: emailNormalizado },
            relations: { rol: { permisos: true } }
        });

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
        const permisosModulo = await buildPermisosModulo(usuario.rol.rol_id);

        const expiresIn = (process.env.JWT_EXPIRES_IN || "8h") as string;
        const token = jwt.sign(
            { sub: usuario.usuario_id },
            getSecret(),
            { expiresIn } as jwt.SignOptions
        );

        const menu = buildMenuFromModulos(permisosModulo);

        res.json({
            token,
            usuario: {
                usuario_id:     usuario.usuario_id,
                usuario_nombre: usuario.usuario_nombre,
                usuario_email:  usuario.usuario_email,
                rol_id:         usuario.rol.rol_id,
                rol_nombre:     usuario.rol.rol_nombre,
                permisos,
                permisosModulo
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
        const menu = buildMenuFromModulos(user.permisosModulo);
        res.json({ usuario: user, menu });
    } catch (error) {
        console.error("ERROR /auth/me:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// POST /auth/register — registro público de usuario
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { usuario_nombre, usuario_email, usuario_password, rol_id } = req.body;
        const errors: string[] = [];

        const nombre = trimOrNull(usuario_nombre);
        if (!nombre) {
            errors.push("El nombre es obligatorio");
        } else if (nombre.length > 100) {
            errors.push("El nombre no puede exceder 100 caracteres");
        }

        const email = trimOrNull(usuario_email);
        if (!email || !isValidEmail(email)) {
            errors.push("Debes ingresar un correo electrónico válido");
        }

        const password = trimOrNull(usuario_password);
        if (!password) {
            errors.push("La contraseña es obligatoria");
        } else if (password.length < 8 || password.length > 72) {
            errors.push("La contraseña debe tener entre 8 y 72 caracteres");
        }

        if (errors.length > 0) {
            res.status(400).json({ message: errors.join("; ") });
            return;
        }

        const usuarioRepo = AppDataSource.getRepository(NovaUsuario);
        const rolRepo = AppDataSource.getRepository(NovaRol);

        const existingUser = await usuarioRepo.findOne({
            where: { usuario_email: email! }
        });
        if (existingUser) {
            res.status(400).json({ message: "El correo electrónico ya está registrado" });
            return;
        }

        let assignedRolId: number;
        if (rol_id !== undefined && rol_id !== null && rol_id !== "") {
            const parsedRolId = Number(rol_id);
            if (!Number.isInteger(parsedRolId) || parsedRolId < 1) {
                res.status(400).json({ message: "rol_id debe ser un entero positivo" });
                return;
            }
            const rolExistente = await rolRepo.findOneBy({ rol_id: parsedRolId, rol_activo: 1 });
            if (!rolExistente) {
                res.status(400).json({ message: "El rol seleccionado no existe o está inactivo" });
                return;
            }
            assignedRolId = parsedRolId;
        } else {
            const defaultRol = await rolRepo.findOne({
                where: { rol_activo: 1 },
                order: { rol_id: "ASC" }
            });
            if (!defaultRol) {
                res.status(500).json({ message: "No hay roles activos disponibles en el sistema" });
                return;
            }
            assignedRolId = defaultRol.rol_id;
        }

        const hashedPassword = await bcrypt.hash(password!, 10);
        const nuevoUsuario = usuarioRepo.create({
            rol_id: assignedRolId,
            usuario_nombre: nombre!,
            usuario_email: email!,
            usuario_password: hashedPassword,
            usuario_activo: 1
        });

        const savedUser = await usuarioRepo.save(nuevoUsuario);

        const usuarioCompleto = await usuarioRepo.findOne({
            where: { usuario_id: savedUser.usuario_id },
            relations: { rol: { permisos: true } }
        });

        const permisos = (usuarioCompleto?.rol?.permisos ?? []).map((p) => p.permiso_codigo);
        const rolIdFinal = usuarioCompleto?.rol?.rol_id ?? assignedRolId;
        const permisosModulo = await buildPermisosModulo(rolIdFinal);

        const expiresIn = (process.env.JWT_EXPIRES_IN || "8h") as string;
        const token = jwt.sign(
            { sub: savedUser.usuario_id },
            getSecret(),
            { expiresIn } as jwt.SignOptions
        );
        const menu = buildMenuFromModulos(permisosModulo);

        res.status(201).json({
            message: "Usuario registrado exitosamente",
            token,
            usuario: {
                usuario_id:     savedUser.usuario_id,
                usuario_nombre: savedUser.usuario_nombre,
                usuario_email:  savedUser.usuario_email,
                rol_id:         rolIdFinal,
                rol_nombre:     usuarioCompleto?.rol?.rol_nombre ?? "",
                permisos,
                permisosModulo
            },
            menu
        });
    } catch (error: any) {
        console.error("ERROR REGISTRO:", error);
        const code = getOraCode(error);
        if (code === "ORA-00001") {
            res.status(400).json({ message: "El correo electrónico ya está registrado" });
            return;
        }
        if (code === "ORA-02291") {
            res.status(400).json({ message: "El rol especificado no existe" });
            return;
        }
        if (error?.message?.includes("JWT_SECRET")) {
            res.status(500).json({ message: "Error de configuración del servidor" });
            return;
        }
        res.status(500).json({ message: "Error interno del servidor al registrar usuario" });
    }
};

// GET /auth/roles — roles públicos activos para formulario de registro
export const getPublicRoles = async (_req: Request, res: Response): Promise<void> => {
    try {
        const roles = await AppDataSource.getRepository(NovaRol).find({
            where: { rol_activo: 1 },
            select: {
                rol_id: true,
                rol_nombre: true,
                rol_descripcion: true
            },
            order: { rol_id: "ASC" }
        });
        res.json(roles);
    } catch (error) {
        console.error("ERROR OBTENIENDO ROLES PUBLICOS:", error);
        res.status(500).json({ message: "Error obteniendo roles" });
    }
};
