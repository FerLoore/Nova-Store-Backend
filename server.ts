//server.ts es el archivo donde se configura el servidor, 
// se conecta a la base de datos y se define el middleware para leer los datos del formulario
import express from 'express'
import router from './router'//conectar a la base de datos
import cors from "cors";

const app = express()

//Cors
const allowedOrigins = [
    process.env.FRONTEND_SERVICE,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
].filter(Boolean) as string[];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Bloqueado por CORS: " + origin));
        }
    },
    credentials: true
}));


//leer datos de forumalario
app.use(express.json({ limit: '50mb' })) // Aumentado el límite para soportar base64 grandes de reportes
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use('/reports', express.static('public/reports'))
app.use('/', router)



export default app