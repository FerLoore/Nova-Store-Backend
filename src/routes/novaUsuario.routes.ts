import { Router } from "express";
import {
    getUsuarios,
    getUsuarioById,
    getUsuariosById,
    createUsuario,
    updateUsuario,
    deleteUsuario
} from "../handles/novaUsuario.handler";

const router = Router();

// GET    /nova-usuario
router.get("/", getUsuarios);

// GET    /nova-usuario/:id
router.get("/:id", getUsuarioById);

// GET    /nova-usuario/id/:id
router.get("/id/:id", getUsuariosById);

// POST   /nova-usuario
router.post("/", createUsuario);

// PUT    /nova-usuario/:id
router.put("/:id", updateUsuario);

// DELETE /nova-usuario/:id
router.delete("/:id", deleteUsuario);

export default router;
