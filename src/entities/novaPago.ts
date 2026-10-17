import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn
} from "typeorm";
import { NovaVenta } from "./novaVenta";

@Entity("NOVA_PAGO")
export class NovaPago {

    @PrimaryGeneratedColumn({ name: "PAG_PAGO" })
    pago_id!: number;

    @Column({ name: "VENT_VENTA", type: "number" })
    venta_id!: number;

    @ManyToOne(() => NovaVenta, (v) => v.pagos)
    @JoinColumn({ name: "VENT_VENTA" })
    venta?: NovaVenta;

    @CreateDateColumn({ name: "PAG_FECHA", type: "timestamp" })
    pago_fecha!: Date;

    @Column({ name: "PAG_MONTO", type: "number" })
    pago_monto!: number;

    @Column({ name: "PAG_METODO", type: "varchar", length: 30 })
    pago_metodo!: string; // 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'

}
