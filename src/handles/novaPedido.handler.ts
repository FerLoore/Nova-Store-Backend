import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { NovaPedido } from "../entities/novaPedido";
import { NovaDetallePedido } from "../entities/novaDetallePedido";
import { NovaCliente } from "../entities/novaCliente";
import { NovaVariante } from "../entities/novaVariante";
import { NovaAuditoria } from "../entities/novaAuditoria";
import { parseIntId, round2 } from "../utils/validation";

const pedidoRepo = () => AppDataSource.getRepository(NovaPedido);
const clienteRepo = () => AppDataSource.getRepository(NovaCliente);
const varianteRepo = () => AppDataSource.getRepository(NovaVariante);

/**
 * GET /pedidos — Listar pedidos con opción de filtrar por fecha, cliente y estado
 */
export const getPedidos = async (req: Request, res: Response): Promise<void> => {
    try {
        const estado = req.query.estado ? String(req.query.estado).trim().toUpperCase() : null;
        const cliente = req.query.cliente ? String(req.query.cliente).trim() : (req.query.cliente_id ? String(req.query.cliente_id).trim() : null);
        const fecha = req.query.fecha ? String(req.query.fecha).trim() : null;

        const qb = pedidoRepo().createQueryBuilder("p")
            .leftJoinAndSelect("p.cliente", "cliente")
            .leftJoinAndSelect("p.usuario", "usuario")
            .leftJoinAndSelect("p.detalles", "detalles")
            .leftJoinAndSelect("detalles.variante", "variante")
            .leftJoinAndSelect("variante.producto", "producto");

        if (estado) {
            qb.andWhere("p.pedido_estado = :estado", { estado });
        }
        if (cliente) {
            if (!isNaN(Number(cliente))) {
                qb.andWhere("p.cliente_id = :clienteId", { clienteId: Number(cliente) });
            } else {
                qb.andWhere("LOWER(cliente.cliente_nombre) LIKE :clienteNombre", { clienteNombre: `%${cliente.toLowerCase()}%` });
            }
        }
        if (fecha) {
            qb.andWhere("TO_CHAR(p.pedido_fecha, 'YYYY-MM-DD') = :fecha", { fecha });
        }

        qb.orderBy("p.pedido_id", "DESC");

        const pedidos = await qb.getMany();
        res.json(pedidos);
    } catch (error) {
        console.error("ERROR OBTENIENDO PEDIDOS:", error);
        res.status(500).json({ message: "Error al obtener la lista de pedidos" });
    }
};

/**
 * GET /pedidos/:id — Obtener un pedido específico por ID
 */
export const getPedidoById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) {
            res.status(400).json({ message: "ID de pedido inválido" });
            return;
        }

        const pedido = await pedidoRepo().findOne({
            where: { pedido_id: id },
            relations: {
                cliente: true,
                usuario: true,
                detalles: {
                    variante: {
                        producto: true
                    }
                }
            }
        });

        if (!pedido) {
            res.status(404).json({ message: "Pedido no encontrado" });
            return;
        }

        res.json(pedido);
    } catch (error) {
        console.error("ERROR OBTENIENDO PEDIDO:", error);
        res.status(500).json({ message: "Error al consultar el pedido" });
    }
};

/**
 * POST /pedidos — Crear un nuevo pedido
 * Payload:
 * {
 *   CLI_CLIENTE: number,
 *   PED_DESCUENTO?: number,
 *   detalles: [
 *     { VAR_VARIANTE: number, DETPED_CANTIDAD: number, DETPED_PRECIO_UNITARIO?: number }
 *   ]
 * }
 */
