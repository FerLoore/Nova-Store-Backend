//server.ts es el archivo donde se configura el servidor, 
// se conecta a la base de datos y se define el middleware para leer los datos del formulario
import express from 'express'
import router from './router'//conectar a la base de datos
import cors from "cors";

const app = express()

//Cors
app.use(cors({
    origin: process.env.FRONTEND_SERVICE  // puerto de Vite
}));


//leer datos de forumalario
app.use(express.json({ limit: '50mb' })) // Aumentado el límite para soportar base64 grandes de reportes
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use('/reports', express.static('public/reports'))
app.use('/', router)



export default app