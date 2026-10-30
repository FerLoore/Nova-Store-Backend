import { Request, Response } from "express";
import { Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { NovaAuditoria } from "../entities/novaAuditoria";
import { parseIntId } from "../utils/validation";

/**
 * GET /auditoria
 * Permite filtrar por tabla, acción, usuario y rango de fechas.
 * Soporta paginación con `page` y `limit`.
 */
export const getAuditorias = async (req: Request, res: Response): Promise<void> => {
    try {
        const repo = AppDataSource.getRepository(NovaAuditoria);

        const page = Math.max(1, parseIntId(req.query.page as string) || 1);
        const limit = Math.min(200, Math.max(1, parseIntId(req.query.limit as string) || 50));
        const skip = (page - 1) * limit;

        const where: FindOptionsWhere<NovaAuditoria> = {};

        // Filtro por tabla
        if (req.query.tabla) {
            where.auditoria_tabla = String(req.query.tabla).trim().toUpperCase();
        }

        // Filtro por acción
        if (req.query.accion) {
            where.auditoria_accion = String(req.query.accion).trim().toUpperCase();
        }

        // Filtro por usuario
        const usuarioId = parseIntId(req.query.usuario_id as string);
        if (usuarioId) {
            where.usuario_id = usuarioId;
        }

        // Filtro por rango de fechas
        const desdeStr = req.query.desde as string;
        const hastaStr = req.query.hasta as string;
        if (desdeStr && hastaStr) {
            const desde = new Date(`${desdeStr}T00:00:00`);
            const hasta = new Date(`${hastaStr}T23:59:59.999`);
            if (!isNaN(desde.getTime()) && !isNaN(hasta.getTime())) {
                where.auditoria_fecha = Between(desde, hasta);
            }
        } else if (desdeStr) {
            const desde = new Date(`${desdeStr}T00:00:00`);
            if (!isNaN(desde.getTime())) {
                where.auditoria_fecha = MoreThanOrEqual(desde);
            }
        } else if (hastaStr) {
            const hasta = new Date(`${hastaStr}T23:59:59.999`);
            if (!isNaN(hasta.getTime())) {
                where.auditoria_fecha = LessThanOrEqual(hasta);
            }
        }

        const [registros, total] = await repo.findAndCount({
            where,
            relations: { usuario: true },
            order: { auditoria_id: "DESC" },
            skip,
            take: limit
        });

        // Limpiar contraseñas de usuarios en auditoría
        const sanitizados = registros.map((r) => {
            if (r.usuario && r.usuario.usuario_password) {
                const { usuario_password, ...uRest } = r.usuario;
                return { ...r, usuario: uRest };
            }
            return r;
        });

        res.json({
            ok: true,
            total,
            pagina: page,
            limite: limit,
            total_paginas: Math.ceil(total / limit),
            data: sanitizados
        });
    } catch (error) {
        console.error("ERROR OBTENIENDO AUDITORIAS:", error);
        res.status(500).json({ message: "Error al consultar registros de auditoría" });
    }
};

/**
 * GET /auditoria/resumen
 * Métricas globales del log de auditoría para el panel del administrador.
 */
export const getResumenAuditoria = async (_req: Request, res: Response): Promise<void> => {
    try {
        const repo = AppDataSource.getRepository(NovaAuditoria);
        const total = await repo.count();

        // Desglose por acción
        const porAccion = await AppDataSource.query(`
            SELECT 
                AUDI_ACCION AS "accion", 
                COUNT(*) AS "total"
            FROM NOVA_AUDITORIA
            GROUP BY AUDI_ACCION
            ORDER BY "total" DESC
        `);

        // Desglose por tabla
        const porTabla = await AppDataSource.query(`
            SELECT 
                AUDI_TABLA AS "tabla", 
                COUNT(*) AS "total"
            FROM NOVA_AUDITORIA
            GROUP BY AUDI_TABLA
            ORDER BY "total" DESC
        `);

        // Actividad de los últimos 7 días
        const actividadReciente = await AppDataSource.query(`
            SELECT 
                TO_CHAR(AUDI_FECHA, 'YYYY-MM-DD') AS "fecha",
                COUNT(*) AS "total"
            FROM NOVA_AUDITORIA
            WHERE AUDI_FECHA >= SYSDATE - 7
            GROUP BY TO_CHAR(AUDI_FECHA, 'YYYY-MM-DD')
            ORDER BY "fecha" DESC
        `);

        res.json({
            ok: true,
            total_registros: total,
            por_accion: porAccion.map((r: any) => ({ accion: r.accion, total: Number(r.total) })),
            por_tabla: porTabla.map((r: any) => ({ tabla: r.tabla, total: Number(r.total) })),
            actividad_reciente: actividadReciente.map((r: any) => ({ fecha: r.fecha, total: Number(r.total) }))
        });
    } catch (error) {
        console.error("ERROR OBTENIENDO RESUMEN DE AUDITORIA:", error);
        res.status(500).json({ message: "Error al generar el resumen de auditoría" });
    }
};
