import { Router } from "express";
import authRoutes from "./src/routes/auth.routes";
import novaMarcaRoutes from "./src/routes/novaMarca.routes";
import novaRolRoutes from "./src/routes/novaRol.routes";
import novaUsuarioRoutes from "./src/routes/novaUsuario.routes";
import novaPermisoRoutes from "./src/routes/novaPermiso.routes";

const router = Router();

// Autenticación
router.use("/auth", authRoutes);

// Rutas
router.use("/nova-marca", novaMarcaRoutes);
router.use("/nova-rol", novaRolRoutes);
router.use("/nova-usuario", novaUsuarioRoutes);
router.use("/nova-permiso", novaPermisoRoutes);

export default router;