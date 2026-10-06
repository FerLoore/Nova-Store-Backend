import { Router } from "express";
import {
    getRoles,
    getRolById,
    getRolesById,
    createRol,
    updateRol,
    deleteRol
} from "../handles/novaRol.handler";

const router = Router();

// GET    /nova-rol
router.get("/", getRoles);

// GET    /nova-rol/:id
router.get("/:id", getRolById);

// GET    /nova-rol/id/:id
router.get("/id/:id", getRolesById);

// POST   /nova-rol
router.post("/", createRol);

// PUT    /nova-rol/:id
router.put("/:id", updateRol);

// DELETE /nova-rol/:id
router.delete("/:id", deleteRol);

export default router;