export const crearPedido = async (req: Request, res: Response): Promise<void> => {
    try {
        const clienteId = parseIntId(req.body.CLI_CLIENTE ?? req.body.cliente_id);
        if (!clienteId) {
            res.status(400).json({ message: "El cliente es obligatorio (CLI_CLIENTE)" });
            return;
        }

        // Verificar existencia y estado del cliente
        const cliente = await clienteRepo().findOne({
            where: { cliente_id: clienteId, cliente_activo: 1 }
        });
        if (!cliente) {
            res.status(404).json({ message: "El cliente no existe o se encuentra inactivo" });
            return;
        }

        // Validar lista de detalles
        const rawDetalles = req.body.detalles ?? req.body.items;
        if (!Array.isArray(rawDetalles) || rawDetalles.length === 0) {
            res.status(400).json({ message: "El pedido debe incluir al menos un detalle de variante" });
            return;
        }

        // Validar descuento
        const rawDescuento = req.body.PED_DESCUENTO ?? req.body.descuento ?? 0;
        const descuento = Number(rawDescuento);
        if (isNaN(descuento) || descuento < 0) {
            res.status(400).json({ message: "El descuento (PED_DESCUENTO) debe ser un número mayor o igual a 0" });
            return;
        }

        const usuarioId = req.user?.usuario_id || 1;

        // Validar cada variante y calcular subtotales
        const itemsParsed: {
            variante_id: number;
            variante_sku: string;
            producto_nombre: string;
            detalle_cantidad: number;
            detalle_precio_unitario: number;
            detalle_subtotal: number;
        }[] = [];

        let sumaSubtotales = 0;

        for (let i = 0; i < rawDetalles.length; i++) {
            const item = rawDetalles[i];
            const vId = parseIntId(item.VAR_VARIANTE ?? item.variante_id);
            if (!vId) {
                res.status(400).json({ message: `Detalle[${i}]: El campo VAR_VARIANTE es obligatorio` });
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

            const cant = Number(item.DETPED_CANTIDAD ?? item.detalle_cantidad ?? item.cantidad);
            if (!Number.isInteger(cant) || cant <= 0) {
                res.status(400).json({ message: `Detalle[${i}]: La cantidad (DETPED_CANTIDAD) debe ser un entero positivo` });
                return;
            }

            // Precio unitario: usar el especificado o el precio de venta configurado en la variante
            let precio = item.DETPED_PRECIO_UNITARIO ?? item.detalle_precio_unitario ?? item.precio_unitario ?? variante.variante_precio_venta;
            precio = Number(precio);
            if (isNaN(precio) || precio < 0) {
                res.status(400).json({ message: `Detalle[${i}]: El precio unitario debe ser un número >= 0` });
                return;
            }

            const subtotal = round2(cant * precio);
            sumaSubtotales += subtotal;

            itemsParsed.push({
                variante_id: vId,
                variante_sku: variante.variante_sku,
                producto_nombre: variante.producto?.producto_nombre ?? "Producto",
                detalle_cantidad: cant,
                detalle_precio_unitario: round2(precio),
                detalle_subtotal: subtotal
            });
        }

        sumaSubtotales = round2(sumaSubtotales);

        if (descuento > sumaSubtotales) {
            res.status(400).json({
                message: `El descuento (${descuento}) no puede ser mayor al subtotal de los productos (${sumaSubtotales})`
            });
            return;
        }

        // Lógica de PED_TOTAL y PED_ESTADO:
        // Si PED_DESCUENTO > 0 -> 'ESPERANDO_APROBACION'
        // Si PED_DESCUENTO == 0 -> 'APROBADO'
        const totalPedido = round2(Math.max(0, sumaSubtotales - descuento));
        const estadoPedido = descuento > 0 ? "ESPERANDO_APROBACION" : "APROBADO";

        // Transacción para guardar pedido y sus detalles
        const savedPedido = await AppDataSource.transaction(async (manager) => {
            const nuevoPedido = manager.create(NovaPedido, {
                cliente_id: clienteId,
                usuario_id: usuarioId,
                pedido_fecha: new Date(),
                pedido_estado: estadoPedido,
                pedido_descuento: round2(descuento),
                pedido_total: totalPedido
            });

            const resultPedido = await manager.save(NovaPedido, nuevoPedido);

            const detalleEntities = itemsParsed.map((item) =>
                manager.create(NovaDetallePedido, {
                    pedido_id: resultPedido.pedido_id,
                    variante_id: item.variante_id,
                    detalle_cantidad: item.detalle_cantidad,
                    detalle_precio_unitario: item.detalle_precio_unitario,
                    detalle_subtotal: item.detalle_subtotal
                })
            );

            await manager.save(NovaDetallePedido, detalleEntities);

            if (descuento > 0) {
                const audi = manager.create(NovaAuditoria, {
                    auditoria_tabla: "NOVA_PEDIDO",
                    auditoria_accion: "DESCUENTO",
                    auditoria_campo: "PED_DESCUENTO",
                    auditoria_valor_antes: "0.00",
                    auditoria_valor_despues: round2(descuento).toString(),
                    usuario_id: usuarioId,
                    auditoria_fecha: new Date(),
                });
                await manager.save(NovaAuditoria, audi);
            }

            return resultPedido;
        });

        // Recargar pedido con relaciones para respuesta completa
        const fullPedido = await pedidoRepo().findOne({
            where: { pedido_id: savedPedido.pedido_id },
            relations: {
                cliente: true,
                usuario: true,
                detalles: {
                    variante: {
                        producto: true
                    }
                }
            }
        });

        res.status(201).json({
            message: estadoPedido === "ESPERANDO_APROBACION"
                ? "Pedido creado en espera de aprobación por descuento aplicado"
                : "Pedido creado y aprobado exitosamente",
            pedido: fullPedido
        });
    } catch (error) {
        console.error("ERROR CREANDO PEDIDO:", error);
        res.status(500).json({ message: "Error al registrar el pedido" });
    }
};

/**
 * PUT /pedidos/:id/aprobar — Aprobar pedido con descuento
 * Protegido por rol GERENTE o ADMIN
 */
export const aprobarPedido = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) {
            res.status(400).json({ message: "ID de pedido inválido" });
            return;
        }

        const pedido = await pedidoRepo().findOne({
            where: { pedido_id: id },
            relations: {
                cliente: true,
                usuario: true,
                detalles: {
                    variante: {
                        producto: true
                    }
                }
            }
        });

        if (!pedido) {
            res.status(404).json({ message: "Pedido no encontrado" });
            return;
        }

        if (pedido.pedido_estado === "APROBADO") {
            res.status(200).json({
                message: "El pedido ya se encuentra aprobado",
                pedido
            });
            return;
        }

        // Cambiar estado a APROBADO
        const estadoAntes = pedido.pedido_estado;
        pedido.pedido_estado = "APROBADO";
        const pedidoActualizado = await pedidoRepo().save(pedido);

        // Registrar en NOVA_AUDITORIA
        const auditoriaRepo = AppDataSource.getRepository(NovaAuditoria);
        const audi = auditoriaRepo.create({
            auditoria_tabla: "NOVA_PEDIDO",
            auditoria_accion: "APROBAR",
            auditoria_campo: "PED_ESTADO",
            auditoria_valor_antes: estadoAntes,
            auditoria_valor_despues: "APROBADO",
            usuario_id: req.user?.usuario_id || pedido.usuario_id || 1,
            auditoria_fecha: new Date(),
        });
        await auditoriaRepo.save(audi);

        res.json({
            message: `Pedido #${pedido.pedido_id} aprobado con éxito`,
            pedido: pedidoActualizado
        });
    } catch (error) {
        console.error("ERROR APROBANDO PEDIDO:", error);
        res.status(500).json({ message: "Error al aprobar el pedido" });
    }
};
