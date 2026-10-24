import { Router } from "express";
import {
    getProductos,
    getProductoById,
    getProductosById,
    createProducto,
    updateProducto,
    deleteProducto,
    activarProducto,
    addVariante,
    updateVariante,
    deleteVariante,
    getVariantesByProducto
} from "../handles/novaProducto.handler";

const router = Router();

// IMPORTANTE: rutas específicas antes de /:id para evitar colisiones
router.get("/id/:id",        getProductosById);

// Rutas de variantes asociadas al producto
router.get("/:id/variantes",               getVariantesByProducto);
router.post("/:id/variantes",              addVariante);
router.put("/:id/variantes/:varianteId",   updateVariante);
router.delete("/:id/variantes/:varianteId", deleteVariante);

// Compatibilidad hacia atrás
router.put("/variante/:id",    updateVariante);
router.delete("/variante/:id", deleteVariante);

// Activación de producto
router.patch("/:id/activar", activarProducto);
router.put("/:id/activar",   activarProducto);

router.get("/",     getProductos);
router.get("/:id",  getProductoById);
router.post("/",    createProducto);
router.put("/:id",  updateProducto);
router.delete("/:id", deleteProducto);

export default router;
