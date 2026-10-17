import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn
} from "typeorm";
import { NovaVariante } from "./novaVariante";
import { NovaUsuario } from "./novaUsuario";
import { NovaAlmacen } from "./novaAlmacen";

@Entity("NOVA_MOVIMIENTO_INVENTARIO")
export class NovaMovimientoInventario {

    @PrimaryGeneratedColumn({ name: "MOVI_MOVIMIENTO" })
    movimiento_id!: number;

    @Column({ name: "VAR_VARIANTE", type: "number" })
    variante_id!: number;

    @ManyToOne(() => NovaVariante)
    @JoinColumn({ name: "VAR_VARIANTE" })
    variante?: NovaVariante;

    @Column({ name: "ALM_ALMACEN", type: "number" })
    almacen_id!: number;

    @ManyToOne(() => NovaAlmacen)
    @JoinColumn({ name: "ALM_ALMACEN" })
    almacen?: NovaAlmacen;

    @Column({ name: "MOVI_TIPO", type: "varchar", length: 10 })
    movimiento_tipo!: string; // 'ENTRADA' | 'SALIDA'

    @Column({ name: "MOVI_CANTIDAD", type: "number" })
    movimiento_cantidad!: number;

    @Column({ name: "MOVI_TIPO_DOCUMENTO", type: "varchar", length: 20 })
    movimiento_tipo_documento!: string; // 'COMPRA'

    @Column({ name: "MOVI_DOCUMENTO_ID", type: "number", nullable: true })
    movimiento_documento_id?: number | null;

    @Column({ name: "USU_USUARIO", type: "number" })
    usuario_id!: number;

    @ManyToOne(() => NovaUsuario)
    @JoinColumn({ name: "USU_USUARIO" })
    usuario?: NovaUsuario;

    @CreateDateColumn({ name: "MOVI_FECHA", type: "timestamp" })
    movimiento_fecha!: Date;

    @Column({ name: "MOVI_OBSERVACION", type: "varchar", length: 200, nullable: true })
    movimiento_observacion?: string | null;

}
