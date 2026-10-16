import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { NovaProveedor } from "../entities/novaProveedor";
import { parseIntId, trimOrNull, isValidEmail, isValidPhone } from "../utils/validation";

const proveedorRepo = () => AppDataSource.getRepository(NovaProveedor);

// GET /nova-proveedor — Listar todos los proveedores
export const getProveedores = async (_req: Request, res: Response): Promise<void> => {
    try {
        const proveedores = await proveedorRepo().find({
            order: { proveedor_nombre: "ASC" }
        });
        res.json(proveedores);
    } catch (error) {
        console.error("ERROR OBTENIENDO PROVEEDORES:", error);
        res.status(500).json({ message: "Error al obtener proveedores" });
    }
};

// GET /nova-proveedor/:id — Obtener proveedor por ID
export const getProveedorById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) {
            res.status(400).json({ message: "ID de proveedor inválido" });
            return;
        }

        const proveedor = await proveedorRepo().findOneBy({ proveedor_id: id });
        if (!proveedor) {
            res.status(404).json({ message: "Proveedor no encontrado" });
            return;
        }

        res.json(proveedor);
    } catch (error) {
        console.error("ERROR BUSCANDO PROVEEDOR:", error);
        res.status(500).json({ message: "Error al buscar proveedor" });
    }
};

// POST /nova-proveedor — Crear proveedor
export const createProveedor = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            proveedor_nombre,
            PROV_NOMBRE,
            proveedor_ruc_nit,
            PROV_RUC_NIT,
            proveedor_telefono,
            PROV_TELEFONO,
            proveedor_correo,
            PROV_CORREO,
            proveedor_direccion,
            PROV_DIRECCION
        } = req.body;

        const nombre = trimOrNull(proveedor_nombre ?? PROV_NOMBRE);
        const rucNit = trimOrNull(proveedor_ruc_nit ?? PROV_RUC_NIT);
        const telefono = trimOrNull(proveedor_telefono ?? PROV_TELEFONO);
        const correo = trimOrNull(proveedor_correo ?? PROV_CORREO);
        const direccion = trimOrNull(proveedor_direccion ?? PROV_DIRECCION);

        const errors: string[] = [];

        if (!nombre) {
            errors.push("El nombre del proveedor (PROV_NOMBRE) es obligatorio");
        } else if (nombre.length > 120) {
            errors.push("El nombre no puede superar los 120 caracteres");
        }

        if (rucNit && rucNit.length > 30) {
            errors.push("El RUC/NIT no puede superar los 30 caracteres");
        }

        if (telefono) {
            if (telefono.length > 30) {
                errors.push("El teléfono no puede superar los 30 caracteres");
            } else if (!isValidPhone(telefono)) {
                errors.push("Formato de teléfono inválido");
            }
        }

        if (correo) {
            if (correo.length > 120) {
                errors.push("El correo no puede superar los 120 caracteres");
            } else if (!isValidEmail(correo, 120)) {
                errors.push("Formato de correo electrónico inválido");
            }
        }

        if (direccion && direccion.length > 200) {
            errors.push("La dirección no puede superar los 200 caracteres");
        }

        if (errors.length) {
            res.status(400).json({ message: errors.join("; ") });
            return;
        }

        const nuevoProveedor = proveedorRepo().create({
            proveedor_nombre: nombre!,
            proveedor_ruc_nit: rucNit,
            proveedor_telefono: telefono,
            proveedor_correo: correo,
            proveedor_direccion: direccion
        });

        const guardado = await proveedorRepo().save(nuevoProveedor);
        res.status(201).json(guardado);
    } catch (error) {
        console.error("ERROR CREANDO PROVEEDOR:", error);
        res.status(500).json({ message: "Error al crear proveedor" });
    }
};

