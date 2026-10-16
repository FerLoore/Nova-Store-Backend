import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("NOVA_PROVEEDOR")
export class NovaProveedor {

    @PrimaryGeneratedColumn({ name: "PROV_PROVEEDOR" })
    proveedor_id!: number;

    @Column({ name: "PROV_NOMBRE", type: "varchar", length: 120 })
    proveedor_nombre!: string;

    @Column({ name: "PROV_RUC_NIT", type: "varchar", length: 30, nullable: true })
    proveedor_ruc_nit?: string | null;

    @Column({ name: "PROV_TELEFONO", type: "varchar", length: 30, nullable: true })
    proveedor_telefono?: string | null;

    @Column({ name: "PROV_CORREO", type: "varchar", length: 120, nullable: true })
    proveedor_correo?: string | null;

    @Column({ name: "PROV_DIRECCION", type: "varchar", length: 200, nullable: true })
    proveedor_direccion?: string | null;

}
