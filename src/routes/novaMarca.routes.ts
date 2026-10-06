import { Router } from "express";
import {
    getMarcas,
    getMarcaById,
    getMarcasById,
    createMarca,
    updateMarca,
    deleteMarca
} from "../handles/novaMarca.handler";

const router = Router();

// GET    /api/nova-marca
router.get("/", getMarcas);

// GET    /api/nova-marca/:id
router.get("/:id", getMarcaById);

// GET    /api/nova-marca/:id
router.get("/id/:id", getMarcasById);

// POST   /api/nova-marca
router.post("/", createMarca);

// PUT    /api/nova-marca/:id
router.put("/:id", updateMarca);

// DELETE /api/nova-marca/:id
router.delete("/:id", deleteMarca);

export default router;