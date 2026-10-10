import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { NovaProducto } from "./novaProducto";

@Entity("NOVA_VARIANTE")
export class NovaVariante {

    @PrimaryGeneratedColumn({ name: "VAR_VARIANTE" })
    variante_id!: number;

    @ManyToOne(() => NovaProducto, (p) => p.variantes)
    @JoinColumn({ name: "PRODU_PRODUCTO" })
    producto!: NovaProducto;

    @Column({ name: "VAR_TALLA", type: "varchar", length: 10 })
    variante_talla!: string;

    @Column({ name: "VAR_COLOR", type: "varchar", length: 30 })
    variante_color!: string;

    @Column({ name: "VAR_SKU", type: "varchar", length: 50, unique: true })
    variante_sku!: string;

    @Column({ name: "VAR_PRECIO_COMPRA", type: "decimal", precision: 12, scale: 2, nullable: true })
    variante_precio_compra?: number | null;

    @Column({ name: "VAR_PRECIO_VENTA", type: "decimal", precision: 12, scale: 2 })
    variante_precio_venta!: number;

    @Column({ name: "VAR_STOCK_MINIMO", type: "number", nullable: true })
    variante_stock_minimo?: number | null;

    @Column({ name: "VAR_ACTIVO", type: "number", default: 1 })
    variante_activo!: number;

}
