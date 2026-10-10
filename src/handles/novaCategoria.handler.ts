import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { NovaCategoria } from "../entities/novaCategoria";
import { trimOrNull } from "../utils/validation";

const repo = () => AppDataSource.getRepository(NovaCategoria);

// GET / — todas las categorías ordenadas por nombre
export const getCategorias = async (req: Request, res: Response): Promise<void> => {
    try {
        const cats = await repo().find({ order: { categoria_nombre: "ASC" } });
        res.json(cats);
    } catch (error) {
        res.status(500).json({ message: "Error obteniendo categorías" });
    }
};

// POST / — crear categoría
export const createCategoria = async (req: Request, res: Response): Promise<void> => {
    try {
        const nombre = trimOrNull(req.body.categoria_nombre);
        if (!nombre) { res.status(400).json({ message: "categoria_nombre es obligatorio" }); return; }
        if (nombre.length > 80) { res.status(400).json({ message: "categoria_nombre máximo 80 caracteres" }); return; }

        const descripcion = trimOrNull(req.body.categoria_descripcion);
        if (descripcion && descripcion.length > 200) {
            res.status(400).json({ message: "categoria_descripcion máximo 200 caracteres" }); return;
        }

        const cat = repo().create({ categoria_nombre: nombre, categoria_descripcion: descripcion });
        const result = await repo().save(cat);
        res.status(201).json(result);
    } catch (error: any) {
        console.error("ERROR CREANDO CATEGORÍA:", error);
        res.status(500).json({ message: "Error creando categoría" });
    }
};
