import { Request, Response } from "express";
import { In } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { NovaPermiso } from "../entities/novaPermiso";
import { NovaRol } from "../entities/novaRol";
import { parseIntId } from "../utils/validation";

const permisoRepo = () => AppDataSource.getRepository(NovaPermiso);
const rolRepo = () => AppDataSource.getRepository(NovaRol);

// GET /nova-permiso — catálogo completo
export const getPermisos = async (req: Request, res: Response): Promise<void> => {
    try {
        const permisos = await permisoRepo().find({ order: { permiso_codigo: "ASC" } });
        res.json(permisos);
    } catch (error) {
        console.error("ERROR OBTENIENDO PERMISOS:", error);
        res.status(500).json({ message: "Error obteniendo permisos" });
    }
};

// GET /nova-permiso/rol/:id — permisos del rol
export const getPermisosByRol = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID de rol inválido" }); return; }

        const rol = await rolRepo().findOne({
            where: { rol_id: id },
            relations: { permisos: true }
        });
        if (!rol) { res.status(404).json({ message: "Rol no encontrado" }); return; }

        res.json(rol.permisos ?? []);
    } catch (error) {
        console.error("ERROR OBTENIENDO PERMISOS DEL ROL:", error);
        res.status(500).json({ message: "Error obteniendo permisos del rol" });
    }
};

// PUT /nova-permiso/rol/:id — reemplaza permisos del rol
export const setPermisosRol = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID de rol inválido" }); return; }

        const { permiso_ids } = req.body;
        if (!Array.isArray(permiso_ids)) {
            res.status(400).json({ message: "permiso_ids debe ser un arreglo de números" });
            return;
        }

        const ids: number[] = permiso_ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);

        // Validar que todos los permisos existan
        const permisos = await permisoRepo().findBy({ permiso_id: In(ids) });
        if (permisos.length !== ids.length) {
            res.status(400).json({ message: "Uno o más permisos no existen" });
            return;
        }

        const rol = await rolRepo().findOne({
            where: { rol_id: id },
            relations: { permisos: true }
        });
        if (!rol) { res.status(404).json({ message: "Rol no encontrado" }); return; }

        rol.permisos = permisos;
        await rolRepo().save(rol);

        res.json({ ok: true, message: "Permisos del rol actualizados", permisos });
    } catch (error) {
        console.error("ERROR ACTUALIZANDO PERMISOS DEL ROL:", error);
        res.status(500).json({ message: "Error actualizando permisos del rol" });
    }
};
