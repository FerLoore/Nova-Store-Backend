import { Router } from "express";
import { getReporteVentas, getReporteTopProductos } from "../handles/novaReporte.handler";

const router = Router();

router.get("/ventas", getReporteVentas);
router.get("/top-productos", getReporteTopProductos);

export default router;
