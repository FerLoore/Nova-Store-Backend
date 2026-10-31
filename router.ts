import { Router } from "express";
import { authenticate, requirePermiso, requirePermisoByMethod } from "./src/middlewares/auth";

// Rutas
import authRoutes          from "./src/routes/auth.routes";
import novaMarcaRoutes     from "./src/routes/novaMarca.routes";
import novaRolRoutes       from "./src/routes/novaRol.routes";
import novaUsuarioRoutes   from "./src/routes/novaUsuario.routes";
import novaPermisoRoutes   from "./src/routes/novaPermiso.routes";
import novaClienteRoutes   from "./src/routes/novaCliente.routes";
import novaCategoriaRoutes from "./src/routes/novaCategoria.routes";
import novaProductoRoutes  from "./src/routes/novaProducto.routes";
import novaVarianteRoutes  from "./src/routes/novaVariante.routes";
import novaProveedorRoutes from "./src/routes/novaProveedor.routes";
import novaCompraRoutes    from "./src/routes/novaCompra.routes";
import novaInventarioRoutes from "./src/routes/novaInventario.routes";
import novaVentaRoutes        from "./src/routes/novaVenta.routes";
import novaPedidoRoutes       from "./src/routes/novaPedido.routes";
import novaFacturacionRoutes  from "./src/routes/novaFacturacion.routes";
import novaReporteRoutes      from "./src/routes/novaReporte.routes";
import novaAuditoriaRoutes    from "./src/routes/novaAuditoria.routes";

const router = Router();

// Rutas públicas
router.use("/auth", authRoutes);

// ── USUARIOS ────────────────────────────────────────────────────────────────
router.use("/nova-usuario",
    authenticate,
    requirePermisoByMethod("USUARIOS"),
    novaUsuarioRoutes
);

// ── ROLES y PERMISOS ────────────────────────────────────────────────────────
router.use("/nova-rol",
    authenticate,
    requirePermisoByMethod("ROLES"),
    novaRolRoutes
);

router.use("/nova-permiso",
    authenticate,
    requirePermisoByMethod("ROLES"),
    novaPermisoRoutes
);

// ── CLIENTES ────────────────────────────────────────────────────────────────
router.use("/nova-cliente",
    authenticate,
    requirePermisoByMethod("CLIENTES"),
    novaClienteRoutes
);

// ── PRODUCTOS (catálogo, variantes, marcas, categorías) ─────────────────────
router.use("/nova-marca",
    authenticate,
    requirePermisoByMethod("PRODUCTOS"),
    novaMarcaRoutes
);

router.use("/nova-categoria",
    authenticate,
    requirePermisoByMethod("PRODUCTOS"),
    novaCategoriaRoutes
);

router.use("/nova-producto",
    authenticate,
    requirePermisoByMethod("PRODUCTOS"),
    novaProductoRoutes
);

router.use("/nova-variante",
    authenticate,
    requirePermisoByMethod("PRODUCTOS"),
    novaVarianteRoutes
);

// ── COMPRAS (proveedores + órdenes de compra) ───────────────────────────────
router.use("/nova-proveedor",
    authenticate,
    requirePermisoByMethod("COMPRAS"),
    novaProveedorRoutes
);
router.use("/proveedores",
    authenticate,
    requirePermisoByMethod("COMPRAS"),
    novaProveedorRoutes
);

router.use("/nova-compra",
    authenticate,
    requirePermisoByMethod("COMPRAS"),
    novaCompraRoutes
);
router.use("/compras",
    authenticate,
    requirePermisoByMethod("COMPRAS"),
    novaCompraRoutes
);

// ── INVENTARIO ──────────────────────────────────────────────────────────────
router.use("/nova-inventario",
    authenticate,
    requirePermisoByMethod("INVENTARIO"),
    novaInventarioRoutes
);
router.use("/inventario",
    authenticate,
    requirePermisoByMethod("INVENTARIO"),
    novaInventarioRoutes
);

// ── VENTAS (venta directa + facturación) ────────────────────────────────────
router.use("/nova-venta",
    authenticate,
    requirePermisoByMethod("VENTAS"),
    novaVentaRoutes
);

router.use("/ventas",
    authenticate,
    requirePermisoByMethod("VENTAS"),
    novaFacturacionRoutes
);

// ── PEDIDOS y APROBACIONES ──────────────────────────────────────────────────
// Nota: requirePermiso se aplica por ruta dentro de novaPedido.routes.ts
// GET/POST  -> PEDIDOS / LECTURA o ESCRITURA según método
// PUT /:id/aprobar -> APROBACIONES / ESCRITURA
router.use("/pedidos", novaPedidoRoutes);
router.use("/nova-pedido", novaPedidoRoutes);

// ── REPORTES ────────────────────────────────────────────────────────────────
router.use("/reportes",
    authenticate,
    requirePermiso("REPORTES", "LECTURA"),
    novaReporteRoutes
);

// ── AUDITORÍA ────────────────────────────────────────────────────────────────
router.use("/auditoria",
    authenticate,
    requirePermiso("AUDITORIA", "LECTURA"),
    novaAuditoriaRoutes
);
router.use("/nova-auditoria",
    authenticate,
    requirePermiso("AUDITORIA", "LECTURA"),
    novaAuditoriaRoutes
);

export default router;
