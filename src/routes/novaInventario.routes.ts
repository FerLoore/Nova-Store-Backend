import { Router } from "express";
import {
    getInventarioGeneral,
    getAlertasInventario
} from "../handles/novaInventario.handler";

const router = Router();

// Endpoint de Alertas: Filtra donde INV_CANTIDAD <= VAR_STOCK_MINIMO
router.get("/alertas", getAlertasInventario);

// Endpoint de Inventario General: Cruce de NOVA_INVENTARIO, NOVA_VARIANTE, NOVA_PRODUCTO, NOVA_ALMACEN
router.get("/general", getInventarioGeneral);
router.get("/",        getInventarioGeneral);

export default router;
