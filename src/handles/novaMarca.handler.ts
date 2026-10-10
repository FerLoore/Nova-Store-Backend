import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { NovaMarca } from "../entities/novaMarca";
import { parseIntId, trimOrNull, getOraCode } from "../utils/validation";

const repo = () => AppDataSource.getRepository(NovaMarca);

// GET / — marcas activas
export const getMarcas = async (req: Request, res: Response): Promise<void> => {
    try {
        const marcas = await repo().find({ where: { marca_activo: 1 }, order: { marca_nombre: "ASC" } });
        res.json(marcas);
    } catch (error) {
        res.status(500).json({ message: "Error obteniendo marcas" });
    }
};

// GET /:id — marca activa por ID
export const getMarcaById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID inválido" }); return; }
        const marca = await repo().findOneBy({ marca_id: id, marca_activo: 1 });
        if (!marca) { res.status(404).json({ message: "Marca no encontrada o inactiva" }); return; }
        res.json(marca);
    } catch (error) {
        res.status(500).json({ message: "Error buscando marca" });
    }
};

// GET /id/:id — sin filtro activo
export const getMarcasById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID inválido" }); return; }
        const marca = await repo().findOneBy({ marca_id: id });
        if (!marca) { res.status(404).json({ message: "Marca no encontrada" }); return; }
        res.json(marca);
    } catch (error) {
        res.status(500).json({ message: "Error buscando marca" });
    }
};

// POST / — crear marca (sin enviar ID; lo genera el trigger de Oracle)
export const createMarca = async (req: Request, res: Response): Promise<void> => {
    try {
        const nombre = trimOrNull(req.body.marca_nombre);
        if (!nombre) { res.status(400).json({ message: "marca_nombre es obligatorio" }); return; }
        if (nombre.length > 80) { res.status(400).json({ message: "marca_nombre máximo 80 caracteres" }); return; }

        const marca = repo().create({
            marca_nombre:      nombre,
            marca_descripcion: trimOrNull(req.body.marca_descripcion),
            marca_activo:      1
        });
        const result = await repo().save(marca);
        res.status(201).json(result);
    } catch (error: any) {
        console.error("ERROR CREANDO MARCA:", error);
        if (getOraCode(error) === "ORA-00001") { res.status(400).json({ message: "Ya existe una marca con ese nombre" }); return; }
        res.status(500).json({ message: "Error creando marca" });
    }
};

// PUT /:id — actualizar marca (lista blanca)
export const updateMarca = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID inválido" }); return; }

        const marca = await repo().findOneBy({ marca_id: id, marca_activo: 1 });
        if (!marca) { res.status(404).json({ message: "Marca no encontrada" }); return; }

        const { marca_nombre, marca_descripcion } = req.body;
        if (marca_nombre !== undefined) {
            const n = trimOrNull(marca_nombre);
            if (!n) { res.status(400).json({ message: "marca_nombre no puede quedar vacío" }); return; }
            if (n.length > 80) { res.status(400).json({ message: "marca_nombre máximo 80 caracteres" }); return; }
            marca.marca_nombre = n;
        }
        if (marca_descripcion !== undefined) marca.marca_descripcion = trimOrNull(marca_descripcion);

        const result = await repo().save(marca);
        res.json(result);
    } catch (error: any) {
        console.error("ERROR ACTUALIZANDO MARCA:", error);
        res.status(500).json({ message: "Error actualizando marca" });
    }
};

// DELETE /:id — borrado lógico
export const deleteMarca = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID inválido" }); return; }
        const marca = await repo().findOneBy({ marca_id: id });
        if (!marca) { res.status(404).json({ message: "Marca no encontrada" }); return; }
        marca.marca_activo = 0;
        await repo().save(marca);
        res.json({ ok: true, message: "Marca desactivada correctamente" });
    } catch (error) {
        console.error("ERROR DESACTIVANDO MARCA:", error);
        res.status(500).json({ message: "Error eliminando marca" });
    }
};