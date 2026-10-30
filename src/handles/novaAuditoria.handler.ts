import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { NovaAuditoria } from "../entities/novaAuditoria";

export const getAuditorias = async (_req: Request, res: Response): Promise<void> => {
    try {
        const repo = AppDataSource.getRepository(NovaAuditoria);
        const auditorias = await repo.find({
            relations: { usuario: true },
            order: { auditoria_id: "DESC" },
            take: 200
        });
        res.json(auditorias);
    } catch (error) {
        console.error("ERROR OBTENIENDO AUDITORIAS:", error);
        res.status(500).json({ message: "Error al consultar registros de auditoría" });
    }
};
