import "reflect-metadata";
import { AppDataSource } from "./src/config/data-source";
import app from "./server";
import dotenv from "dotenv";
import colors from "colors";

dotenv.config();

// Primero conecta Oracle, luego levanta Express
AppDataSource.initialize()
    .then(() => {
        console.log(colors.green.bold("Conectado a Oracle 21c"));

        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(colors.cyan.bold(`Servidor corriendo en http://localhost:${port}`));
        });
    })
    .catch((error) => {
        console.error(colors.red.bold("Error conectando a Oracle:"), error);
        process.exit(1);
    });