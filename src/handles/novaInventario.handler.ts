import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { NovaMovimientoInventario } from "../entities/novaMovimientoInventario";
import { NovaInventario } from "../entities/novaInventario";
import { NovaVariante } from "../entities/novaVariante";
import { NovaAlmacen } from "../entities/novaAlmacen";
import { parseIntId, trimOrNull } from "../utils/validation";
import { registrarAuditoria } from "../utils/audit";

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
export const getInventarioGeneral = async (_req: Request, res: Response): Promise<void> => {
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
export const getAlertasInventario = async (_req: Request, res: Response): Promise<void> => {
    try {
        const query = getInventarioBaseQuery()
            .andWhere("NVL(inv.INV_CANTIDAD, 0) <= NVL(v.VAR_STOCK_MINIMO, 0)")
            .orderBy("NVL(inv.INV_CANTIDAD, 0)", "ASC")
            .addOrderBy("p.PRODU_NOMBRE", "ASC");

        const data = await query.getRawMany();

        const result = data.map((row) => {
            const stockActual = Number(row.inventario_cantidad ?? 0);
            const stockMinimo = Number(row.variante_stock_minimo ?? 0);
            const diferencia = stockMinimo - stockActual;

            return {
                producto_nombre:        row.producto_nombre,
                producto_id:            row.producto_id,
                variante_id:            row.variante_id,
                variante_sku:           row.variante_sku,
                variante_talla:         row.variante_talla,
                variante_color:         row.variante_color,
                almacen_nombre:         row.almacen_nombre,
                almacen_id:             row.almacen_id,
                inventario_cantidad:    stockActual,
                variante_stock_minimo:  stockMinimo,
                inventario_id:          row.inventario_id,
                diferencia:             diferencia,
                solicitar_orden_compra: true,
                nivel_alerta:           stockActual === 0 ? "CRITICO_SIN_STOCK" : "STOCK_MINIMO",
                mensaje:                stockActual === 0
                    ? `Stock agotado (0 unidades) para "${row.producto_nombre}" (SKU: ${row.variante_sku}). Solicitar orden de compra urgente.`
                    : `Stock actual (${stockActual}) menor o igual al mínimo (${stockMinimo}) para "${row.producto_nombre}" (SKU: ${row.variante_sku}). Solicitar orden de compra.`
            };
        });

        res.json(result);
    } catch (error) {
        console.error("ERROR CONSULTANDO ALERTAS DE INVENTARIO:", error);
        res.status(500).json({ message: "Error al obtener las alertas de inventario" });
    }
};

/**
 * GET /nova-inventario/kardex
 * Historial detallado de movimientos de inventario (Kárdex físico).
 * Query params: ?variante_id=&sku=&almacen_id=&tipo=&desde=&hasta=&limit=&page=
 */
export const getKardex = async (req: Request, res: Response): Promise<void> => {
    try {
        const varianteId = parseIntId(req.query.variante_id as string ?? req.query.VAR_VARIANTE as string);
        const sku = trimOrNull(req.query.sku as string ?? req.query.VAR_SKU as string);
        const almacenId = parseIntId(req.query.almacen_id as string ?? req.query.ALM_ALMACEN as string);
        const tipo = trimOrNull(req.query.tipo as string)?.toUpperCase();
        const desde = trimOrNull(req.query.desde as string);
        const hasta = trimOrNull(req.query.hasta as string);
        const page = Math.max(1, parseIntId(req.query.page as string) || 1);
        const limit = Math.min(500, Math.max(1, parseIntId(req.query.limit as string) || 100));

        let sql = `
            SELECT 
                m.MOVI_MOVIMIENTO AS "movimiento_id",
                m.MOVI_FECHA AS "movimiento_fecha",
                m.MOVI_TIPO AS "movimiento_tipo",
                m.MOVI_CANTIDAD AS "movimiento_cantidad",
                m.MOVI_TIPO_DOCUMENTO AS "tipo_documento",
                m.MOVI_DOCUMENTO_ID AS "documento_id",
                m.MOVI_OBSERVACION AS "observacion",
                v.VAR_VARIANTE AS "variante_id",
                v.VAR_SKU AS "sku",
                v.VAR_TALLA AS "talla",
                v.VAR_COLOR AS "color",
                v.VAR_PRECIO_VENTA AS "precio_venta",
                v.VAR_PRECIO_COMPRA AS "precio_compra",
                p.PRODU_PRODUCTO AS "producto_id",
                p.PRODU_NOMBRE AS "producto_nombre",
                a.ALM_ALMACEN AS "almacen_id",
                a.ALM_NOMBRE AS "almacen_nombre",
                u.USU_USUARIO AS "usuario_id",
                u.USU_NOMBRE AS "usuario_nombre"
            FROM NOVA_MOVIMIENTO_INVENTARIO m
            JOIN NOVA_VARIANTE v ON m.VAR_VARIANTE = v.VAR_VARIANTE
            JOIN NOVA_PRODUCTO p ON v.PRODU_PRODUCTO = p.PRODU_PRODUCTO
            JOIN NOVA_ALMACEN a ON m.ALM_ALMACEN = a.ALM_ALMACEN
            LEFT JOIN NOVA_USUARIO u ON m.USU_USUARIO = u.USU_USUARIO
            WHERE 1=1
        `;

        const params: any[] = [];

        if (varianteId) {
            sql += ` AND m.VAR_VARIANTE = :vId`;
            params.push(varianteId);
        } else if (sku) {
            sql += ` AND UPPER(v.VAR_SKU) = :sku`;
            params.push(sku.toUpperCase());
        }

        if (almacenId) {
            sql += ` AND m.ALM_ALMACEN = :aId`;
            params.push(almacenId);
        }

        if (tipo && (tipo === "ENTRADA" || tipo === "SALIDA")) {
            sql += ` AND m.MOVI_TIPO = :tipo`;
            params.push(tipo);
        }

        if (desde && hasta) {
            sql += ` AND m.MOVI_FECHA BETWEEN TO_DATE(:desde, 'YYYY-MM-DD') AND TO_DATE(:hasta, 'YYYY-MM-DD') + 1`;
            params.push(desde, hasta);
        } else if (desde) {
            sql += ` AND m.MOVI_FECHA >= TO_DATE(:desde, 'YYYY-MM-DD')`;
            params.push(desde);
        } else if (hasta) {
            sql += ` AND m.MOVI_FECHA < TO_DATE(:hasta, 'YYYY-MM-DD') + 1`;
            params.push(hasta);
        }

        // Orden cronológico ascendente para cálculo correcto del saldo acumulado en kárdex
        sql += ` ORDER BY m.MOVI_FECHA ASC, m.MOVI_MOVIMIENTO ASC`;

        const rows = await AppDataSource.query(sql, params);

        // Si se filtró por una variante específica, calculamos el saldo físico corrido (running balance)
        let saldoAcumulado = 0;
        const enriquecidos = rows.map((r: any) => {
            const cant = Number(r.movimiento_cantidad || 0);
            if (r.movimiento_tipo === "ENTRADA") {
                saldoAcumulado += cant;
            } else {
                saldoAcumulado -= cant;
            }

            return {
                movimiento_id: Number(r.movimiento_id),
                fecha: r.movimiento_fecha,
                tipo: r.movimiento_tipo,
                cantidad: cant,
                saldo_acumulado: saldoAcumulado,
                tipo_documento: r.tipo_documento,
                documento_id: r.documento_id ? Number(r.documento_id) : null,
                observacion: r.observacion,
                producto: {
                    id: Number(r.producto_id),
                    nombre: r.producto_nombre
                },
                variante: {
                    id: Number(r.variante_id),
                    sku: r.sku,
                    talla: r.talla,
                    color: r.color,
                    precio_venta: Number(r.precio_venta),
                    precio_compra: r.precio_compra ? Number(r.precio_compra) : null
                },
                almacen: {
                    id: Number(r.almacen_id),
                    nombre: r.almacen_nombre
                },
                usuario: {
                    id: r.usuario_id ? Number(r.usuario_id) : null,
                    nombre: r.usuario_nombre ?? "Sistema"
                }
            };
        });

        // Aplicar paginación sobre los resultados enriquecidos
        const total = enriquecidos.length;
        const skip = (page - 1) * limit;
        const paginados = enriquecidos.slice(skip, skip + limit);

        res.json({
            ok: true,
            total,
            pagina: page,
            limite: limit,
            total_paginas: Math.ceil(total / limit),
            saldo_final: varianteId ? saldoAcumulado : undefined,
            data: paginados
        });
    } catch (error) {
        console.error("ERROR GENERANDO KARDEX:", error);
        res.status(500).json({ message: "Error al generar el Kárdex de inventario" });
    }
};

/**
 * POST /nova-inventario/ajuste
 * Realiza un ajuste manual de inventario (auditoría física, merma, conteo).
 * Registra movimiento en NOVA_MOVIMIENTO_INVENTARIO, actualiza NOVA_INVENTARIO
 * y deja constancia en NOVA_AUDITORIA.
 */
export const registrarAjusteInventario = async (req: Request, res: Response): Promise<void> => {
    try {
        const varianteId = parseIntId(req.body.variante_id ?? req.body.VAR_VARIANTE);
        if (!varianteId) {
            res.status(400).json({ message: "El campo variante_id es obligatorio" });
            return;
        }

        const tipo = String(req.body.tipo ?? req.body.MOVI_TIPO ?? "").trim().toUpperCase();
        if (tipo !== "ENTRADA" && tipo !== "SALIDA") {
            res.status(400).json({ message: "El tipo de ajuste debe ser 'ENTRADA' o 'SALIDA'" });
            return;
        }

        const cantidad = Number(req.body.cantidad ?? req.body.MOVI_CANTIDAD);
        if (!Number.isInteger(cantidad) || cantidad <= 0) {
            res.status(400).json({ message: "La cantidad debe ser un entero positivo mayor a 0" });
            return;
        }

        const observacion = trimOrNull(req.body.observacion ?? req.body.MOVI_OBSERVACION);
        if (!observacion) {
            res.status(400).json({ message: "La observación o motivo del ajuste es obligatoria" });
            return;
        }

        const variante = await AppDataSource.getRepository(NovaVariante).findOne({
            where: { variante_id: varianteId },
            relations: { producto: true }
        });
        if (!variante) {
            res.status(404).json({ message: "La variante especificada no existe" });
            return;
        }

        let almacenId = parseIntId(req.body.almacen_id ?? req.body.ALM_ALMACEN);
        const almacenRepo = AppDataSource.getRepository(NovaAlmacen);
        if (!almacenId) {
            const primerAlm = await almacenRepo.find({ order: { almacen_id: "ASC" }, take: 1 });
            if (!primerAlm[0]) {
                const creado = await almacenRepo.save(almacenRepo.create({ almacen_nombre: "Almacén Central", almacen_ubicacion: "Principal" }));
                almacenId = creado.almacen_id;
            } else {
                almacenId = primerAlm[0].almacen_id;
            }
        }

        const usuarioId = req.user?.usuario_id || 1;

        const resultado = await AppDataSource.transaction(async (manager) => {
            const invRepo = manager.getRepository(NovaInventario);
            let inv = await invRepo.findOne({
                where: { variante_id: varianteId, almacen_id: almacenId }
            });

            const stockAntes = inv ? Number(inv.inventario_cantidad || 0) : 0;

            if (tipo === "SALIDA" && stockAntes < cantidad) {
                throw new Error(`Stock insuficiente para realizar el ajuste de salida. Stock actual: ${stockAntes}, requerido: ${cantidad}`);
            }

            const stockDespues = tipo === "ENTRADA" ? stockAntes + cantidad : stockAntes - cantidad;

            if (inv) {
                inv.inventario_cantidad = stockDespues;
                await invRepo.save(inv);
            } else {
                inv = invRepo.create({
                    variante_id: varianteId,
                    almacen_id: almacenId,
                    inventario_cantidad: stockDespues
                });
                await invRepo.save(inv);
            }

            // Registrar movimiento de inventario con documento 'AJUSTE'
            const movRepo = manager.getRepository(NovaMovimientoInventario);
            const mov = movRepo.create({
                variante_id: varianteId,
                almacen_id: almacenId,
                movimiento_tipo: tipo,
                movimiento_cantidad: cantidad,
                movimiento_tipo_documento: "AJUSTE",
                movimiento_documento_id: null,
                usuario_id: usuarioId,
                movimiento_fecha: new Date(),
                movimiento_observacion: observacion
            });
            await movRepo.save(mov);

            // Registrar auditoría global
            await registrarAuditoria({
                tabla: "NOVA_INVENTARIO",
                accion: "UPDATE",
                campo: "INV_CANTIDAD",
                valorAntes: stockAntes.toString(),
                valorDespues: `${stockDespues} (Ajuste ${tipo} ${cantidad} - Motivo: ${observacion})`,
                usuarioId,
                manager
            });

            return { stockAntes, stockDespues, movimientoId: mov.movimiento_id };
        });

        res.status(201).json({
            ok: true,
            message: `Ajuste de inventario (${tipo} ${cantidad}) registrado exitosamente`,
            variante_sku: variante.variante_sku,
            producto: variante.producto?.producto_nombre,
            stock_anterior: resultado.stockAntes,
            stock_actual: resultado.stockDespues,
            movimiento_id: resultado.movimientoId
        });

    } catch (error: any) {
        console.error("ERROR REGISTRANDO AJUSTE DE INVENTARIO:", error);
        res.status(400).json({ message: error?.message || "Error al registrar el ajuste de inventario" });
    }
};
