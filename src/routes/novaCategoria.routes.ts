import { Router } from "express";
import { getCategorias, createCategoria } from "../handles/novaCategoria.handler";

const router = Router();

router.get("/",  getCategorias);
router.post("/", createCategoria);

export default router;
