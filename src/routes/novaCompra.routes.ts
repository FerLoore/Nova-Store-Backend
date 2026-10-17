import { Router } from "express";
import {
    getCompras,
    getCompraById,
    createCompra,
    recibirCompra,
    cancelarCompra
} from "../handles/novaCompra.handler";

const router = Router();

router.get("/",                 getCompras);
router.get("/:id",              getCompraById);
router.post("/",                createCompra);
router.patch("/:id/recibir",    recibirCompra);
router.post("/:id/recibir",     recibirCompra); // Soporta tanto PATCH como POST
router.patch("/:id/cancelar",   cancelarCompra);

export default router;
