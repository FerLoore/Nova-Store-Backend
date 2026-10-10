import { Router } from "express";
import {
    getClientes,
    getClienteById,
    getClientesById,
    createCliente,
    updateCliente,
    deleteCliente
} from "../handles/novaCliente.handler";

const router = Router();

router.get("/",        getClientes);
router.get("/id/:id",  getClientesById);
router.get("/:id",     getClienteById);
router.post("/",       createCliente);
router.put("/:id",     updateCliente);
router.delete("/:id",  deleteCliente);

export default router;
