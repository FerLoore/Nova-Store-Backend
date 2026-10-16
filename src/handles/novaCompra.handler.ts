import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { NovaCompra } from "../entities/novaCompra";
import { NovaDetalleCompra } from "../entities/novaDetalleCompra";
import { NovaMovimientoInventario } from "../entities/novaMovimientoInventario";
import { NovaProveedor } from "../entities/novaProveedor";
import { NovaVariante } from "../entities/novaVariante";
import { NovaAlmacen } from "../entities/novaAlmacen";
import { NovaInventario } from "../entities/novaInventario";
import { parseIntId, round2 } from "../utils/validation";

const compraRepo = () => AppDataSource.getRepository(NovaCompra);
const proveedorRepo = () => AppDataSource.getRepository(NovaProveedor);
const varianteRepo = () => AppDataSource.getRepository(NovaVariante);
const almacenRepo = () => AppDataSource.getRepository(NovaAlmacen);
const inventarioRepo = () => AppDataSource.getRepository(NovaInventario);

// GET /nova-compra — Listar todas las compras
export const getCompras = async (_req: Request, res: Response): Promise<void> => {
    try {
        const compras = await compraRepo().find({
            relations: {
                proveedor: true,
                usuario: true,
                detalles: {
                    variante: {
                        producto: true
                    }
                }
            },
            order: { compra_id: "DESC" }
        });
        res.json(compras);
    } catch (error) {
        console.error("ERROR OBTENIENDO COMPRAS:", error);
        res.status(500).json({ message: "Error al obtener las compras" });
    }
};

// GET /nova-compra/:id — Obtener compra por ID con detalles
export const getCompraById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) {
            res.status(400).json({ message: "ID de compra inválido" });
            return;
        }

        const compra = await compraRepo().findOne({
            where: { compra_id: id },
            relations: {
                proveedor: true,
                usuario: true,
                detalles: {
                    variante: {
                        producto: true
                    }
                }
            }
        });

        if (!compra) {
            res.status(404).json({ message: "Compra no encontrada" });
            return;
        }

        res.json(compra);
    } catch (error) {
        console.error("ERROR BUSCANDO COMPRA:", error);
        res.status(500).json({ message: "Error al buscar compra" });
    }
};

