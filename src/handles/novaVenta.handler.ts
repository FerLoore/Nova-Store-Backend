import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { NovaVenta } from "../entities/novaVenta";
import { NovaDetalleVenta } from "../entities/novaDetalleVenta";
import { NovaPago } from "../entities/novaPago";
import { NovaMovimientoInventario } from "../entities/novaMovimientoInventario";
import { NovaCliente } from "../entities/novaCliente";
import { NovaVariante } from "../entities/novaVariante";
import { NovaAlmacen } from "../entities/novaAlmacen";
import { NovaInventario } from "../entities/novaInventario";
import { parseIntId, round2 } from "../utils/validation";

const ventaRepo = () => AppDataSource.getRepository(NovaVenta);
const clienteRepo = () => AppDataSource.getRepository(NovaCliente);
const varianteRepo = () => AppDataSource.getRepository(NovaVariante);
const almacenRepo = () => AppDataSource.getRepository(NovaAlmacen);
const inventarioRepo = () => AppDataSource.getRepository(NovaInventario);

const METODOS_PAGO_VALIDOS = ["EFECTIVO", "TARJETA", "TRANSFERENCIA"] as const;

// GET /nova-venta — Listar ventas con cliente, usuario, detalles y pagos
export const getVentas = async (_req: Request, res: Response): Promise<void> => {
    try {
        const ventas = await ventaRepo().find({
            relations: {
                cliente: true,
                usuario: true,
                detalles: {
                    variante: {
                        producto: true
                    }
                },
                pagos: true
            },
            order: { venta_id: "DESC" }
        });
        res.json(ventas);
    } catch (error) {
        console.error("ERROR OBTENIENDO VENTAS:", error);
        res.status(500).json({ message: "Error al obtener el historial de ventas" });
    }
};

// GET /nova-venta/:id — Obtener una venta por ID
export const getVentaById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) {
            res.status(400).json({ message: "ID de venta inválido" });
            return;
        }

        const venta = await ventaRepo().findOne({
            where: { venta_id: id },
            relations: {
                cliente: true,
                usuario: true,
                detalles: {
                    variante: {
                        producto: true
                    }
                },
                pagos: true
            }
        });

        if (!venta) {
            res.status(404).json({ message: "Venta no encontrada" });
            return;
        }

        res.json(venta);
    } catch (error) {
        console.error("ERROR OBTENIENDO VENTA:", error);
        res.status(500).json({ message: "Error al obtener la venta" });
    }
};

/**
 * POST /nova-venta — Registrar Venta y Salida de Mercancía
 * Requerimiento:
 * 1. Valida primero en NOVA_INVENTARIO que INV_CANTIDAD sea >= DETVEN_CANTIDAD.
 *    Si no hay stock suficiente, devuelve error.
 * 2. Si hay stock, inserta en este orden exacto:
 *    a) NOVA_VENTA
 *    b) NOVA_DETALLE_VENTA
 *    c) NOVA_PAGO
 *    d) NOVA_MOVIMIENTO_INVENTARIO (MOVI_TIPO = 'SALIDA')
 *    Todo en una misma transacción.
 */
