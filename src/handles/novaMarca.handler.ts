import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { NovaMarca } from "../entities/novaMarca";

const marcaRepo = AppDataSource.getRepository(NovaMarca);

// GET todas las marcas ACTIVAS
export const getMarcas = async (req: Request, res: Response) => {
    try {
        const marcas = await marcaRepo.find({
            where: { marca_activo: 1 }
        });
        res.json(marcas);
    } catch (error) {
        res.status(500).json({ message: "Error obteniendo marcas" });
    }
};

// GET marca por ID (solo si está activa)
export const getMarcaById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const marca = await marcaRepo.findOneBy({
            marca_id: Number(id),
            marca_activo: 1
        });

        if (!marca) {
            return res.status(404).json({ message: "Marca no encontrada o inactiva" });
        }

        res.json(marca);
    } catch (error) {
        res.status(500).json({ message: "Error buscando marca" });
    }
};

// POST crear marca
export const createMarca = async (req: Request, res: Response) => {
    try {
        const marcaData = { ...req.body, marca_activo: 1 };
        const marca = marcaRepo.create(marcaData);
        const result = await marcaRepo.save(marca);

        res.status(201).json(result);
    } catch (error) {
        console.error("ERROR REAL CREANDO MARCA:", error);
        res.status(500).json({ message: "Error creando marca" });
    }
};

// PUT actualizar marca
export const updateMarca = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const marca = await marcaRepo.findOneBy({
            marca_id: Number(id),
            marca_activo: 1
        });

        if (!marca) {
            return res.status(404).json({ message: "Marca no encontrada" });
        }

        marcaRepo.merge(marca, req.body);
        const result = await marcaRepo.save(marca);

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Error actualizando marca" });
    }
};

// DELETE eliminar marca (BORRADO LÓGICO)
export const deleteMarca = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const marcaId = Number(id);

        const marca = await marcaRepo.findOneBy({ marca_id: marcaId });

        if (!marca) {
            return res.status(404).json({ message: "Marca no encontrada" });
        }

        // En lugar de delete físico, hacemos update de activo -> 0
        marca.marca_activo = 0;
        await marcaRepo.save(marca);

        res.json({ ok: true, message: "Marca desactivada correctamente" });
    } catch (error) {
        console.error("ERROR DESACTIVANDO MARCA:", error);
        res.status(500).json({ message: "Error eliminando marca" });
    }
};

// GET marcas filtradas por ID específico
export const getMarcasById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const marca = await marcaRepo.findOneBy({
            marca_id: Number(id)
        });

        if (!marca) {
            return res.status(404).json({ message: "Marca no encontrada" });
        }

        res.json(marca);
    } catch (error) {
        res.status(500).json({ message: "Error buscando marca" });
    }
};