import { Router } from "express";
import { authenticate, requirePermission, requirePermissionByMethod } from "./src/middlewares/auth";

// Rutas
import authRoutes       from "./src/routes/auth.routes";
import novaMarcaRoutes  from "./src/routes/novaMarca.routes";
import novaRolRoutes    from "./src/routes/novaRol.routes";
import novaUsuarioRoutes from "./src/routes/novaUsuario.routes";
import novaPermisoRoutes from "./src/routes/novaPermiso.routes";
import novaClienteRoutes from "./src/routes/novaCliente.routes";
import novaCategoriaRoutes from "./src/routes/novaCategoria.routes";
import novaProductoRoutes from "./src/routes/novaProducto.routes";

const router = Router();

// Rutas públicas
router.use("/auth", authRoutes);

// Rutas protegidas
router.use("/nova-usuario",
    authenticate,
    requirePermission("USUARIOS_GESTIONAR"),
    novaUsuarioRoutes
);

router.use("/nova-rol",
    authenticate,
    requirePermission("ROLES_GESTIONAR"),
    novaRolRoutes
);

router.use("/nova-permiso",
    authenticate,
    requirePermission("ROLES_GESTIONAR"),
    novaPermisoRoutes
);

router.use("/nova-cliente",
    authenticate,
    requirePermission("CLIENTES_GESTIONAR"),
    novaClienteRoutes
);

router.use("/nova-marca",
    authenticate,
    requirePermissionByMethod({
        lectura:   ["PRODUCTOS_VER", "PRODUCTOS_GESTIONAR"],
        escritura: ["PRODUCTOS_GESTIONAR"]
    }),
    novaMarcaRoutes
);

router.use("/nova-categoria",
    authenticate,
    requirePermissionByMethod({
        lectura:   ["PRODUCTOS_VER", "PRODUCTOS_GESTIONAR"],
        escritura: ["PRODUCTOS_GESTIONAR"]
    }),
    novaCategoriaRoutes
);

router.use("/nova-producto",
    authenticate,
    requirePermissionByMethod({
        lectura:   ["PRODUCTOS_VER", "PRODUCTOS_GESTIONAR"],
        escritura: ["PRODUCTOS_GESTIONAR"]
    }),
    novaProductoRoutes
);

export default router;