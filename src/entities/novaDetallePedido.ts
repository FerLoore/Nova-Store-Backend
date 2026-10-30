import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn
} from "typeorm";
import { NovaPedido } from "./novaPedido";
import { NovaVariante } from "./novaVariante";

@Entity("NOVA_DETALLE_PEDIDO")
export class NovaDetallePedido {

    @PrimaryGeneratedColumn({ name: "DETPED_DETALLE_PEDIDO" })
    detalle_id!: number;

    @Column({ name: "PED_PEDIDO", type: "number" })
    pedido_id!: number;

    @ManyToOne(() => NovaPedido, (p) => p.detalles)
    @JoinColumn({ name: "PED_PEDIDO" })
    pedido?: NovaPedido;

    @Column({ name: "VAR_VARIANTE", type: "number" })
    variante_id!: number;

    @ManyToOne(() => NovaVariante)
    @JoinColumn({ name: "VAR_VARIANTE" })
    variante?: NovaVariante;

    @Column({ name: "DETPED_CANTIDAD", type: "number" })
    detalle_cantidad!: number;

    @Column({ name: "DETPED_PRECIO_UNITARIO", type: "decimal", precision: 12, scale: 2 })
    detalle_precio_unitario!: number;

    @Column({ name: "DETPED_SUBTOTAL", type: "decimal", precision: 12, scale: 2 })
    detalle_subtotal!: number;

}
