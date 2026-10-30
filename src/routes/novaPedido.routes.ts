import { Router } from "express";
import {
    crearPedido,
    aprobarPedido,
    getPedidos,
    getPedidoById
} from "../handles/novaPedido.handler";
import { authenticate, requirePermission } from "../middlewares/auth";

const router = Router();

// Todas las rutas de pedidos requieren usuario autenticado
router.use(authenticate);

// Listar pedidos (permite filtro ?estado=ESPERANDO_APROBACION)
router.get("/", getPedidos);

// Obtener detalle de pedido por ID
router.get("/:id", getPedidoById);

// Crear nuevo pedido
// Lógica: Si PED_DESCUENTO > 0 -> 'ESPERANDO_APROBACION'; si 0 -> 'APROBADO'
router.post("/", crearPedido);

// Aprobar pedido: requiere permiso PEDIDOS_APROBAR (asignado a ADMINISTRADOR y SUPERVISOR)
router.put("/:id/aprobar", requirePermission("PEDIDOS_APROBAR"), aprobarPedido);

export default router;
