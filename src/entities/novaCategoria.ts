import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("NOVA_CATEGORIA")
export class NovaCategoria {

    @PrimaryGeneratedColumn({ name: "CATE_CATEGORIA" })
    categoria_id!: number;

    @Column({ name: "CATE_NOMBRE", type: "varchar", length: 80 })
    categoria_nombre!: string;

    @Column({ name: "CATE_DESCRIPCION", type: "varchar", length: 200, nullable: true })
    categoria_descripcion?: string | null;

}
