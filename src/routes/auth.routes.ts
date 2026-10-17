import { Router } from "express";
import { register, login, me, getRolesPublicos } from "../handles/auth.handler";

const router = Router();

// POST /auth/register
router.post("/register", register);

// POST /auth/login
router.post("/login", login);

// GET  /auth/me
router.get("/me", me);

// GET  /auth/roles
router.get("/roles", getRolesPublicos);

export default router;
