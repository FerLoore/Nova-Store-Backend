import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { NovaCliente } from "../entities/novaCliente";
import { parseIntId, isValidEmail, isValidPhone, trimOrNull, getOraCode } from "../utils/validation";

const repo = () => AppDataSource.getRepository(NovaCliente);

function validateClienteFields(body: any, required = true) {
    const errors: string[] = [];

    const nombre = trimOrNull(body.cliente_nombre);
    if (required && !nombre) errors.push("cliente_nombre es obligatorio");
    if (nombre && nombre.length > 120) errors.push("cliente_nombre máximo 120 caracteres");

    const correo = trimOrNull(body.cliente_correo);
    if (correo && !isValidEmail(correo)) errors.push("Formato de correo inválido");

    const telefono = trimOrNull(body.cliente_telefono);
    if (telefono && !isValidPhone(telefono)) errors.push("Formato de teléfono inválido");

    const dpi = trimOrNull(body.cliente_dpi_nit);
    if (dpi && dpi.length > 30) errors.push("cliente_dpi_nit máximo 30 caracteres");

    const direccion = trimOrNull(body.cliente_direccion);
    if (direccion && direccion.length > 200) errors.push("cliente_direccion máximo 200 caracteres");

    return { errors, nombre, correo, telefono, dpi, direccion };
}

// GET / — clientes activos
export const getClientes = async (req: Request, res: Response): Promise<void> => {
    try {
        const clientes = await repo().find({ where: { cliente_activo: 1 }, order: { cliente_nombre: "ASC" } });
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ message: "Error obteniendo clientes" });
    }
};

// GET /:id — cliente activo por ID
export const getClienteById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID inválido" }); return; }
        const cliente = await repo().findOneBy({ cliente_id: id, cliente_activo: 1 });
        if (!cliente) { res.status(404).json({ message: "Cliente no encontrado o inactivo" }); return; }
        res.json(cliente);
    } catch (error) {
        res.status(500).json({ message: "Error buscando cliente" });
    }
};

// GET /id/:id — sin filtro activo
export const getClientesById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID inválido" }); return; }
        const cliente = await repo().findOneBy({ cliente_id: id });
        if (!cliente) { res.status(404).json({ message: "Cliente no encontrado" }); return; }
        res.json(cliente);
    } catch (error) {
        res.status(500).json({ message: "Error buscando cliente" });
    }
};

// POST / — crear cliente
export const createCliente = async (req: Request, res: Response): Promise<void> => {
    try {
        const { errors, nombre, correo, telefono, dpi, direccion } = validateClienteFields(req.body, true);
        if (errors.length) { res.status(400).json({ message: errors.join(", ") }); return; }

        const cliente = repo().create({
            cliente_nombre:  nombre!,
            cliente_correo:  correo,
            cliente_telefono: telefono,
            cliente_dpi_nit: dpi,
            cliente_direccion: direccion,
            cliente_activo: 1
        });
        const result = await repo().save(cliente);
        res.status(201).json(result);
    } catch (error: any) {
        console.error("ERROR CREANDO CLIENTE:", error);
        if (getOraCode(error) === "ORA-00001") {
            res.status(400).json({ message: "Ya existe un cliente con ese DPI/NIT o correo" });
            return;
        }
        res.status(500).json({ message: "Error creando cliente" });
    }
};

// PUT /:id — actualizar cliente
export const updateCliente = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID inválido" }); return; }

        const cliente = await repo().findOneBy({ cliente_id: id, cliente_activo: 1 });
        if (!cliente) { res.status(404).json({ message: "Cliente no encontrado" }); return; }

        const { errors, nombre, correo, telefono, dpi, direccion } = validateClienteFields(req.body, false);
        if (errors.length) { res.status(400).json({ message: errors.join(", ") }); return; }

        if (nombre   !== null) cliente.cliente_nombre    = nombre;
        if (correo   !== undefined) cliente.cliente_correo   = correo;
        if (telefono !== undefined) cliente.cliente_telefono = telefono;
        if (dpi      !== undefined) cliente.cliente_dpi_nit  = dpi;
        if (direccion!== undefined) cliente.cliente_direccion = direccion;

        const result = await repo().save(cliente);
        res.json(result);
    } catch (error: any) {
        console.error("ERROR ACTUALIZANDO CLIENTE:", error);
        if (getOraCode(error) === "ORA-00001") {
            res.status(400).json({ message: "Ya existe un cliente con ese DPI/NIT o correo" });
            return;
        }
        res.status(500).json({ message: "Error actualizando cliente" });
    }
};

// DELETE /:id — borrado lógico
export const deleteCliente = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID inválido" }); return; }
        const cliente = await repo().findOneBy({ cliente_id: id });
        if (!cliente) { res.status(404).json({ message: "Cliente no encontrado" }); return; }
        cliente.cliente_activo = 0;
        await repo().save(cliente);
        res.json({ ok: true, message: "Cliente desactivado correctamente" });
    } catch (error) {
        console.error("ERROR DESACTIVANDO CLIENTE:", error);
        res.status(500).json({ message: "Error eliminando cliente" });
    }
};
