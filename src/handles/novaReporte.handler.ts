import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { parseIntId } from "../utils/validation";

/**
 * GET /reportes/ventas
 * Suma VENT_TOTAL agrupado por día/fecha con filtro opcional de fechas.
 * Query params: ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 */
export const getReporteVentas = async (req: Request, res: Response): Promise<void> => {
    try {
        const { desde, hasta } = req.query;

        let query = `
            SELECT 
                TO_CHAR(VENT_FECHA, 'YYYY-MM-DD') AS "fecha",
                COUNT(VENT_VENTA) AS "cantidad_ventas",
                SUM(VENT_TOTAL) AS "total_ventas"
            FROM NOVA_VENTA
            WHERE VENT_ESTADO = 'COMPLETADA'
        `;
        const params: any[] = [];

        if (desde && hasta) {
            query += ` AND VENT_FECHA BETWEEN TO_DATE(:desde, 'YYYY-MM-DD') AND TO_DATE(:hasta, 'YYYY-MM-DD') + 1`;
            params.push(desde, hasta);
        } else if (desde) {
            query += ` AND VENT_FECHA >= TO_DATE(:desde, 'YYYY-MM-DD')`;
            params.push(desde);
        } else if (hasta) {
            query += ` AND VENT_FECHA < TO_DATE(:hasta, 'YYYY-MM-DD') + 1`;
            params.push(hasta);
        }

        query += `
            GROUP BY TO_CHAR(VENT_FECHA, 'YYYY-MM-DD')
            ORDER BY "fecha" ASC
        `;

        const rows = await AppDataSource.query(query, params);

        const formatted = rows.map((r: any) => ({
            fecha: r.fecha,
            cantidad_ventas: Number(r.cantidad_ventas || 0),
            total_ventas: Number(r.total_ventas || 0)
        }));

        res.json({ ok: true, data: formatted });
    } catch (error) {
        console.error("ERROR GENERANDO REPORTE DE VENTAS:", error);
        res.status(500).json({ message: "Error al generar reporte de ventas" });
    }
};

/**
 * GET /reportes/top-productos
 * Top N productos más vendidos por cantidad y monto recaudado.
 * Query params: ?limit=10
 */
export const getReporteTopProductos = async (req: Request, res: Response): Promise<void> => {
    try {
        const limit = Math.min(50, Math.max(1, parseIntId(req.query.limit as string) || 10));

        const rows = await AppDataSource.query(`
            SELECT * FROM (
                SELECT 
                    p.PRODU_PRODUCTO AS "producto_id",
                    p.PRODU_NOMBRE AS "producto_nombre",
                    c.CATE_NOMBRE AS "categoria_nombre",
                    m.MAR_NOMBRE AS "marca_nombre",
                    SUM(dv.DETVEN_CANTIDAD) AS "total_cantidad",
                    SUM(dv.DETVEN_SUBTOTAL) AS "total_recaudado"
                FROM NOVA_DETALLE_VENTA dv
                JOIN NOVA_VARIANTE v ON dv.VAR_VARIANTE = v.VAR_VARIANTE
                JOIN NOVA_PRODUCTO p ON v.PRODU_PRODUCTO = p.PRODU_PRODUCTO
                LEFT JOIN NOVA_CATEGORIA c ON p.CATE_CATEGORIA = c.CATE_CATEGORIA
                LEFT JOIN NOVA_MARCA m ON p.MAR_MARCA = m.MAR_MARCA
                JOIN NOVA_VENTA vent ON dv.VENT_VENTA = vent.VENT_VENTA
                WHERE vent.VENT_ESTADO = 'COMPLETADA'
                GROUP BY p.PRODU_PRODUCTO, p.PRODU_NOMBRE, c.CATE_NOMBRE, m.MAR_NOMBRE
                ORDER BY SUM(dv.DETVEN_CANTIDAD) DESC
            )
            WHERE ROWNUM <= ${limit}
        `);

        const formatted = rows.map((r: any) => ({
            producto_id: Number(r.producto_id),
            producto_nombre: r.producto_nombre,
            categoria_nombre: r.categoria_nombre ?? "Sin categoría",
            marca_nombre: r.marca_nombre ?? "Sin marca",
            total_cantidad: Number(r.total_cantidad || 0),
            total_recaudado: Number(r.total_recaudado || 0)
        }));

        res.json({ ok: true, total: formatted.length, data: formatted });
    } catch (error) {
        console.error("ERROR GENERANDO REPORTE TOP PRODUCTOS:", error);
        res.status(500).json({ message: "Error al generar reporte de productos más vendidos" });
    }
};

