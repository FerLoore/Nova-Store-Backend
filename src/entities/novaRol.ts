import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("NOVA_ROL")
export class NovaRol {

    @PrimaryGeneratedColumn({ name: "ROL_ROL" })
    rol_id!: number;

    @Column({ name: "ROL_NOMBRE", type: "varchar", length: 50, unique: true })
    rol_nombre!: string;

    @Column({ name: "ROL_DESCRIPCION", type: "varchar", length: 150, nullable: true })
    rol_descripcion?: string;

    @Column({ name: "ROL_PERMISO", type: "varchar", length: 100, nullable: true })
    rol_permiso?: string;

    @Column({ name: "ROL_ACTIVO", type: "number", default: 1 })
    rol_activo!: number;

}
