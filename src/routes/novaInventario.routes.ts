import { Router } from "express";
import {
    getInventarioGeneral,
    getAlertasInventario,
    getKardex,
    registrarAjusteInventario
} from "../handles/novaInventario.handler";

const router = Router();

// Endpoint de Kárdex físico y trazabilidad de movimientos
router.get("/kardex",      getKardex);
router.get("/movimientos", getKardex);

// Endpoint de Ajustes manuales de inventario (auditoría / merma / conteo físico)
router.post("/ajuste",      registrarAjusteInventario);
router.post("/movimientos", registrarAjusteInventario);

// Endpoint de Alertas: Filtra donde INV_CANTIDAD <= VAR_STOCK_MINIMO
router.get("/alertas", getAlertasInventario);

// Endpoint de Inventario General: Cruce de NOVA_INVENTARIO, NOVA_VARIANTE, NOVA_PRODUCTO, NOVA_ALMACEN
router.get("/general", getInventarioGeneral);
router.get("/",        getInventarioGeneral);

export default router;