// POST /nova-compra — Crear orden de compra en estado PENDIENTE con sus detalles
export const createCompra = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            proveedor_id,
            PROV_PROVEEDOR,
            detalles,
            items
        } = req.body;

        const provId = parseIntId(proveedor_id ?? PROV_PROVEEDOR);
        if (!provId) {
            res.status(400).json({ message: "El proveedor (PROV_PROVEEDOR) es obligatorio" });
            return;
        }

        const proveedor = await proveedorRepo().findOneBy({ proveedor_id: provId });
        if (!proveedor) {
            res.status(404).json({ message: "El proveedor especificado no existe" });
            return;
        }

        const rawDetalles = Array.isArray(detalles) ? detalles : Array.isArray(items) ? items : null;
        if (!rawDetalles || rawDetalles.length === 0) {
            res.status(400).json({ message: "La orden de compra debe contener al menos 1 producto en el detalle" });
            return;
        }

        // Obtener usuario que registra desde el token JWT o fallback
        const usuarioId = req.user?.usuario_id || parseIntId(req.body.usuario_id ?? req.body.USU_USUARIO) || 1;

        // Validar cada item del detalle
        const itemsParsed: {
            variante_id: number;
            detalle_cantidad: number;
            detalle_precio_unitario: number;
            detalle_subtotal: number;
        }[] = [];

        let totalCompra = 0;

        for (let i = 0; i < rawDetalles.length; i++) {
            const item = rawDetalles[i];
            const vId = parseIntId(item.variante_id ?? item.VAR_VARIANTE);
            if (!vId) {
                res.status(400).json({ message: `Detalle[${i}]: ID de variante inválido o ausente` });
                return;
            }

            const variante = await varianteRepo().findOne({
                where: { variante_id: vId, variante_activo: 1 }
            });
            if (!variante) {
                res.status(404).json({ message: `Detalle[${i}]: La variante ID ${vId} no existe o está inactiva` });
                return;
            }

            const cant = Number(item.detalle_cantidad ?? item.DETCOM_CANTIDAD ?? item.cantidad);
            if (!Number.isInteger(cant) || cant <= 0) {
                res.status(400).json({ message: `Detalle[${i}]: La cantidad debe ser un número entero mayor a 0` });
                return;
            }

            const precio = Number(item.detalle_precio_unitario ?? item.DETCOM_PRECIO_UNITARIO ?? item.precio_unitario);
            if (isNaN(precio) || precio < 0) {
                res.status(400).json({ message: `Detalle[${i}]: El precio unitario debe ser un número >= 0` });
                return;
            }

            const subtotal = round2(cant * precio);
            totalCompra += subtotal;

            itemsParsed.push({
                variante_id: vId,
                detalle_cantidad: cant,
                detalle_precio_unitario: round2(precio),
                detalle_subtotal: subtotal
            });
        }

        totalCompra = round2(totalCompra);

        // Transacción para guardar NOVA_COMPRA y NOVA_DETALLE_COMPRA
        const savedCompra = await AppDataSource.transaction(async (manager) => {
            const compra = manager.create(NovaCompra, {
                proveedor_id: provId,
                usuario_id: usuarioId,
                compra_fecha: new Date(),
                compra_estado: "PENDIENTE",
                compra_total: totalCompra
            });

            const resultCompra = await manager.save(NovaCompra, compra);

            // Crear y guardar los detalles
            const detalleEntities = itemsParsed.map((item) =>
                manager.create(NovaDetalleCompra, {
                    compra_id: resultCompra.compra_id,
                    variante_id: item.variante_id,
                    detalle_cantidad: item.detalle_cantidad,
                    detalle_precio_unitario: item.detalle_precio_unitario,
                    detalle_subtotal: item.detalle_subtotal
                })
            );

            await manager.save(NovaDetalleCompra, detalleEntities);

            return resultCompra;
        });

        // Recargar con relaciones
        const fullCompra = await compraRepo().findOne({
            where: { compra_id: savedCompra.compra_id },
            relations: {
                proveedor: true,
                usuario: true,
                detalles: {
                    variante: {
                        producto: true
                    }
                }
            }
        });

        res.status(201).json(fullCompra);
    } catch (error) {
        console.error("ERROR CREANDO COMPRA:", error);
        res.status(500).json({ message: "Error al registrar la orden de compra" });
    }
};

