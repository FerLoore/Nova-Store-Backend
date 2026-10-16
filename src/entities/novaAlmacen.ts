import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("NOVA_ALMACEN")
export class NovaAlmacen {

    @PrimaryGeneratedColumn({ name: "ALM_ALMACEN" })
    almacen_id!: number;

    @Column({ name: "ALM_NOMBRE", type: "varchar", length: 80 })
    almacen_nombre!: string;

    @Column({ name: "ALM_UBICACION", type: "varchar", length: 150, nullable: true })
    almacen_ubicacion?: string | null;

}
