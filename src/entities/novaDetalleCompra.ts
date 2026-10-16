import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn
} from "typeorm";
import { NovaCompra } from "./novaCompra";
import { NovaVariante } from "./novaVariante";

@Entity("NOVA_DETALLE_COMPRA")
export class NovaDetalleCompra {

    @PrimaryGeneratedColumn({ name: "DETCOM_DETALLE_COMPRA" })
    detalle_id!: number;

    @Column({ name: "COMP_COMPRA", type: "number" })
    compra_id!: number;

    @ManyToOne(() => NovaCompra, (c) => c.detalles)
    @JoinColumn({ name: "COMP_COMPRA" })
    compra!: NovaCompra;

    @Column({ name: "VAR_VARIANTE", type: "number" })
    variante_id!: number;

    @ManyToOne(() => NovaVariante)
    @JoinColumn({ name: "VAR_VARIANTE" })
    variante?: NovaVariante;

    @Column({ name: "DETCOM_CANTIDAD", type: "number" })
    detalle_cantidad!: number;

    @Column({ name: "DETCOM_PRECIO_UNITARIO", type: "decimal", precision: 12, scale: 2 })
    detalle_precio_unitario!: number;

    @Column({ name: "DETCOM_SUBTOTAL", type: "decimal", precision: 12, scale: 2 })
    detalle_subtotal!: number;

}
