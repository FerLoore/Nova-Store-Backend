import { Entity, Column, PrimaryColumn } from "typeorm";

export type NivelModulo = "NINGUNO" | "LECTURA" | "ESCRITURA";

export const MODULOS_VALIDOS = [
    "USUARIOS", "ROLES", "CLIENTES", "PRODUCTOS", "INVENTARIO",
    "COMPRAS", "PEDIDOS", "APROBACIONES", "VENTAS", "REPORTES", "AUDITORIA"
] as const;

export type NombreModulo = typeof MODULOS_VALIDOS[number];

@Entity("NOVA_ROL_MODULO")
export class NovaRolModulo {

    @PrimaryColumn({ name: "RMO_ROL", type: "number" })
    rmo_rol!: number;

    @PrimaryColumn({ name: "RMO_MODULO", type: "varchar", length: 50 })
    rmo_modulo!: string;

    @Column({ name: "RMO_NIVEL", type: "varchar", length: 20 })
    rmo_nivel!: NivelModulo;
}