/**
 * GET /reportes/inventario-bajo
 * Variantes cuyo stock actual es menor o igual al umbral especificado o a su stock mínimo.
 * Query params: ?umbral=5
 */
export const getReporteStockBajo = async (req: Request, res: Response): Promise<void> => {
    try {
        const umbral = parseIntId(req.query.umbral as string) ?? 5;

        const rows = await AppDataSource.query(`
            SELECT 
                v.VAR_VARIANTE AS "variante_id",
                v.VAR_SKU AS "sku",
                v.VAR_COLOR AS "color",
                v.VAR_TALLA AS "talla",
                NVL(v.VAR_STOCK_MINIMO, :umbralDefault) AS "stock_minimo",
                v.VAR_PRECIO_VENTA AS "precio_venta",
                p.PRODU_NOMBRE AS "producto_nombre",
                c.CATE_NOMBRE AS "categoria",
                NVL(SUM(i.INV_CANTIDAD), 0) AS "stock_actual"
            FROM NOVA_VARIANTE v
            JOIN NOVA_PRODUCTO p ON v.PRODU_PRODUCTO = p.PRODU_PRODUCTO
            LEFT JOIN NOVA_CATEGORIA c ON p.CATE_CATEGORIA = c.CATE_CATEGORIA
            LEFT JOIN NOVA_INVENTARIO i ON v.VAR_VARIANTE = i.VAR_VARIANTE
            WHERE v.VAR_ACTIVO = 1
            GROUP BY 
                v.VAR_VARIANTE, v.VAR_SKU, v.VAR_COLOR, v.VAR_TALLA, 
                v.VAR_STOCK_MINIMO, v.VAR_PRECIO_VENTA, p.PRODU_NOMBRE, c.CATE_NOMBRE
            HAVING NVL(SUM(i.INV_CANTIDAD), 0) <= NVL(v.VAR_STOCK_MINIMO, :umbralFiltro)
            ORDER BY "stock_actual" ASC
        `, [umbral, umbral]);

        const formatted = rows.map((r: any) => ({
            variante_id: Number(r.variante_id),
            sku: r.sku,
            producto_nombre: r.producto_nombre,
            color: r.color,
            talla: r.talla,
            categoria: r.categoria ?? "General",
            stock_minimo: Number(r.stock_minimo),
            stock_actual: Number(r.stock_actual),
            precio_venta: Number(r.precio_venta),
            estado_stock: Number(r.stock_actual) === 0 ? "AGOTADO" : "CRITICO"
        }));

        res.json({ ok: true, total: formatted.length, umbral, data: formatted });
    } catch (error) {
        console.error("ERROR GENERANDO REPORTE DE STOCK BAJO:", error);
        res.status(500).json({ message: "Error al generar reporte de inventario bajo" });
    }
};

/**
 * GET /reportes/pedidos
 * Resumen de pedidos agrupados por estado con montos y total de descuentos aplicados.
 */
export const getReportePedidos = async (_req: Request, res: Response): Promise<void> => {
    try {
        const rows = await AppDataSource.query(`
            SELECT 
                PED_ESTADO AS "estado",
                COUNT(PED_PEDIDO) AS "cantidad",
                NVL(SUM(PED_TOTAL), 0) AS "total_pedidos",
                0 AS "total_descuentos",
                ROUND(NVL(AVG(PED_TOTAL), 0), 2) AS "ticket_promedio"
            FROM NOVA_PEDIDO
            GROUP BY PED_ESTADO
            ORDER BY "cantidad" DESC
        `);

        const formatted = rows.map((r: any) => ({
            estado: r.estado,
            cantidad: Number(r.cantidad),
            total_pedidos: Number(r.total_pedidos),
            total_descuentos: Number(r.total_descuentos),
            ticket_promedio: Number(r.ticket_promedio)
        }));

        res.json({ ok: true, data: formatted });
    } catch (error) {
        console.error("ERROR GENERANDO REPORTE DE PEDIDOS:", error);
        res.status(500).json({ message: "Error al generar reporte de pedidos" });
    }
};

/**
 * GET /reportes/compras
 * Resumen de compras agrupadas por proveedor y por estado.
 */
