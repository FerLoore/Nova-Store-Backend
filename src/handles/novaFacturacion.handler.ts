import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { NovaPedido } from "../entities/novaPedido";
import { NovaDetallePedido } from "../entities/novaDetallePedido";
import { NovaVenta } from "../entities/novaVenta";
import { NovaDetalleVenta } from "../entities/novaDetalleVenta";
import { NovaPago } from "../entities/novaPago";
import { NovaMovimientoInventario } from "../entities/novaMovimientoInventario";
import { NovaInventario } from "../entities/novaInventario";
import { NovaAlmacen } from "../entities/novaAlmacen";
import { parseIntId, round2 } from "../utils/validation";

const METODOS_PAGO_VALIDOS = ["EFECTIVO", "TARJETA", "TRANSFERENCIA"] as const;

/**
 * POST /ventas/facturar/:idPedido
 * Convierte un pedido APROBADO en venta, validando stock y registrando salidas de inventario.
 * Todo en una sola transacción — rollback total si falla algún paso.
 */
export const facturarPedido = async (req: Request, res: Response): Promise<void> => {
    const idPedido = parseIntId(req.params.idPedido);
    if (!idPedido) {
        res.status(400).json({ message: "ID de pedido inválido" });
        return;
    }

    // Validar método de pago
    const rawMetodo = String(req.body.pago_metodo ?? req.body.PAG_METODO ?? "EFECTIVO")
        .trim()
        .toUpperCase();
    if (!METODOS_PAGO_VALIDOS.includes(rawMetodo as any)) {
        res.status(400).json({
            message: `Método de pago inválido. Permitidos: ${METODOS_PAGO_VALIDOS.join(", ")}`
        });
        return;
    }
    const metodoPago = rawMetodo as "EFECTIVO" | "TARJETA" | "TRANSFERENCIA";

    try {
        // ── PASO 1: Leer el pedido y detalles por separado ──────────────────────────
        const pedidoRepo   = AppDataSource.getRepository(NovaPedido);
        const inventarioRepo = AppDataSource.getRepository(NovaInventario);
        const almacenRepo  = AppDataSource.getRepository(NovaAlmacen);

        const pedido = await pedidoRepo.findOne({
            where: { pedido_id: idPedido },
            relations: { cliente: true, usuario: true }
        });

        if (!pedido) {
            res.status(404).json({ message: `Pedido #${idPedido} no encontrado` });
            return;
        }
        if (pedido.pedido_estado !== "APROBADO") {
            res.status(400).json({
                message: `El pedido #${idPedido} debe estar en estado 'APROBADO'. Estado actual: '${pedido.pedido_estado}'`
            });
            return;
        }

        // Cargar detalles del pedido
        const detalleRepo = AppDataSource.getRepository(NovaDetallePedido);
        const detalles = await detalleRepo.find({ where: { pedido_id: idPedido } });

        if (!detalles || detalles.length === 0) {
            res.status(400).json({ message: "El pedido no tiene líneas de detalle" });
            return;
        }

        // ── PASO 2: Conseguir o crear almacén por defecto ────────────────────────────
        let almacenId = parseIntId(req.body.almacen_id ?? req.body.ALM_ALMACEN);
        if (!almacenId) {
            const almacenes = await almacenRepo.find({ order: { almacen_id: "ASC" }, take: 1 });
            let almacen = almacenes[0] || null;
            if (!almacen) {
                almacen = await almacenRepo.save(
                    almacenRepo.create({ almacen_nombre: "Almacén Central", almacen_ubicacion: "Sede Principal" })
                );
            }
            almacenId = almacen.almacen_id;
        }

        // ── PASO 3: Validar inventario por cada variante ─────────────────────────────
        const almacenesElegidos: Record<number, number> = {};

        for (const det of detalles) {
            const varianteId   = Number(det.variante_id);
            const cantNecesaria = Number(det.detalle_cantidad);

            const invRows = await inventarioRepo.find({ where: { variante_id: varianteId } });
            const stockTotal = invRows.reduce((acc, r) => acc + Number(r.inventario_cantidad ?? 0), 0);

            if (stockTotal < cantNecesaria) {
                // Obtener SKU vía SQL para el mensaje de error
                const skuRow = await AppDataSource.query(
                    `SELECT VAR_SKU FROM NOVA_VARIANTE WHERE VAR_VARIANTE = :id`,
                    [varianteId]
                ).catch(() => []);
                const sku = skuRow?.[0]?.VAR_SKU ?? `VAR#${varianteId}`;

                res.status(400).json({
                    message: `Sin inventario suficiente para el SKU "${sku}". Disponible: ${stockTotal}, requerido: ${cantNecesaria}`,
                    sku,
                    stock_disponible: stockTotal,
                    requerido: cantNecesaria,
                    error_tipo: "SIN_INVENTARIO"
                });
                return;
            }

            // Elegir el almacén con más stock para este ítem
            const mejor = invRows
                .filter(r => Number(r.inventario_cantidad ?? 0) >= cantNecesaria)
                .sort((a, b) => Number(b.inventario_cantidad) - Number(a.inventario_cantidad))[0];
            almacenesElegidos[varianteId] = mejor ? mejor.almacen_id : almacenId;
        }

        // ── PASOS 4–7: Transacción atómica ───────────────────────────────────────────
        const usuarioId = (req as any).user?.usuario_id ?? pedido.usuario_id ?? 1;
        const totalVenta = round2(Number(pedido.pedido_total));

        const result = await AppDataSource.transaction(async (manager) => {

            // 4a. Insertar NOVA_VENTA
            const nuevaVenta = manager.create(NovaVenta, {
                pedido_id:    pedido.pedido_id,
                cliente_id:   pedido.cliente_id,
                usuario_id:   usuarioId,
                venta_fecha:  new Date(),
                venta_estado: "COMPLETADA",
                venta_total:  totalVenta,
            });
            const ventaGuardada = await manager.save(NovaVenta, nuevaVenta);
            const ventaId = ventaGuardada.venta_id;

            // 4b. Insertar NOVA_DETALLE_VENTA
            for (const det of detalles) {
                const dv = manager.create(NovaDetalleVenta, {
                    venta_id:              ventaId,
                    variante_id:           Number(det.variante_id),
                    detalle_cantidad:      Number(det.detalle_cantidad),
                    detalle_precio_unitario: round2(Number(det.detalle_precio_unitario)),
                    detalle_subtotal:      round2(Number(det.detalle_subtotal)),
                });
                await manager.save(NovaDetalleVenta, dv);
            }

            // 5. Insertar NOVA_PAGO
            const pago = manager.create(NovaPago, {
                venta_id:    ventaId,
                pago_fecha:  new Date(),
                pago_monto:  totalVenta,
                pago_metodo: metodoPago,
            });
            await manager.save(NovaPago, pago);

            // 6. Insertar movimientos de inventario (SALIDA por cada línea)
            for (const det of detalles) {
                const varianteId = Number(det.variante_id);
                const mov = manager.create(NovaMovimientoInventario, {
                    variante_id:               varianteId,
                    almacen_id:                almacenesElegidos[varianteId] ?? almacenId,
                    movimiento_tipo:           "SALIDA",
                    movimiento_cantidad:       Number(det.detalle_cantidad),
                    movimiento_tipo_documento: "VENTA",
                    movimiento_documento_id:   ventaId,
                    usuario_id:                usuarioId,
                    movimiento_fecha:          new Date(),
                    movimiento_observacion:    `Facturación Pedido #${pedido.pedido_id} → Venta #${ventaId}`,
                });
                await manager.save(NovaMovimientoInventario, mov);
            }

            // 7. Actualizar pedido a FACTURADO
            await manager.update(NovaPedido, { pedido_id: pedido.pedido_id }, {
                pedido_estado: "FACTURADO"
            });

            return { ventaId };
        });

        res.status(201).json({
            ok: true,
            message: `Pedido #${idPedido} facturado como Venta #${result.ventaId}`,
            pedido_id: idPedido,
            venta_id:  result.ventaId
        });

    } catch (error: any) {
        console.error("❌ ERROR FACTURANDO PEDIDO #" + idPedido + ":", error);
        res.status(500).json({
            message: "Error al facturar el pedido. Se realizó rollback de la transacción.",
            error:   error?.message ?? String(error),
            detail:  error?.driverError?.message ?? error?.detail ?? undefined
        });
    }
};
