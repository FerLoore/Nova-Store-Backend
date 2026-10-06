import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity("NOVA_MARCA")
export class NovaMarca {

    @PrimaryColumn({ name: "MAR_MARCA", type: "number" })
    marca_id!: number;

    @Column({ name: "MAR_NOMBRE", type: "varchar", length: 80 })
    marca_nombre!: string;

    @Column({ name: "MAR_DESCRIPCION", type: "varchar", length: 200, nullable: true })
    marca_descripcion?: string;

    @Column({ name: "MAR_ACTIVO", type: "number" })
    marca_activo!: number;

}
