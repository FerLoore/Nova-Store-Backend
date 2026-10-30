import { Router } from "express";
import { getAuditorias, getResumenAuditoria } from "../handles/novaAuditoria.handler";

const router = Router();

router.get("/resumen", getResumenAuditoria);
router.get("/", getAuditorias);

export default router;
