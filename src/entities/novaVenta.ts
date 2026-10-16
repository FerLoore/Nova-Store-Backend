import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn
} from "typeorm";
import { NovaCliente } from "./novaCliente";
import { NovaUsuario } from "./novaUsuario";
import { NovaDetalleVenta } from "./novaDetalleVenta";
import { NovaPago } from "./novaPago";

@Entity("NOVA_VENTA")
export class NovaVenta {

    @PrimaryGeneratedColumn({ name: "VENT_VENTA" })
    venta_id!: number;

    @Column({ name: "PED_PEDIDO", type: "number", nullable: true })
    pedido_id?: number | null;

    @Column({ name: "CLI_CLIENTE", type: "number" })
    cliente_id!: number;

    @ManyToOne(() => NovaCliente)
    @JoinColumn({ name: "CLI_CLIENTE" })
    cliente?: NovaCliente;

    @Column({ name: "USU_USUARIO", type: "number" })
    usuario_id!: number;

    @ManyToOne(() => NovaUsuario)
    @JoinColumn({ name: "USU_USUARIO" })
    usuario?: NovaUsuario;

    @CreateDateColumn({ name: "VENT_FECHA", type: "timestamp" })
    venta_fecha!: Date;

    @Column({ name: "VENT_ESTADO", type: "varchar", length: 20, default: "COMPLETADA" })
    venta_estado!: string;

    @Column({ name: "VENT_TOTAL", type: "number" })
    venta_total!: number;

    @OneToMany(() => NovaDetalleVenta, (det) => det.venta)
    detalles?: NovaDetalleVenta[];

    @OneToMany(() => NovaPago, (pago) => pago.venta)
    pagos?: NovaPago[];

}
