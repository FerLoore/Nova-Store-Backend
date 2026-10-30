import { Router } from "express";
import {
    getReporteVentas,
    getReporteTopProductos,
    getReporteStockBajo,
    getReportePedidos,
    getReporteCompras,
    getReporteMetodosPago,
    getKpisDashboard
} from "../handles/novaReporte.handler";

const router = Router();

// KPIs generales para dashboard
router.get("/kpis", getKpisDashboard);

// Ventas y Top productos
router.get("/ventas", getReporteVentas);
router.get("/top-productos", getReporteTopProductos);

// Inventario y stock crítico
router.get("/stock-bajo", getReporteStockBajo);
router.get("/inventario", getReporteStockBajo);

// Pedidos y aprobaciones
router.get("/pedidos", getReportePedidos);

// Compras por proveedor y estado
router.get("/compras", getReporteCompras);

// Métodos de pago
router.get("/metodos-pago", getReporteMetodosPago);

export default router;
