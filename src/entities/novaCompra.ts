import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn
} from "typeorm";
import { NovaProveedor } from "./novaProveedor";
import { NovaUsuario } from "./novaUsuario";
import { NovaDetalleCompra } from "./novaDetalleCompra";

@Entity("NOVA_COMPRA")
export class NovaCompra {

    @PrimaryGeneratedColumn({ name: "COMP_COMPRA" })
    compra_id!: number;

    @Column({ name: "PROV_PROVEEDOR", type: "number" })
    proveedor_id!: number;

    @ManyToOne(() => NovaProveedor)
    @JoinColumn({ name: "PROV_PROVEEDOR" })
    proveedor?: NovaProveedor;

    @Column({ name: "USU_USUARIO", type: "number" })
    usuario_id!: number;

    @ManyToOne(() => NovaUsuario)
    @JoinColumn({ name: "USU_USUARIO" })
    usuario?: NovaUsuario;

    @CreateDateColumn({ name: "COMP_FECHA", type: "timestamp" })
    compra_fecha!: Date;

    @Column({ name: "COMP_ESTADO", type: "varchar", length: 20, default: "PENDIENTE" })
    compra_estado!: string; // 'PENDIENTE' | 'RECIBIDA' | 'CANCELADA'

    @Column({ name: "COMP_TOTAL", type: "decimal", precision: 12, scale: 2, default: 0 })
    compra_total!: number;

    @OneToMany(() => NovaDetalleCompra, (d) => d.compra, { cascade: ["insert"] })
    detalles?: NovaDetalleCompra[];

}