// PATCH /nova-compra/:id/recibir — Cambia COMP_ESTADO a 'RECIBIDA' y registra ENTRADAS en inventario
export const recibirCompra = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) {
            res.status(400).json({ message: "ID de compra inválido" });
            return;
        }

        const compra = await compraRepo().findOne({
            where: { compra_id: id },
            relations: {
                detalles: true
            }
        });

        if (!compra) {
            res.status(404).json({ message: "Compra no encontrada" });
            return;
        }

        if (compra.compra_estado === "RECIBIDA") {
            res.status(400).json({ message: "Esta compra ya ha sido recibida previamente" });
            return;
        }

        if (compra.compra_estado === "CANCELADA") {
            res.status(400).json({ message: "No se puede recibir una compra que ha sido cancelada" });
            return;
        }

        if (!compra.detalles || compra.detalles.length === 0) {
            res.status(400).json({ message: "La compra no tiene registros de detalle para recibir" });
            return;
        }

        // Determinar almacén destino (por parámetro o buscar el primer almacén disponible)
        let almacenId = parseIntId(req.body?.almacen_id ?? req.body?.ALM_ALMACEN);
        let almacenObj: NovaAlmacen | null = null;
        if (almacenId) {
            almacenObj = await almacenRepo().findOne({ where: { almacen_id: almacenId } });
        }
        if (!almacenObj) {
            const primerAlmList = await almacenRepo().find({ order: { almacen_id: "ASC" }, take: 1 });
            almacenObj = primerAlmList[0] || null;
            if (!almacenObj) {
                const nuevoAlm = almacenRepo().create({
                    almacen_nombre: "Almacén Central",
                    almacen_ubicacion: "Sede Principal"
                });
                almacenObj = await almacenRepo().save(nuevoAlm);
            }
        }
        almacenId = almacenObj.almacen_id;

        const usuarioId = req.user?.usuario_id || compra.usuario_id || 1;

        // Transacción atómica: Actualizar estado, registrar movimientos y sincronizar stock
        await AppDataSource.transaction(async (manager) => {
            // 1. Cambiar estado a RECIBIDA
            compra.compra_estado = "RECIBIDA";
            await manager.save(NovaCompra, compra);

            // 2. Por cada detalle de la compra, insertar en NOVA_MOVIMIENTO_INVENTARIO y actualizar NOVA_INVENTARIO
            for (const det of compra.detalles!) {
                const mov = manager.create(NovaMovimientoInventario, {
                    variante_id: det.variante_id,
                    almacen_id: almacenId!,
                    movimiento_tipo: "ENTRADA",
                    movimiento_cantidad: det.detalle_cantidad,
                    movimiento_tipo_documento: "COMPRA",
                    movimiento_documento_id: compra.compra_id,
                    usuario_id: usuarioId,
                    movimiento_fecha: new Date(),
                    movimiento_observacion: `Recepción de Orden de Compra #${compra.compra_id}`
                });
                await manager.save(NovaMovimientoInventario, mov);

                // 3. Actualizar o insertar en NOVA_INVENTARIO
                let inv = await manager.findOne(NovaInventario, {
                    where: { variante_id: det.variante_id, almacen_id: almacenId! }
                });
                if (inv) {
                    inv.inventario_cantidad = Number(inv.inventario_cantidad || 0) + Number(det.detalle_cantidad);
                    await manager.save(NovaInventario, inv);
                } else {
                    inv = manager.create(NovaInventario, {
                        variante_id: det.variante_id,
                        almacen_id: almacenId!,
                        inventario_cantidad: Number(det.detalle_cantidad)
                    });
                    await manager.save(NovaInventario, inv);
                }
            }
        });

        // Recargar compra actualizada
        const compraActualizada = await compraRepo().findOne({
            where: { compra_id: id },
            relations: {
                proveedor: true,
                usuario: true,
                detalles: {
                    variante: {
                        producto: true
                    }
                }
            }
        });

        res.json({
            ok: true,
            message: `Compra #${id} recibida exitosamente. Se registraron los movimientos de entrada al inventario.`,
            compra: compraActualizada
        });
    } catch (error: any) {
        console.error("ERROR RECIBIENDO COMPRA:", error);
        res.status(500).json({ 
            message: "Error al recibir la compra y registrar movimientos de inventario",
            error: error?.message || String(error)
        });
    }
};

// PATCH /nova-compra/:id/cancelar — Cancelar una compra si está PENDIENTE
export const cancelarCompra = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) {
            res.status(400).json({ message: "ID de compra inválido" });
            return;
        }

        const compra = await compraRepo().findOneBy({ compra_id: id });
        if (!compra) {
            res.status(404).json({ message: "Compra no encontrada" });
            return;
        }

        if (compra.compra_estado === "RECIBIDA") {
            res.status(400).json({ message: "No se puede cancelar una compra que ya fue recibida" });
            return;
        }

        if (compra.compra_estado === "CANCELADA") {
            res.status(400).json({ message: "La compra ya está cancelada" });
            return;
        }

        compra.compra_estado = "CANCELADA";
        await compraRepo().save(compra);

        res.json({ ok: true, message: `Compra #${id} cancelada correctamente` });
    } catch (error) {
        console.error("ERROR CANCELANDO COMPRA:", error);
        res.status(500).json({ message: "Error al cancelar compra" });
    }
};
