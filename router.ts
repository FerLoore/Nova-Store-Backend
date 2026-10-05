import { Router } from "express";
import novaMarcaRoutes from "./src/routes/novaMarca.routes";
const router = Router();



// Se decalra las rutas de paginacion
router.use("/nova-marca", novaMarcaRoutes);

export default router;