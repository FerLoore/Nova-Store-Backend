import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../config/data-source";
import { NovaUsuario } from "../entities/novaUsuario";
import { parseIntId, isValidEmail, trimOrNull, getOraCode } from "../utils/validation";

const repo = () => AppDataSource.getRepository(NovaUsuario);

const sanitizeUsuario = (u: NovaUsuario) => {
    const { usuario_password, ...resto } = u;
    return resto;
};

// GET / — usuarios activos con relación rol
export const getUsuarios = async (req: Request, res: Response): Promise<void> => {
    try {
        const usuarios = await repo().find({
            where: { usuario_activo: 1 },
            relations: { rol: true }
        });
        res.json(usuarios.map(sanitizeUsuario));
    } catch (error) {
        console.error("ERROR OBTENIENDO USUARIOS:", error);
        res.status(500).json({ message: "Error obteniendo usuarios" });
    }
};

// GET /:id — usuario activo por ID
export const getUsuarioById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID inválido" }); return; }
        const usuario = await repo().findOne({
            where: { usuario_id: id, usuario_activo: 1 },
            relations: { rol: true }
        });
        if (!usuario) { res.status(404).json({ message: "Usuario no encontrado o inactivo" }); return; }
        res.json(sanitizeUsuario(usuario));
    } catch (error) {
        res.status(500).json({ message: "Error buscando usuario" });
    }
};

// GET /id/:id — sin filtro activo
export const getUsuariosById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID inválido" }); return; }
        const usuario = await repo().findOne({
            where: { usuario_id: id },
            relations: { rol: true }
        });
        if (!usuario) { res.status(404).json({ message: "Usuario no encontrado" }); return; }
        res.json(sanitizeUsuario(usuario));
    } catch (error) {
        res.status(500).json({ message: "Error buscando usuario" });
    }
};

// POST / — crear usuario con lista blanca y validaciones
export const createUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        // Lista blanca
        const { rol_id, usuario_nombre, usuario_email, usuario_password } = req.body;
        const errors: string[] = [];

        if (!rol_id || !Number.isInteger(Number(rol_id)) || Number(rol_id) < 1)
            errors.push("rol_id es obligatorio y debe ser un entero positivo");

        const nombre = trimOrNull(usuario_nombre);
        if (!nombre) errors.push("usuario_nombre es obligatorio");
        if (nombre && nombre.length > 100) errors.push("usuario_nombre máximo 100 caracteres");

        const email = trimOrNull(usuario_email);
        if (!email || !isValidEmail(email)) errors.push("usuario_email debe ser un correo válido (máx. 120)");

        const password = trimOrNull(usuario_password);
        if (!password) errors.push("usuario_password es obligatorio");
        if (password && (password.length < 8 || password.length > 72))
            errors.push("usuario_password debe tener entre 8 y 72 caracteres");

        if (errors.length) { res.status(400).json({ message: errors.join("; ") }); return; }

        const hashedPassword = await bcrypt.hash(password!, 10);
        const usuario = repo().create({
            rol_id:           Number(rol_id),
            usuario_nombre:   nombre!,
            usuario_email:    email!,
            usuario_password: hashedPassword,
            usuario_activo:   1
        });
        const result = await repo().save(usuario);
        res.status(201).json(sanitizeUsuario(result));
    } catch (error: any) {
        console.error("ERROR CREANDO USUARIO:", error);
        const code = getOraCode(error);
        if (code === "ORA-00001") { res.status(400).json({ message: "El correo electrónico ya está registrado" }); return; }
        if (code === "ORA-02291") { res.status(400).json({ message: "El rol especificado no existe" }); return; }
        res.status(500).json({ message: "Error creando usuario" });
    }
};

// PUT /:id — actualizar usuario (parcial)
export const updateUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID inválido" }); return; }

        const usuario = await repo().findOneBy({ usuario_id: id, usuario_activo: 1 });
        if (!usuario) { res.status(404).json({ message: "Usuario no encontrado" }); return; }

        const { rol_id, usuario_nombre, usuario_email, usuario_password } = req.body;
        const errors: string[] = [];

        if (rol_id !== undefined) {
            if (!Number.isInteger(Number(rol_id)) || Number(rol_id) < 1)
                errors.push("rol_id debe ser un entero positivo");
            else usuario.rol_id = Number(rol_id);
        }
        if (usuario_nombre !== undefined) {
            const n = trimOrNull(usuario_nombre);
            if (!n) errors.push("usuario_nombre no puede quedar vacío");
            else if (n.length > 100) errors.push("usuario_nombre máximo 100 caracteres");
            else usuario.usuario_nombre = n;
        }
        if (usuario_email !== undefined) {
            const e = trimOrNull(usuario_email);
            if (!e || !isValidEmail(e)) errors.push("usuario_email debe ser un correo válido");
            else usuario.usuario_email = e;
        }
        if (usuario_password !== undefined) {
            const p = trimOrNull(usuario_password);
            if (!p || p.length < 8 || p.length > 72) errors.push("usuario_password entre 8 y 72 caracteres");
            else usuario.usuario_password = await bcrypt.hash(p, 10);
        }

        if (errors.length) { res.status(400).json({ message: errors.join("; ") }); return; }

        const result = await repo().save(usuario);
        res.json(sanitizeUsuario(result));
    } catch (error: any) {
        console.error("ERROR ACTUALIZANDO USUARIO:", error);
        const code = getOraCode(error);
        if (code === "ORA-00001") { res.status(400).json({ message: "El correo electrónico ya está registrado" }); return; }
        if (code === "ORA-02291") { res.status(400).json({ message: "El rol especificado no existe" }); return; }
        res.status(500).json({ message: "Error actualizando usuario" });
    }
};

// DELETE /:id — borrado lógico; no puede desactivarse a sí mismo
export const deleteUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID inválido" }); return; }

        if (req.user?.usuario_id === id) {
            res.status(400).json({ message: "No puedes desactivar tu propio usuario" });
            return;
        }

        const usuario = await repo().findOneBy({ usuario_id: id });
        if (!usuario) { res.status(404).json({ message: "Usuario no encontrado" }); return; }

        usuario.usuario_activo = 0;
        await repo().save(usuario);
        res.json({ ok: true, message: "Usuario desactivado correctamente" });
    } catch (error) {
        console.error("ERROR DESACTIVANDO USUARIO:", error);
        res.status(500).json({ message: "Error eliminando usuario" });
    }
};
