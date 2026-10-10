import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("NOVA_MARCA")
export class NovaMarca {

    // Cambiado de @PrimaryColumn a @PrimaryGeneratedColumn — la tabla usa secuencia+trigger BEFORE INSERT
    @PrimaryGeneratedColumn({ name: "MAR_MARCA" })
    marca_id!: number;

    @Column({ name: "MAR_NOMBRE", type: "varchar", length: 80 })
    marca_nombre!: string;

    @Column({ name: "MAR_DESCRIPCION", type: "varchar", length: 200, nullable: true })
    marca_descripcion?: string | null;

    @Column({ name: "MAR_ACTIVO", type: "number" })
    marca_activo!: number;

}
