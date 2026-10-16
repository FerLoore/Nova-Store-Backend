import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";

/**
 * Consulta base que realiza el JOIN entre:
 * NOVA_INVENTARIO (inv)
 * NOVA_VARIANTE (v)
 * NOVA_PRODUCTO (p)
 * NOVA_ALMACEN (a)
 */
function getInventarioBaseQuery() {
    return AppDataSource.createQueryBuilder()
        .select([
            'p.producto_nombre AS "producto_nombre"',
            'p.producto_id AS "producto_id"',
            'v.variante_sku AS "variante_sku"',
            'v.variante_talla AS "variante_talla"',
            'v.variante_color AS "variante_color"',
            'v.variante_stock_minimo AS "variante_stock_minimo"',
            'a.almacen_nombre AS "almacen_nombre"',
            'a.almacen_id AS "almacen_id"',
            'inv.inventario_cantidad AS "inventario_cantidad"',
            'inv.inventario_id AS "inventario_id"'
        ])
        .from("NOVA_INVENTARIO", "inv")
        .innerJoin("NOVA_VARIANTE", "v", "inv.VAR_VARIANTE = v.VAR_VARIANTE")
        .innerJoin("NOVA_PRODUCTO", "p", "v.PRODU_PRODUCTO = p.PRODU_PRODUCTO")
        .innerJoin("NOVA_ALMACEN", "a", "inv.ALM_ALMACEN = a.ALM_ALMACEN");
}

/**
 * GET /nova-inventario o /nova-inventario/general
 * Retorna: Nombre del Producto, SKU, Talla, Color, Almacén y Cantidad actual
 */
export const getInventarioGeneral = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = getInventarioBaseQuery()
            .orderBy('p.producto_nombre', "ASC")
            .addOrderBy('v.variante_sku', "ASC");

        const data = await query.getRawMany();

        // Normalizar los resultados numéricos
        const result = data.map((row) => ({
            producto_nombre:        row.producto_nombre,
            producto_id:            row.producto_id,
            variante_sku:           row.variante_sku,
            variante_talla:         row.variante_talla,
            variante_color:         row.variante_color,
            almacen_nombre:         row.almacen_nombre,
            almacen_id:             row.almacen_id,
            inventario_cantidad:    Number(row.inventario_cantidad ?? 0),
            variante_stock_minimo:  row.variante_stock_minimo != null ? Number(row.variante_stock_minimo) : 0,
            inventario_id:          row.inventario_id
        }));

        res.json(result);
    } catch (error) {
        console.error("ERROR CONSULTANDO INVENTARIO GENERAL:", error);
        res.status(500).json({ message: "Error al obtener el inventario general" });
    }
};

/**
 * GET /nova-inventario/alertas
 * Retorna SOLO las filas donde INV_CANTIDAD sea menor o igual a VAR_STOCK_MINIMO
 */
export const getAlertasInventario = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = getInventarioBaseQuery()
            .where("inv.INV_CANTIDAD <= NVL(v.VAR_STOCK_MINIMO, 0)")
            .orderBy("inv.INV_CANTIDAD", "ASC")
            .addOrderBy("p.producto_nombre", "ASC");

        const data = await query.getRawMany();

        const result = data.map((row) => ({
            producto_nombre:        row.producto_nombre,
            producto_id:            row.producto_id,
            variante_sku:           row.variante_sku,
            variante_talla:         row.variante_talla,
            variante_color:         row.variante_color,
            almacen_nombre:         row.almacen_nombre,
            almacen_id:             row.almacen_id,
            inventario_cantidad:    Number(row.inventario_cantidad ?? 0),
            variante_stock_minimo:  row.variante_stock_minimo != null ? Number(row.variante_stock_minimo) : 0,
            inventario_id:          row.inventario_id,
            diferencia:             (row.variante_stock_minimo != null ? Number(row.variante_stock_minimo) : 0) - Number(row.inventario_cantidad ?? 0)
        }));

        res.json(result);
    } catch (error) {
        console.error("ERROR CONSULTANDO ALERTAS DE INVENTARIO:", error);
        res.status(500).json({ message: "Error al obtener las alertas de inventario" });
    }
};
