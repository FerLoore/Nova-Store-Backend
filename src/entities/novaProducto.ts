import {
    Entity, PrimaryGeneratedColumn, Column,
    CreateDateColumn, ManyToOne, OneToMany, JoinColumn
} from "typeorm";
import { NovaCategoria } from "./novaCategoria";
import { NovaMarca } from "./novaMarca";
import { NovaVariante } from "./novaVariante";

@Entity("NOVA_PRODUCTO")
export class NovaProducto {

    @PrimaryGeneratedColumn({ name: "PRODU_PRODUCTO" })
    producto_id!: number;

    @Column({ name: "CATE_CATEGORIA", type: "number" })
    categoria_id!: number;

    @ManyToOne(() => NovaCategoria)
    @JoinColumn({ name: "CATE_CATEGORIA" })
    categoria?: NovaCategoria;

    @Column({ name: "MAR_MARCA", type: "number" })
    marca_id!: number;

    @ManyToOne(() => NovaMarca)
    @JoinColumn({ name: "MAR_MARCA" })
    marca?: NovaMarca;

    @Column({ name: "PRODU_NOMBRE", type: "varchar", length: 150 })
    producto_nombre!: string;

    @Column({ name: "PRODU_DESCRIPCION", type: "clob", nullable: true })
    producto_descripcion?: string | null;

    @Column({ name: "PRODU_GENERO", type: "varchar", length: 10 })
    producto_genero!: string;

    @Column({ name: "PRODU_TEMPORADA", type: "varchar", length: 30, nullable: true })
    producto_temporada?: string | null;

    @Column({ name: "PRODU_ACTIVO", type: "number", default: 1 })
    producto_activo!: number;

    @CreateDateColumn({ name: "PRODU_CREADO", type: "timestamp" })
    producto_creado!: Date;

    @OneToMany(() => NovaVariante, (v) => v.producto, { cascade: ["insert"] })
    variantes?: NovaVariante[];

}
