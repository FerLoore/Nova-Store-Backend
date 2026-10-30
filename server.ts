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

// 404 - Ruta no encontrada
app.use((req: Request, res: Response) => {
    res.status(404).json({
        ok: false,
        message: `Ruta ${req.method} ${req.originalUrl} no encontrada`,
        error: "NOT_FOUND"
    });
});

// Manejador de errores global
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    if (err.type === "entity.parse.failed") {
        res.status(400).json({
            ok: false,
            message: "El cuerpo de la solicitud no es un JSON válido",
            error: "INVALID_JSON"
        });
        return;
    }
    console.error(`❌ ERROR NO CONTROLADO en ${req.method} ${req.originalUrl}:`, err);
    res.status(500).json({
        ok: false,
        message: "Error interno del servidor",
        error: process.env.NODE_ENV === "production" ? undefined : (err?.message ?? String(err))
    });
});

export default app;