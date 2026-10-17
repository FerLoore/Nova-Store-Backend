import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("NOVA_PERMISO")
export class NovaPermiso {

    @PrimaryGeneratedColumn({ name: "PERM_PERMISO" })
    permiso_id!: number;

    @Column({ name: "PERM_CODIGO", type: "varchar", length: 60, unique: true })
    permiso_codigo!: string;

    @Column({ name: "PERM_DESCRIPCION", type: "varchar", length: 150, nullable: true })
    permiso_descripcion?: string;

}
