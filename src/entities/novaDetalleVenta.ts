import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn
} from "typeorm";
import { NovaVenta } from "./novaVenta";
import { NovaVariante } from "./novaVariante";

@Entity("NOVA_DETALLE_VENTA")
export class NovaDetalleVenta {

    @PrimaryGeneratedColumn({ name: "DETVEN_DETALLE_VENTA" })
    detalle_id!: number;

    @Column({ name: "VENT_VENTA", type: "number" })
    venta_id!: number;

    @ManyToOne(() => NovaVenta, (v) => v.detalles)
    @JoinColumn({ name: "VENT_VENTA" })
    venta?: NovaVenta;

    @Column({ name: "VAR_VARIANTE", type: "number" })
    variante_id!: number;

    @ManyToOne(() => NovaVariante)
    @JoinColumn({ name: "VAR_VARIANTE" })
    variante?: NovaVariante;

    @Column({ name: "DETVEN_CANTIDAD", type: "number" })
    detalle_cantidad!: number;

    @Column({ name: "DETVEN_PRECIO_UNITARIO", type: "number" })
    detalle_precio_unitario!: number;

    @Column({ name: "DETVEN_SUBTOTAL", type: "number" })
    detalle_subtotal!: number;

}
