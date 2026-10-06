import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { NovaRol } from "./novaRol";

@Entity("NOVA_USUARIO")
export class NovaUsuario {

    @PrimaryGeneratedColumn({ name: "USU_USUARIO" })
    usuario_id!: number;

    @Column({ name: "ROL_ROL", type: "number" })
    rol_id!: number;

    @ManyToOne(() => NovaRol)
    @JoinColumn({ name: "ROL_ROL" })
    rol?: NovaRol;

    @Column({ name: "USU_NOMBRE", type: "varchar", length: 100 })
    usuario_nombre!: string;

    @Column({ name: "USU_EMAIL", type: "varchar", length: 120, unique: true })
    usuario_email!: string;

    @Column({ name: "USU_PASSWORD", type: "varchar", length: 255 })
    usuario_password!: string;

    @Column({ name: "USU_ACTIVO", type: "number", default: 1 })
    usuario_activo!: number;

    @CreateDateColumn({ name: "USU_CREADO", type: "timestamp" })
    usuario_creado!: Date;

}
