import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("NOVA_CLIENTE")
export class NovaCliente {

    @PrimaryGeneratedColumn({ name: "CLI_CLIENTE" })
    cliente_id!: number;

    @Column({ name: "CLI_NOMBRE", type: "varchar", length: 120 })
    cliente_nombre!: string;

    @Column({ name: "CLI_DPI_NIT", type: "varchar", length: 30, nullable: true, unique: true })
    cliente_dpi_nit?: string | null;

    @Column({ name: "CLI_TELEFONO", type: "varchar", length: 30, nullable: true })
    cliente_telefono?: string | null;

    @Column({ name: "CLI_CORREO", type: "varchar", length: 120, nullable: true, unique: true })
    cliente_correo?: string | null;

    @Column({ name: "CLI_DIRECCION", type: "varchar", length: 200, nullable: true })
    cliente_direccion?: string | null;

    @Column({ name: "CLI_ACTIVO", type: "number", default: 1 })
    cliente_activo!: number;

    @CreateDateColumn({ name: "CLI_CREADO", type: "timestamp" })
    cliente_creado!: Date;

}
