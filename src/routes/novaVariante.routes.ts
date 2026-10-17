import { Router } from "express";
import {
    getVariantes,
    getVariantesByProducto,
    createVariante,
    updateVariante,
    deleteVariante
} from "../handles/novaVariante.handler";

const router = Router();

// Rutas específicas primero para evitar colisión con /:id
router.get("/producto/:productoId",              getVariantesByProducto);
router.post("/producto/:productoId",             createVariante);
router.put("/producto/:productoId/:id",          updateVariante);
router.delete("/producto/:productoId/:id",       deleteVariante);
router.patch("/producto/:productoId/:id/desactivar", deleteVariante);

// Rutas generales
router.get("/",                 getVariantes);
router.post("/",                createVariante);
router.put("/:id",              updateVariante);
router.delete("/:id",           deleteVariante);
router.patch("/:id/desactivar", deleteVariante);

export default router;
