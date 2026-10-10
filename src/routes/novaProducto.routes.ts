import { Router } from "express";
import {
    getProductos,
    getProductoById,
    getProductosById,
    createProducto,
    updateProducto,
    deleteProducto,
    addVariante,
    updateVariante,
    deleteVariante
} from "../handles/novaProducto.handler";

const router = Router();

// IMPORTANTE: rutas específicas antes de /:id para evitar colisiones
router.get("/id/:id",        getProductosById);
router.post("/:id/variantes", addVariante);
router.put("/variante/:id",   updateVariante);
router.delete("/variante/:id", deleteVariante);

router.get("/",     getProductos);
router.get("/:id",  getProductoById);
router.post("/",    createProducto);
router.put("/:id",  updateProducto);
router.delete("/:id", deleteProducto);

export default router;
