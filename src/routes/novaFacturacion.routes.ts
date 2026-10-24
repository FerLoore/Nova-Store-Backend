import { Router } from "express";
import { facturarPedido } from "../handles/novaFacturacion.handler";

const router = Router();

/**
 * POST /ventas/facturar/:idPedido
 * Convierte un pedido APROBADO en venta.
 * Body: { pago_metodo: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" }
 */
router.post("/facturar/:idPedido", facturarPedido);

export default router;
