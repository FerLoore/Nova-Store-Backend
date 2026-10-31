import { Router } from "express";
import {
    getPermisos,
    getPermisosByRol,
    setPermisosRol,
    getPermisosModulo,
    setPermisosModulo,
} from "../handles/novaPermiso.handler";

const router = Router();

// ── Catálogo legado ──────────────────────────────────────────────────────────
// GET /nova-permiso — catálogo completo (legado)
router.get("/", getPermisos);

// GET /nova-permiso/rol/:id — permisos atómicos de un rol (legado)
router.get("/rol/:id", getPermisosByRol);

// PUT /nova-permiso/rol/:id — reemplazar permisos atómicos de un rol (legado)
router.put("/rol/:id", setPermisosRol);

// ── Nuevos endpoints por módulo ──────────────────────────────────────────────
// GET /nova-permiso/rol/:id/modulos — mapa módulo→nivel del rol
router.get("/rol/:id/modulos", getPermisosModulo);

// PUT /nova-permiso/rol/:id/modulos — upsert de los 11 módulos del rol
router.put("/rol/:id/modulos", setPermisosModulo);

export default router;
