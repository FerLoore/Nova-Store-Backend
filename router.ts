import { Router } from "express";
import novaMarcaRoutes from "./src/routes/novaMarca.routes";
import novaRolRoutes from "./src/routes/novaRol.routes";
import novaUsuarioRoutes from "./src/routes/novaUsuario.routes";

const router = Router();

// Rutas
router.use("/nova-marca", novaMarcaRoutes);
router.use("/nova-rol", novaRolRoutes);
router.use("/nova-usuario", novaUsuarioRoutes);

export default router;