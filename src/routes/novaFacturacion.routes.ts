import { Router } from "express";
import { facturarPedido } from "../handles/novaFacturacion.handler";
import { getVentas, getVentaById } from "../handles/novaVenta.handler";

const router = Router();

// GET /ventas — Listar ventas con filtros (fecha, cliente, estado)
router.get("/", getVentas);

// POST /ventas/facturar/:idPedido — Facturar pedido aprobado (ANTES de /:id para evitar colisión de rutas)
router.post("/facturar/:idPedido", facturarPedido);

// GET /ventas/:id — Obtener venta por ID
router.get("/:id", getVentaById);

export default router;