export const crearVenta = async (req: Request, res: Response): Promise<void> => {
    try {
        const clienteId = parseIntId(req.body.cliente_id ?? req.body.CLI_CLIENTE);
        if (!clienteId) {
            res.status(400).json({ message: "El cliente es obligatorio (cliente_id)" });
            return;
        }

        // Verificar que el cliente exista y esté activo
        const cliente = await clienteRepo().findOne({
            where: { cliente_id: clienteId, cliente_activo: 1 }
        });
        if (!cliente) {
            res.status(404).json({ message: "El cliente no existe o se encuentra inactivo" });
            return;
        }

        // Validar método de pago
        const rawMetodo = String(req.body.pago_metodo ?? req.body.PAG_METODO ?? "EFECTIVO").trim().toUpperCase();
        if (!METODOS_PAGO_VALIDOS.includes(rawMetodo as any)) {
            res.status(400).json({
                message: `Método de pago inválido. Permitidos: ${METODOS_PAGO_VALIDOS.join(", ")}`
            });
            return;
        }
        const metodoPago = rawMetodo;

        // Validar detalles
        const rawDetalles = req.body.detalles ?? req.body.items;
        if (!Array.isArray(rawDetalles) || rawDetalles.length === 0) {
            res.status(400).json({ message: "La venta debe incluir al menos un producto en el detalle" });
            return;
        }

        // Determinar almacén de salida
        let almacenId = parseIntId(req.body.almacen_id ?? req.body.ALM_ALMACEN);
        let almacenObj: NovaAlmacen | null = null;
        if (almacenId) {
            almacenObj = await almacenRepo().findOne({ where: { almacen_id: almacenId } });
        }
        if (!almacenObj) {
            almacenObj = await almacenRepo().findOne({ order: { almacen_id: "ASC" } });
            if (!almacenObj) {
                almacenObj = await almacenRepo().save(almacenRepo().create({
                    almacen_nombre: "Almacén Central",
                    almacen_ubicacion: "Sede Principal"
                }));
            }
        }
        almacenId = almacenObj.almacen_id;

        const usuarioId = req.user?.usuario_id || 1;

        // 1. VALIDACIÓN PREVIA DE STOCK EN NOVA_INVENTARIO
        const itemsParsed: {
            variante_id: number;
            variante_sku: string;
            producto_nombre: string;
            detalle_cantidad: number;
            detalle_precio_unitario: number;
            detalle_subtotal: number;
        }[] = [];

        let totalVenta = 0;

        for (let i = 0; i < rawDetalles.length; i++) {
            const item = rawDetalles[i];
            const vId = parseIntId(item.variante_id ?? item.VAR_VARIANTE);
            if (!vId) {
                res.status(400).json({ message: `Detalle[${i}]: El campo variante_id es obligatorio` });
                return;
            }

            const variante = await varianteRepo().findOne({
                where: { variante_id: vId, variante_activo: 1 },
                relations: { producto: true }
            });
            if (!variante) {
                res.status(404).json({ message: `Detalle[${i}]: La variante ID ${vId} no existe o está inactiva` });
                return;
            }

            const cant = Number(item.detalle_cantidad ?? item.DETVEN_CANTIDAD ?? item.cantidad);
            if (!Number.isInteger(cant) || cant <= 0) {
                res.status(400).json({ message: `Detalle[${i}]: La cantidad debe ser un número entero mayor a 0` });
                return;
            }

            // Validar existencia de stock en NOVA_INVENTARIO para esta variante y almacén
            const stockRow = await inventarioRepo().findOne({
                where: { variante_id: vId, almacen_id: almacenId }
            });
            const stockDisponible = stockRow ? Number(stockRow.inventario_cantidad || 0) : 0;

            if (stockDisponible < cant) {
                const prodNombre = variante.producto?.producto_nombre ?? "Producto";
                res.status(400).json({
                    message: `Stock insuficiente para "${prodNombre}" (SKU: ${variante.variante_sku}). Stock disponible: ${stockDisponible}, solicitado: ${cant}`,
                    sku: variante.variante_sku,
                    stock_disponible: stockDisponible,
                    solicitado: cant
                });
                return;
            }

            // Precio unitario: tomar el enviado o el precio de venta de la variante
            let precio = Number(item.detalle_precio_unitario ?? item.DETVEN_PRECIO_UNITARIO ?? item.precio ?? variante.variante_precio_venta);
            if (isNaN(precio) || precio < 0) {
                res.status(400).json({ message: `Detalle[${i}]: El precio unitario debe ser un número >= 0` });
                return;
            }

            const subtotal = round2(cant * precio);
            totalVenta += subtotal;

            itemsParsed.push({
                variante_id: vId,
                variante_sku: variante.variante_sku,
                producto_nombre: variante.producto?.producto_nombre ?? "Producto",
                detalle_cantidad: cant,
                detalle_precio_unitario: round2(precio),
                detalle_subtotal: subtotal
            });
        }

        totalVenta = round2(totalVenta);

        // 2. TRANSACCIÓN ATÓMICA EN EL ORDEN EXACTO SOLICITADO:
        // NOVA_VENTA -> NOVA_DETALLE_VENTA -> NOVA_PAGO -> NOVA_MOVIMIENTO_INVENTARIO
        const savedVenta = await AppDataSource.transaction(async (manager) => {
            // Paso a) NOVA_VENTA
            const venta = manager.create(NovaVenta, {
                cliente_id: clienteId,
                usuario_id: usuarioId,
                venta_fecha: new Date(),
                venta_estado: "COMPLETADA",
                venta_total: totalVenta
            });
            const resultVenta = await manager.save(NovaVenta, venta);

            // Paso b) NOVA_DETALLE_VENTA
            const detalleEntities = itemsParsed.map((item) =>
                manager.create(NovaDetalleVenta, {
                    venta_id: resultVenta.venta_id,
                    variante_id: item.variante_id,
                    detalle_cantidad: item.detalle_cantidad,
                    detalle_precio_unitario: item.detalle_precio_unitario,
                    detalle_subtotal: item.detalle_subtotal
                })
            );
            await manager.save(NovaDetalleVenta, detalleEntities);

            // Paso c) NOVA_PAGO
            const pago = manager.create(NovaPago, {
                venta_id: resultVenta.venta_id,
                pago_fecha: new Date(),
                pago_monto: totalVenta,
                pago_metodo: metodoPago
            });
            await manager.save(NovaPago, pago);

            // Paso d) NOVA_MOVIMIENTO_INVENTARIO (MOVI_TIPO = 'SALIDA')
            for (const item of itemsParsed) {
                const mov = manager.create(NovaMovimientoInventario, {
                    variante_id: item.variante_id,
                    almacen_id: almacenId!,
                    movimiento_tipo: "SALIDA",
                    movimiento_cantidad: item.detalle_cantidad,
                    movimiento_tipo_documento: "VENTA",
                    movimiento_documento_id: resultVenta.venta_id,
                    usuario_id: usuarioId,
                    movimiento_fecha: new Date(),
                    movimiento_observacion: `Venta #${resultVenta.venta_id} - Cliente #${clienteId}`
                });
                await manager.save(NovaMovimientoInventario, mov);
            }

            return resultVenta;
        });

        // Recargar la venta con todas sus relaciones
        const fullVenta = await ventaRepo().findOne({
            where: { venta_id: savedVenta.venta_id },
            relations: {
                cliente: true,
                usuario: true,
                detalles: {
                    variante: {
                        producto: true
                    }
                },
                pagos: true
            }
        });

        res.status(201).json({
            ok: true,
            message: `Venta #${savedVenta.venta_id} registrada con éxito. Se generaron las salidas de almacén correspondientes.`,
            venta: fullVenta
        });
    } catch (error: any) {
        console.error("ERROR REGISTRANDO VENTA:", error);
        res.status(500).json({
            message: "Error al registrar la venta y procesar la salida de inventario",
            error: error?.message || String(error)
        });
    }
};
