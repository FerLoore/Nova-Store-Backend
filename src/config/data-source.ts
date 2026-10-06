import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
    type: "oracle",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 1521,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    serviceName: process.env.DB_SERVICE,
    synchronize: false,      // NUNCA true — el schema lo maneja SQL Developer
    logging: true,           // muestra queries en consola durante desarrollo
    entities: ["src/entities/*.ts"],
});