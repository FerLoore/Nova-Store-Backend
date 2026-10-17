import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { NovaRol } from "../entities/novaRol";
import { NovaUsuario } from "../entities/novaUsuario";
import { parseIntId, trimOrNull, getOraCode } from "../utils/validation";

const repo = () => AppDataSource.getRepository(NovaRol);

// GET / — roles activos
export const getRoles = async (req: Request, res: Response): Promise<void> => {
    try {
        const roles = await repo().find({ where: { rol_activo: 1 }, order: { rol_nombre: "ASC" } });
        res.json(roles);
    } catch (error) {
        console.error("ERROR OBTENIENDO ROLES:", error);
        res.status(500).json({ message: "Error obteniendo roles" });
    }
};

// GET /:id
export const getRolById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID inválido" }); return; }
        const rol = await repo().findOneBy({ rol_id: id, rol_activo: 1 });
        if (!rol) { res.status(404).json({ message: "Rol no encontrado o inactivo" }); return; }
        res.json(rol);
    } catch (error) {
        res.status(500).json({ message: "Error buscando rol" });
    }
};

// GET /id/:id — sin filtro activo
export const getRolesById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID inválido" }); return; }
        const rol = await repo().findOneBy({ rol_id: id });
        if (!rol) { res.status(404).json({ message: "Rol no encontrado" }); return; }
        res.json(rol);
    } catch (error) {
        res.status(500).json({ message: "Error buscando rol" });
    }
};

// POST / — crear rol (lista blanca)
export const createRol = async (req: Request, res: Response): Promise<void> => {
    try {
        const nombre = trimOrNull(req.body.rol_nombre);
        if (!nombre) { res.status(400).json({ message: "rol_nombre es obligatorio" }); return; }
        if (nombre.length > 50) { res.status(400).json({ message: "rol_nombre máximo 50 caracteres" }); return; }

        const rol = repo().create({
            rol_nombre:      nombre,
            rol_descripcion: trimOrNull(req.body.rol_descripcion),
            rol_permiso:     trimOrNull(req.body.rol_permiso),
            rol_activo:      1
        });
        const result = await repo().save(rol);
        res.status(201).json(result);
    } catch (error: any) {
        console.error("ERROR CREANDO ROL:", error);
        if (getOraCode(error) === "ORA-00001") { res.status(400).json({ message: "Ya existe un rol con ese nombre" }); return; }
        res.status(500).json({ message: "Error creando rol" });
    }
};

// PUT /:id — actualizar rol (lista blanca)
export const updateRol = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID inválido" }); return; }

        const rol = await repo().findOneBy({ rol_id: id, rol_activo: 1 });
        if (!rol) { res.status(404).json({ message: "Rol no encontrado" }); return; }

        const { rol_nombre, rol_descripcion, rol_permiso } = req.body;
        if (rol_nombre !== undefined) {
            const n = trimOrNull(rol_nombre);
            if (!n) { res.status(400).json({ message: "rol_nombre no puede quedar vacío" }); return; }
            if (n.length > 50) { res.status(400).json({ message: "rol_nombre máximo 50 caracteres" }); return; }
            rol.rol_nombre = n;
        }
        if (rol_descripcion !== undefined) rol.rol_descripcion = trimOrNull(rol_descripcion);
        if (rol_permiso     !== undefined) rol.rol_permiso     = trimOrNull(rol_permiso);

        const result = await repo().save(rol);
        res.json(result);
    } catch (error: any) {
        console.error("ERROR ACTUALIZANDO ROL:", error);
        if (getOraCode(error) === "ORA-00001") { res.status(400).json({ message: "Ya existe un rol con ese nombre" }); return; }
        res.status(500).json({ message: "Error actualizando rol" });
    }
};

// DELETE /:id — borrado lógico; bloquea si hay usuarios activos
export const deleteRol = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID inválido" }); return; }

        const rol = await repo().findOneBy({ rol_id: id });
        if (!rol) { res.status(404).json({ message: "Rol no encontrado" }); return; }

        const usuariosActivos = await AppDataSource.getRepository(NovaUsuario).count({
            where: { rol_id: id, usuario_activo: 1 }
        });
        if (usuariosActivos > 0) {
            res.status(400).json({ message: `No se puede desactivar: hay ${usuariosActivos} usuario(s) activo(s) con este rol` });
            return;
        }

        rol.rol_activo = 0;
        await repo().save(rol);
        res.json({ ok: true, message: "Rol desactivado correctamente" });
    } catch (error) {
        console.error("ERROR DESACTIVANDO ROL:", error);
        res.status(500).json({ message: "Error eliminando rol" });
    }
};
