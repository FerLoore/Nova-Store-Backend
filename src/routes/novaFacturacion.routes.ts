import { Router } from "express";
import { facturarPedido } from "../handles/novaFacturacion.handler";
import { getVentas, getVentaById } from "../handles/novaVenta.handler";

const router = Router();

// GET /ventas — Listar ventas con filtros (fecha, cliente, estado)
router.get("/", getVentas);

// GET /ventas/:id — Obtener venta por ID
router.get("/:id", getVentaById);

// POST /ventas/facturar/:idPedido — Facturar pedido aprobado
router.post("/facturar/:idPedido", facturarPedido);

export default router;
