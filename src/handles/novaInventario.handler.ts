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
            'p.PRODU_NOMBRE AS "producto_nombre"',
            'p.PRODU_PRODUCTO AS "producto_id"',
            'v.VAR_VARIANTE AS "variante_id"',
            'v.VAR_SKU AS "variante_sku"',
            'v.VAR_TALLA AS "variante_talla"',
            'v.VAR_COLOR AS "variante_color"',
            'NVL(v.VAR_STOCK_MINIMO, 0) AS "variante_stock_minimo"',
            'NVL(a.ALM_NOMBRE, \'Sin Almacén / Sin Stock\') AS "almacen_nombre"',
            'a.ALM_ALMACEN AS "almacen_id"',
            'NVL(inv.INV_CANTIDAD, 0) AS "inventario_cantidad"',
            'inv.INV_INVENTARIO AS "inventario_id"'
        ])
        .from("NOVA_VARIANTE", "v")
        .innerJoin("NOVA_PRODUCTO", "p", "v.PRODU_PRODUCTO = p.PRODU_PRODUCTO")
        .leftJoin("NOVA_INVENTARIO", "inv", "v.VAR_VARIANTE = inv.VAR_VARIANTE")
        .leftJoin("NOVA_ALMACEN", "a", "inv.ALM_ALMACEN = a.ALM_ALMACEN")
        .where("v.VAR_ACTIVO = 1")
        .andWhere("p.PRODU_ACTIVO = 1");
}

/**
 * GET /nova-inventario o /nova-inventario/general
 * Retorna: Nombre del Producto, SKU, Talla, Color, Almacén y Cantidad actual (incluyendo productos nuevos en 0)
 */
export const getInventarioGeneral = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = getInventarioBaseQuery()
            .orderBy('p.PRODU_NOMBRE', "ASC")
            .addOrderBy('v.VAR_SKU', "ASC");

        const data = await query.getRawMany();

        // Normalizar los resultados numéricos
        const result = data.map((row) => ({
            producto_nombre:        row.producto_nombre,
            producto_id:            row.producto_id,
            variante_id:            row.variante_id,
            variante_sku:           row.variante_sku,
            variante_talla:         row.variante_talla,
            variante_color:         row.variante_color,
            almacen_nombre:         row.almacen_nombre,
            almacen_id:             row.almacen_id,
            inventario_cantidad:    Number(row.inventario_cantidad ?? 0),
            variante_stock_minimo:  Number(row.variante_stock_minimo ?? 0),
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
 * Retorna las filas donde INV_CANTIDAD sea menor o igual a VAR_STOCK_MINIMO
 * (incluye automáticamente productos nuevos que tienen stock 0)
 */
export const getAlertasInventario = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = getInventarioBaseQuery()
            .andWhere("NVL(inv.INV_CANTIDAD, 0) <= NVL(v.VAR_STOCK_MINIMO, 0)")
            .orderBy("NVL(inv.INV_CANTIDAD, 0)", "ASC")
            .addOrderBy("p.PRODU_NOMBRE", "ASC");

        const data = await query.getRawMany();

        const result = data.map((row) => ({
            producto_nombre:        row.producto_nombre,
            producto_id:            row.producto_id,
            variante_id:            row.variante_id,
            variante_sku:           row.variante_sku,
            variante_talla:         row.variante_talla,
            variante_color:         row.variante_color,
            almacen_nombre:         row.almacen_nombre,
            almacen_id:             row.almacen_id,
            inventario_cantidad:    Number(row.inventario_cantidad ?? 0),
            variante_stock_minimo:  Number(row.variante_stock_minimo ?? 0),
            inventario_id:          row.inventario_id,
            diferencia:             Number(row.variante_stock_minimo ?? 0) - Number(row.inventario_cantidad ?? 0)
        }));

        res.json(result);
    } catch (error) {
        console.error("ERROR CONSULTANDO ALERTAS DE INVENTARIO:", error);
        res.status(500).json({ message: "Error al obtener las alertas de inventario" });
    }
};
