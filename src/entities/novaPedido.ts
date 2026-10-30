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
import { NovaDetallePedido } from "./novaDetallePedido";

@Entity("NOVA_PEDIDO")
export class NovaPedido {

    @PrimaryGeneratedColumn({ name: "PED_PEDIDO" })
    pedido_id!: number;

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

    @CreateDateColumn({ name: "PED_FECHA", type: "timestamp" })
    pedido_fecha!: Date;

    @Column({ name: "PED_ESTADO", type: "varchar", length: 30 })
    pedido_estado!: string; // 'ESPERANDO_APROBACION' | 'APROBADO' | 'CANCELADO'

    @Column({ name: "PED_TOTAL", type: "decimal", precision: 12, scale: 2 })
    pedido_total!: number;

    @Column({ name: "PED_DESCUENTO", type: "decimal", precision: 12, scale: 2, default: 0 })
    pedido_descuento!: number;

    @OneToMany(() => NovaDetallePedido, (det) => det.pedido, { cascade: ["insert"] })
    detalles?: NovaDetallePedido[];

}
