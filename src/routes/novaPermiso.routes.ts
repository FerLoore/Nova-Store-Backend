import { Router } from "express";
import { getPermisos, getPermisosByRol, setPermisosRol } from "../handles/novaPermiso.handler";

const router = Router();

// GET /nova-permiso — catálogo
router.get("/", getPermisos);

// GET /nova-permiso/rol/:id — permisos de un rol
router.get("/rol/:id", getPermisosByRol);

// PUT /nova-permiso/rol/:id — reemplazar permisos de un rol
router.put("/rol/:id", setPermisosRol);

export default router;
