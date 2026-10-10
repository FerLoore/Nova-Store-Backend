import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import router from "./router";

const app = express();

// Seguridad
app.use(helmet());

// CORS: acepta múltiples orígenes o usa localhost por defecto en desarrollo
const rawOrigins = process.env.FRONTEND_SERVICE;
let corsOrigin: any = ["http://localhost:5173", "http://localhost:5174"];
if (rawOrigins && rawOrigins !== "null" && rawOrigins.trim() !== "") {
    if (rawOrigins === "*") {
        corsOrigin = true;
    } else {
        const origins = rawOrigins.split(",").map((o) => o.trim()).filter(Boolean);
        corsOrigin = origins.length === 1 ? origins[0] : origins;
    }
}
app.use(cors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Parseo de body
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Archivos estáticos
app.use("/reports", express.static("public/reports"));

// Rutas
app.use("/", router);

// 404
app.use((_req: Request, res: Response) => {
    res.status(404).json({ message: "Ruta no encontrada" });
});

// Manejador de errores global
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err.type === "entity.parse.failed") {
        res.status(400).json({ message: "El cuerpo de la solicitud no es un JSON válido" });
        return;
    }
    console.error("ERROR NO CONTROLADO:", err);
    res.status(500).json({ message: "Error interno del servidor" });
});

export default app;