export const getReporteCompras = async (_req: Request, res: Response): Promise<void> => {
    try {
        const porEstado = await AppDataSource.query(`
            SELECT 
                COMP_ESTADO AS "estado",
                COUNT(COMP_COMPRA) AS "cantidad",
                NVL(SUM(COMP_TOTAL), 0) AS "total"
            FROM NOVA_COMPRA
            GROUP BY COMP_ESTADO
            ORDER BY "cantidad" DESC
        `);

        const porProveedor = await AppDataSource.query(`
            SELECT 
                p.PROV_NOMBRE AS "proveedor",
                COUNT(c.COMP_COMPRA) AS "cantidad_compras",
                NVL(SUM(c.COMP_TOTAL), 0) AS "total_comprado"
            FROM NOVA_COMPRA c
            JOIN NOVA_PROVEEDOR p ON c.PROV_PROVEEDOR = p.PROV_PROVEEDOR
            GROUP BY p.PROV_NOMBRE
            ORDER BY "total_comprado" DESC
        `);

        res.json({
            ok: true,
            por_estado: porEstado.map((r: any) => ({ estado: r.estado, cantidad: Number(r.cantidad), total: Number(r.total) })),
            por_proveedor: porProveedor.map((r: any) => ({ proveedor: r.proveedor, cantidad: Number(r.cantidad_compras), total: Number(r.total_comprado) }))
        });
    } catch (error) {
        console.error("ERROR GENERANDO REPORTE DE COMPRAS:", error);
        res.status(500).json({ message: "Error al generar reporte de compras" });
    }
};

/**
 * GET /reportes/metodos-pago
 * Distribución de cobros realizados por método de pago.
 */
export const getReporteMetodosPago = async (_req: Request, res: Response): Promise<void> => {
    try {
        const rows = await AppDataSource.query(`
            SELECT 
                PAG_METODO AS "metodo",
                COUNT(PAG_PAGO) AS "cantidad_transacciones",
                NVL(SUM(PAG_MONTO), 0) AS "total_recaudado"
            FROM NOVA_PAGO
            GROUP BY PAG_METODO
            ORDER BY "total_recaudado" DESC
        `);

        const formatted = rows.map((r: any) => ({
            metodo: r.metodo,
            cantidad_transacciones: Number(r.cantidad_transacciones),
            total_recaudado: Number(r.total_recaudado)
        }));

        res.json({ ok: true, data: formatted });
    } catch (error) {
        console.error("ERROR GENERANDO REPORTE DE METODOS DE PAGO:", error);
        res.status(500).json({ message: "Error al generar reporte de métodos de pago" });
    }
};

/**
 * GET /reportes/kpis
 * Métricas clave del negocio para el dashboard principal:
 * - Ventas totales y cantidad
 * - Pedidos pendientes de aprobación
 * - Total de productos en inventario y valorizado estimado
 * - Compras realizadas
 */
export const getKpisDashboard = async (_req: Request, res: Response): Promise<void> => {
    try {
        const [ventas] = await AppDataSource.query(`
            SELECT 
                COUNT(*) AS "cantidad",
                NVL(SUM(VENT_TOTAL), 0) AS "total"
            FROM NOVA_VENTA 
            WHERE VENT_ESTADO = 'COMPLETADA'
        `);

        const [pedidosPendientes] = await AppDataSource.query(`
            SELECT 
                COUNT(*) AS "cantidad",
                NVL(SUM(PED_TOTAL), 0) AS "total"
            FROM NOVA_PEDIDO 
            WHERE PED_ESTADO = 'ESPERANDO_APROBACION'
        `);

        const [inventario] = await AppDataSource.query(`
            SELECT 
                COUNT(DISTINCT VAR_VARIANTE) AS "variantes_con_stock",
                NVL(SUM(INV_CANTIDAD), 0) AS "unidades_totales"
            FROM NOVA_INVENTARIO
        `);

        const [compras] = await AppDataSource.query(`
            SELECT 
                COUNT(*) AS "cantidad",
                NVL(SUM(COMP_TOTAL), 0) AS "total"
            FROM NOVA_COMPRA
            WHERE COMP_ESTADO = 'RECIBIDA'
        `);

        res.json({
            ok: true,
            ventas: {
                total_monto: Number(ventas?.total || 0),
                cantidad: Number(ventas?.cantidad || 0)
            },
            pedidos_pendientes_aprobacion: {
                total_monto: Number(pedidosPendientes?.total || 0),
                cantidad: Number(pedidosPendientes?.cantidad || 0)
            },
            inventario: {
                variantes_con_stock: Number(inventario?.variantes_con_stock || 0),
                unidades_totales: Number(inventario?.unidades_totales || 0)
            },
            compras_recibidas: {
                total_monto: Number(compras?.total || 0),
                cantidad: Number(compras?.cantidad || 0)
            }
        });
    } catch (error) {
        console.error("ERROR GENERANDO KPIS:", error);
        res.status(500).json({ message: "Error al generar KPIs del dashboard" });
    }
};
