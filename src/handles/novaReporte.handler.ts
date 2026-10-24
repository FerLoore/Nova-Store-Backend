import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";

/**
 * GET /reportes/ventas
 * Suma VENT_TOTAL agrupado por día/fecha
 */
export const getReporteVentas = async (_req: Request, res: Response): Promise<void> => {
    try {
        const rows = await AppDataSource.query(`
            SELECT 
                TO_CHAR(VENT_FECHA, 'YYYY-MM-DD') AS "fecha",
                COUNT(VENT_VENTA) AS "cantidad_ventas",
                SUM(VENT_TOTAL) AS "total_ventas"
            FROM NOVA_VENTA
            WHERE VENT_ESTADO = 'COMPLETADA'
            GROUP BY TO_CHAR(VENT_FECHA, 'YYYY-MM-DD')
            ORDER BY "fecha" ASC
        `);

        const formatted = rows.map((r: any) => ({
            fecha: r.fecha,
            cantidad_ventas: Number(r.cantidad_ventas || 0),
            total_ventas: Number(r.total_ventas || 0)
        }));

        res.json(formatted);
    } catch (error) {
        console.error("ERROR GENERANDO REPORTE DE VENTAS:", error);
        res.status(500).json({ message: "Error al generar reporte de ventas" });
    }
};

/**
 * GET /reportes/top-productos
 * Top 10 sumando DETVEN_CANTIDAD con JOIN a NOVA_VARIANTE y NOVA_PRODUCTO
 */
export const getReporteTopProductos = async (_req: Request, res: Response): Promise<void> => {
    try {
        const rows = await AppDataSource.query(`
            SELECT * FROM (
                SELECT 
                    p.PRODU_PRODUCTO AS "producto_id",
                    p.PRODU_NOMBRE AS "producto_nombre",
                    SUM(dv.DETVEN_CANTIDAD) AS "total_cantidad",
                    SUM(dv.DETVEN_SUBTOTAL) AS "total_recaudado"
                FROM NOVA_DETALLE_VENTA dv
                JOIN NOVA_VARIANTE v ON dv.VAR_VARIANTE = v.VAR_VARIANTE
                JOIN NOVA_PRODUCTO p ON v.PRODU_PRODUCTO = p.PRODU_PRODUCTO
                JOIN NOVA_VENTA vent ON dv.VENT_VENTA = vent.VENT_VENTA
                WHERE vent.VENT_ESTADO = 'COMPLETADA'
                GROUP BY p.PRODU_PRODUCTO, p.PRODU_NOMBRE
                ORDER BY SUM(dv.DETVEN_CANTIDAD) DESC
            )
            WHERE ROWNUM <= 10
        `);

        const formatted = rows.map((r: any) => ({
            producto_id: Number(r.producto_id),
            producto_nombre: r.producto_nombre,
            total_cantidad: Number(r.total_cantidad || 0),
            total_recaudado: Number(r.total_recaudado || 0)
        }));

        res.json(formatted);
    } catch (error) {
        console.error("ERROR GENERANDO REPORTE TOP PRODUCTOS:", error);
        res.status(500).json({ message: "Error al generar reporte de productos más vendidos" });
    }
};
