import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../config/data-source";
import { NovaUsuario } from "../entities/novaUsuario";

const usuarioRepo = AppDataSource.getRepository(NovaUsuario);

// Función auxiliar para no exponer contraseñas en las respuestas
const sanitizeUsuario = (usuario: NovaUsuario) => {
    const { usuario_password, ...resto } = usuario;
    return resto;
};

// GET todos los usuarios ACTIVOS
export const getUsuarios = async (req: Request, res: Response) => {
    try {
        const usuarios = await usuarioRepo.find({
            where: { usuario_activo: 1 },
            relations: { rol: true }
        });
        res.json(usuarios.map(sanitizeUsuario));
    } catch (error) {
        console.error("ERROR OBTENIENDO USUARIOS:", error);
        res.status(500).json({ message: "Error obteniendo usuarios" });
    }
};

// GET usuario por ID (solo si está activo)
export const getUsuarioById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const usuario = await usuarioRepo.findOne({
            where: {
                usuario_id: Number(id),
                usuario_activo: 1
            },
            relations: { rol: true }
        });

        if (!usuario) {
            return res.status(404).json({ message: "Usuario no encontrado o inactivo" });
        }

        res.json(sanitizeUsuario(usuario));
    } catch (error) {
        console.error("ERROR BUSCANDO USUARIO:", error);
        res.status(500).json({ message: "Error buscando usuario" });
    }
};

// GET usuario por ID sin filtrar activo
export const getUsuariosById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const usuario = await usuarioRepo.findOne({
            where: {
                usuario_id: Number(id)
            },
            relations: { rol: true }
        });

        if (!usuario) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        res.json(sanitizeUsuario(usuario));
    } catch (error) {
        console.error("ERROR BUSCANDO USUARIO:", error);
        res.status(500).json({ message: "Error buscando usuario" });
    }
};

// POST crear usuario
export const createUsuario = async (req: Request, res: Response) => {
    try {
        const { rol_id, usuario_nombre, usuario_email, usuario_password } = req.body;

        if (!rol_id || !usuario_nombre || !usuario_email || !usuario_password) {
            return res.status(400).json({
                message: "Campos obligatorios: rol_id, usuario_nombre, usuario_email, usuario_password"
            });
        }

        // Hasheo de contraseña con bcrypt (costo 10)
        const hashedPassword = await bcrypt.hash(usuario_password, 10);

        const usuario = usuarioRepo.create({
            rol_id: Number(rol_id),
            usuario_nombre,
            usuario_email,
            usuario_password: hashedPassword,
            usuario_activo: 1
        });

        const result = await usuarioRepo.save(usuario);

        res.status(201).json(sanitizeUsuario(result));
    } catch (error: any) {
        console.error("ERROR REAL CREANDO USUARIO:", error);
        if (error.code === "ORA-00001") {
            return res.status(400).json({ message: "El correo electrónico ya está registrado" });
        }
        if (error.code === "ORA-02291") {
            return res.status(400).json({ message: "El rol especificado (rol_id) no existe" });
        }
        res.status(500).json({ message: "Error creando usuario" });
    }
};

// PUT actualizar usuario
export const updateUsuario = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const usuario = await usuarioRepo.findOneBy({
            usuario_id: Number(id),
            usuario_activo: 1
        });

        if (!usuario) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        const dataToUpdate = { ...req.body };

        // Si se envió una nueva contraseña, la hasheamos
        if (dataToUpdate.usuario_password) {
            dataToUpdate.usuario_password = await bcrypt.hash(dataToUpdate.usuario_password, 10);
        }

        usuarioRepo.merge(usuario, dataToUpdate);
        const result = await usuarioRepo.save(usuario);

        res.json(sanitizeUsuario(result));
    } catch (error: any) {
        console.error("ERROR ACTUALIZANDO USUARIO:", error);
        if (error.code === "ORA-00001") {
            return res.status(400).json({ message: "El correo electrónico ya está registrado" });
        }
        if (error.code === "ORA-02291") {
            return res.status(400).json({ message: "El rol especificado (rol_id) no existe" });
        }
        res.status(500).json({ message: "Error actualizando usuario" });
    }
};

// DELETE eliminar usuario (BORRADO LÓGICO)
export const deleteUsuario = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const usuario = await usuarioRepo.findOneBy({ usuario_id: Number(id) });

        if (!usuario) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        usuario.usuario_activo = 0;
        await usuarioRepo.save(usuario);

        res.json({ ok: true, message: "Usuario desactivado correctamente" });
    } catch (error) {
        console.error("ERROR DESACTIVANDO USUARIO:", error);
        res.status(500).json({ message: "Error eliminando usuario" });
    }
};
