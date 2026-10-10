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
        NovaVariante
    ]
});