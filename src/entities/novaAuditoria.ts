import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn
} from "typeorm";
import { NovaUsuario } from "./novaUsuario";

@Entity("NOVA_AUDITORIA")
export class NovaAuditoria {

    @PrimaryGeneratedColumn({ name: "AUDI_AUDITORIA" })
    auditoria_id!: number;

    @Column({ name: "AUDI_TABLA", type: "varchar", length: 50 })
    auditoria_tabla!: string;

    @Column({ name: "AUDI_ACCION", type: "varchar", length: 10 })
    auditoria_accion!: string;

    @Column({ name: "AUDI_CAMPO", type: "varchar", length: 50, nullable: true })
    auditoria_campo?: string | null;

    @Column({ name: "AUDI_VALOR_ANTES", type: "varchar", length: 4000, nullable: true })
    auditoria_valor_antes?: string | null;

    @Column({ name: "AUDI_VALOR_DESPUES", type: "varchar", length: 4000, nullable: true })
    auditoria_valor_despues?: string | null;

    @Column({ name: "USU_USUARIO", type: "number", nullable: true })
    usuario_id?: number | null;

    @ManyToOne(() => NovaUsuario)
    @JoinColumn({ name: "USU_USUARIO" })
    usuario?: NovaUsuario;

    @CreateDateColumn({ name: "AUDI_FECHA", type: "timestamp" })
    auditoria_fecha!: Date;

}
