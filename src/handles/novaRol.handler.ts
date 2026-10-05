import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { NovaRol } from "../entities/novaRol";

const rolRepo = AppDataSource.getRepository(NovaRol);

// GET todos los roles ACTIVOS
export const getRoles = async (req: Request, res: Response) => {
    try {
        const roles = await rolRepo.find({
            where: { rol_activo: 1 }
        });
        res.json(roles);
    } catch (error) {
        console.error("ERROR OBTENIENDO ROLES:", error);
        res.status(500).json({ message: "Error obteniendo roles" });
    }
};

// GET rol por ID (solo si está activo)
export const getRolById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const rol = await rolRepo.findOneBy({
            rol_id: Number(id),
            rol_activo: 1
        });

        if (!rol) {
            return res.status(404).json({ message: "Rol no encontrado o inactivo" });
        }

        res.json(rol);
    } catch (error) {
        console.error("ERROR BUSCANDO ROL:", error);
        res.status(500).json({ message: "Error buscando rol" });
    }
};

// GET rol por ID sin filtrar activo
export const getRolesById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const rol = await rolRepo.findOneBy({
            rol_id: Number(id)
        });

        if (!rol) {
            return res.status(404).json({ message: "Rol no encontrado" });
        }

        res.json(rol);
    } catch (error) {
        console.error("ERROR BUSCANDO ROL:", error);
        res.status(500).json({ message: "Error buscando rol" });
    }
};

// POST crear rol
export const createRol = async (req: Request, res: Response) => {
    try {
        const rolData = { ...req.body, rol_activo: 1 };
        const rol = rolRepo.create(rolData);
        const result = await rolRepo.save(rol);

        res.status(201).json(result);
    } catch (error: any) {
        console.error("ERROR REAL CREANDO ROL:", error);
        if (error.code === "ORA-00001") {
            return res.status(400).json({ message: "Ya existe un rol con ese nombre" });
        }
        res.status(500).json({ message: "Error creando rol" });
    }
};

// PUT actualizar rol
export const updateRol = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const rol = await rolRepo.findOneBy({
            rol_id: Number(id),
            rol_activo: 1
        });

        if (!rol) {
            return res.status(404).json({ message: "Rol no encontrado" });
        }

        rolRepo.merge(rol, req.body);
        const result = await rolRepo.save(rol);

        res.json(result);
    } catch (error: any) {
        console.error("ERROR ACTUALIZANDO ROL:", error);
        if (error.code === "ORA-00001") {
            return res.status(400).json({ message: "Ya existe un rol con ese nombre" });
        }
        res.status(500).json({ message: "Error actualizando rol" });
    }
};

// DELETE eliminar rol (BORRADO LÓGICO)
export const deleteRol = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const rol = await rolRepo.findOneBy({ rol_id: Number(id) });

        if (!rol) {
            return res.status(404).json({ message: "Rol no encontrado" });
        }

        rol.rol_activo = 0;
        await rolRepo.save(rol);

        res.json({ ok: true, message: "Rol desactivado correctamente" });
    } catch (error) {
        console.error("ERROR DESACTIVANDO ROL:", error);
        res.status(500).json({ message: "Error eliminando rol" });
    }
};
