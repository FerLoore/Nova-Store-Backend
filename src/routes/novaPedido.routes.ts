import { Router } from "express";
import {
    crearPedido,
    aprobarPedido,
    getPedidos,
    getPedidoById
} from "../handles/novaPedido.handler";
import { authenticate, requirePermiso, requirePermisoByMethod } from "../middlewares/auth";

const router = Router();

// Todas las rutas de pedidos requieren usuario autenticado
router.use(authenticate);

// Listar pedidos — PEDIDOS / LECTURA
router.get("/", requirePermiso("PEDIDOS", "LECTURA"), getPedidos);

// Obtener detalle de pedido por ID — PEDIDOS / LECTURA
router.get("/:id", requirePermiso("PEDIDOS", "LECTURA"), getPedidoById);

// Crear nuevo pedido — PEDIDOS / ESCRITURA
// Lógica: Si PED_DESCUENTO > 0 -> 'ESPERANDO_APROBACION'; si 0 -> 'APROBADO'
router.post("/", requirePermiso("PEDIDOS", "ESCRITURA"), crearPedido);

// Aprobar pedido — APROBACIONES / ESCRITURA (módulo diferente, acción específica)
router.put("/:id/aprobar", requirePermiso("APROBACIONES", "ESCRITURA"), aprobarPedido);

export default router;
