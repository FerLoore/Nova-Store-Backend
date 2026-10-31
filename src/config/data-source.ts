import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";

import { NovaMarca }    from "../entities/novaMarca";
import { NovaRol }      from "../entities/novaRol";
import { NovaUsuario }  from "../entities/novaUsuario";
import { NovaPermiso }  from "../entities/novaPermiso";
import { NovaCliente }  from "../entities/novaCliente";
import { NovaCategoria } from "../entities/novaCategoria";
import { NovaProducto } from "../entities/novaProducto";
import { NovaVariante } from "../entities/novaVariante";
import { NovaProveedor } from "../entities/novaProveedor";
import { NovaCompra } from "../entities/novaCompra";
import { NovaDetalleCompra } from "../entities/novaDetalleCompra";
import { NovaMovimientoInventario } from "../entities/novaMovimientoInventario";
import { NovaAlmacen } from "../entities/novaAlmacen";
import { NovaInventario } from "../entities/novaInventario";
import { NovaVenta } from "../entities/novaVenta";
import { NovaDetalleVenta } from "../entities/novaDetalleVenta";
import { NovaPago } from "../entities/novaPago";
import { NovaPedido } from "../entities/novaPedido";
import { NovaDetallePedido } from "../entities/novaDetallePedido";
import { NovaAuditoria } from "../entities/novaAuditoria";
import { NovaRolModulo } from "../entities/novaRolModulo";

dotenv.config();

export const AppDataSource = new DataSource({
    type: "oracle",
    host:        process.env.DB_HOST || "localhost",
    port:        Number(process.env.DB_PORT) || 1521,
    username:    process.env.DB_USER,
    password:    process.env.DB_PASSWORD,
    serviceName: process.env.DB_SERVICE,
    synchronize: false,      // NUNCA true — el schema lo maneja SQL Developer
    logging:     true,       // muestra queries en consola durante desarrollo
    entities: [
        NovaMarca,
        NovaRol,
        NovaUsuario,
        NovaPermiso,
        NovaCliente,
        NovaCategoria,
        NovaProducto,
        NovaVariante,
        NovaProveedor,
        NovaCompra,
        NovaDetalleCompra,
        NovaMovimientoInventario,
        NovaAlmacen,
        NovaInventario,
        NovaVenta,
        NovaDetalleVenta,
        NovaPago,
        NovaPedido,
        NovaDetallePedido,
        NovaAuditoria,
        NovaRolModulo
    ]
});