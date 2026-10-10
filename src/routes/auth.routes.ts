import { Router } from "express";
import { login, me } from "../handles/auth.handler";
import { authenticate } from "../middlewares/auth";

const router = Router();

// POST /auth/login — público
router.post("/login", login);

// GET /auth/me — requiere token
router.get("/me", authenticate, me);

export default router;
