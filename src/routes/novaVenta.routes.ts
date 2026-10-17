import { Router } from "express";
import {
    getVentas,
    getVentaById,
    crearVenta
} from "../handles/novaVenta.handler";

const router = Router();

// GET /nova-venta — Listar todas las ventas
router.get("/", getVentas);

// GET /nova-venta/:id — Obtener venta por ID
router.get("/:id", getVentaById);

// POST /nova-venta — Registrar venta y salida de mercancía
router.post("/", crearVenta);

export default router;
