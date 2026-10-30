import { Router } from "express";
import { getAuditorias } from "../handles/novaAuditoria.handler";

const router = Router();

router.get("/", getAuditorias);

export default router;
