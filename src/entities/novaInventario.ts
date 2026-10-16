import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { NovaVariante } from "./novaVariante";
import { NovaAlmacen } from "./novaAlmacen";

@Entity("NOVA_INVENTARIO")
export class NovaInventario {

    @PrimaryGeneratedColumn({ name: "INV_INVENTARIO" })
    inventario_id!: number;

    @Column({ name: "VAR_VARIANTE", type: "number" })
    variante_id!: number;

    @ManyToOne(() => NovaVariante)
    @JoinColumn({ name: "VAR_VARIANTE" })
    variante?: NovaVariante;

    @Column({ name: "ALM_ALMACEN", type: "number" })
    almacen_id!: number;

    @ManyToOne(() => NovaAlmacen)
    @JoinColumn({ name: "ALM_ALMACEN" })
    almacen?: NovaAlmacen;

    @Column({ name: "INV_CANTIDAD", type: "number", default: 0 })
    inventario_cantidad!: number;

}
