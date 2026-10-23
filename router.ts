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
import novaProductoRoutes  from "./src/routes/novaProducto.routes";
import novaVarianteRoutes  from "./src/routes/novaVariante.routes";
import novaProveedorRoutes from "./src/routes/novaProveedor.routes";
import novaCompraRoutes    from "./src/routes/novaCompra.routes";
import novaInventarioRoutes from "./src/routes/novaInventario.routes";
import novaVentaRoutes      from "./src/routes/novaVenta.routes";
import novaPedidoRoutes     from "./src/routes/novaPedido.routes";

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

router.use("/nova-variante",
    authenticate,
    requirePermissionByMethod({
        lectura:   ["PRODUCTOS_VER", "PRODUCTOS_GESTIONAR"],
        escritura: ["PRODUCTOS_GESTIONAR"]
    }),
    novaVarianteRoutes
);

router.use("/nova-proveedor",
    authenticate,
    requirePermissionByMethod({
        lectura:   ["PRODUCTOS_VER", "PRODUCTOS_GESTIONAR"],
        escritura: ["PRODUCTOS_GESTIONAR"]
    }),
    novaProveedorRoutes
);

router.use("/nova-compra",
    authenticate,
    requirePermissionByMethod({
        lectura:   ["PRODUCTOS_VER", "PRODUCTOS_GESTIONAR"],
        escritura: ["PRODUCTOS_GESTIONAR"]
    }),
    novaCompraRoutes
);

router.use("/nova-inventario",
    authenticate,
    requirePermissionByMethod({
        lectura:   ["PRODUCTOS_VER", "PRODUCTOS_GESTIONAR"],
        escritura: ["PRODUCTOS_GESTIONAR"]
    }),
    novaInventarioRoutes
);

router.use("/nova-venta",
    authenticate,
    requirePermissionByMethod({
        lectura:   ["PRODUCTOS_VER", "PRODUCTOS_GESTIONAR"],
        escritura: ["PRODUCTOS_GESTIONAR"]
    }),
    novaVentaRoutes
);

// Módulo de Pedidos (POST /pedidos, PUT /pedidos/:id/aprobar, GET /pedidos)
router.use("/pedidos", novaPedidoRoutes);
router.use("/nova-pedido", novaPedidoRoutes);

export default router;