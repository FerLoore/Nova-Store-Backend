import { Router } from "express";
import { login, me, register, getPublicRoles } from "../handles/auth.handler";
import { authenticate } from "../middlewares/auth";

const router = Router();

// POST /auth/login — público
router.post("/login", login);

// POST /auth/register — público
router.post("/register", register);

// GET /auth/roles — público (roles disponibles para registro)
router.get("/roles", getPublicRoles);

// GET /auth/me — requiere token
router.get("/me", authenticate, me);

export default router;