// PUT /nova-proveedor/:id — Actualizar proveedor
export const updateProveedor = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) {
            res.status(400).json({ message: "ID de proveedor inválido" });
            return;
        }

        const proveedor = await proveedorRepo().findOneBy({ proveedor_id: id });
        if (!proveedor) {
            res.status(404).json({ message: "Proveedor no encontrado" });
            return;
        }

        const {
            proveedor_nombre,
            PROV_NOMBRE,
            proveedor_ruc_nit,
            PROV_RUC_NIT,
            proveedor_telefono,
            PROV_TELEFONO,
            proveedor_correo,
            PROV_CORREO,
            proveedor_direccion,
            PROV_DIRECCION
        } = req.body;

        const inNombre = proveedor_nombre !== undefined ? proveedor_nombre : PROV_NOMBRE;
        const inRucNit = proveedor_ruc_nit !== undefined ? proveedor_ruc_nit : PROV_RUC_NIT;
        const inTelefono = proveedor_telefono !== undefined ? proveedor_telefono : PROV_TELEFONO;
        const inCorreo = proveedor_correo !== undefined ? proveedor_correo : PROV_CORREO;
        const inDireccion = proveedor_direccion !== undefined ? proveedor_direccion : PROV_DIRECCION;

        if (inNombre !== undefined) {
            const n = trimOrNull(inNombre);
            if (!n) {
                res.status(400).json({ message: "El nombre no puede quedar vacío" });
                return;
            }
            if (n.length > 120) {
                res.status(400).json({ message: "El nombre no puede superar los 120 caracteres" });
                return;
            }
            proveedor.proveedor_nombre = n;
        }

        if (inRucNit !== undefined) {
            const r = trimOrNull(inRucNit);
            if (r && r.length > 30) {
                res.status(400).json({ message: "El RUC/NIT no puede superar los 30 caracteres" });
                return;
            }
            proveedor.proveedor_ruc_nit = r;
        }

        if (inTelefono !== undefined) {
            const t = trimOrNull(inTelefono);
            if (t) {
                if (t.length > 30) {
                    res.status(400).json({ message: "El teléfono no puede superar los 30 caracteres" });
                    return;
                }
                if (!isValidPhone(t)) {
                    res.status(400).json({ message: "Formato de teléfono inválido" });
                    return;
                }
            }
            proveedor.proveedor_telefono = t;
        }

        if (inCorreo !== undefined) {
            const c = trimOrNull(inCorreo);
            if (c) {
                if (c.length > 120) {
                    res.status(400).json({ message: "El correo no puede superar los 120 caracteres" });
                    return;
                }
                if (!isValidEmail(c, 120)) {
                    res.status(400).json({ message: "Formato de correo electrónico inválido" });
                    return;
                }
            }
            proveedor.proveedor_correo = c;
        }

        if (inDireccion !== undefined) {
            const d = trimOrNull(inDireccion);
            if (d && d.length > 200) {
                res.status(400).json({ message: "La dirección no puede superar los 200 caracteres" });
                return;
            }
            proveedor.proveedor_direccion = d;
        }

        const actualizado = await proveedorRepo().save(proveedor);
        res.json(actualizado);
    } catch (error) {
        console.error("ERROR ACTUALIZANDO PROVEEDOR:", error);
        res.status(500).json({ message: "Error al actualizar proveedor" });
    }
};

// DELETE /nova-proveedor/:id — Eliminar proveedor
export const deleteProveedor = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) {
            res.status(400).json({ message: "ID de proveedor inválido" });
            return;
        }

        const proveedor = await proveedorRepo().findOneBy({ proveedor_id: id });
        if (!proveedor) {
            res.status(404).json({ message: "Proveedor no encontrado" });
            return;
        }

        await proveedorRepo().remove(proveedor);
        res.json({ ok: true, message: "Proveedor eliminado correctamente" });
    } catch (error: any) {
        console.error("ERROR ELIMINANDO PROVEEDOR:", error);
        if (error?.code === "ORA-02292") {
            res.status(400).json({ message: "No se puede eliminar el proveedor porque tiene compras asociadas" });
            return;
        }
        res.status(500).json({ message: "Error al eliminar proveedor" });
    }
};
