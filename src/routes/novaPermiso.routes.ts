import { Router } from "express";
import { getPermisos, getPermisosByRol, setPermisosRol } from "../handles/novaPermiso.handler";

const router = Router();

// GET /nova-permiso - Catálogo general de permisos
router.get("/", getPermisos);

// GET /nova-permiso/rol/:rolId - Permisos asignados a un rol
router.get("/rol/:rolId", getPermisosByRol);

// PUT /nova-permiso/rol/:rolId - Actualizar permisos asignados a un rol
router.put("/rol/:rolId", setPermisosRol);

export default router;
