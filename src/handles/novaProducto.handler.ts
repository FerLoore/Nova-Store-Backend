import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { NovaProducto } from "../entities/novaProducto";
import { NovaVariante } from "../entities/novaVariante";
import { parseIntId, trimOrNull, round2, getOraCode } from "../utils/validation";

const GENEROS_VALIDOS = ["HOMBRE", "MUJER", "UNISEX"];

const productoRepo = () => AppDataSource.getRepository(NovaProducto);
const varianteRepo = () => AppDataSource.getRepository(NovaVariante);

// Valida y normaliza una variante del body
function parseVariante(v: any, index: number) {
    const errors: string[] = [];

    const talla = trimOrNull(v.variante_talla);
    if (!talla) errors.push(`variante[${index}]: variante_talla es obligatorio`);

    const color = trimOrNull(v.variante_color);
    if (!color) errors.push(`variante[${index}]: variante_color es obligatorio`);

    const sku = trimOrNull(v.variante_sku);
    if (!sku) errors.push(`variante[${index}]: variante_sku es obligatorio`);

    const pv = Number(v.variante_precio_venta);
    if (isNaN(pv) || pv < 0) errors.push(`variante[${index}]: variante_precio_venta debe ser >= 0`);

    const pc = v.variante_precio_compra != null ? Number(v.variante_precio_compra) : null;
    if (pc !== null && (isNaN(pc) || pc < 0)) errors.push(`variante[${index}]: variante_precio_compra debe ser >= 0`);

    const sm = v.variante_stock_minimo != null ? Number(v.variante_stock_minimo) : null;
    if (sm !== null && (!Number.isInteger(sm) || sm < 0)) errors.push(`variante[${index}]: variante_stock_minimo debe ser entero >= 0`);

    return {
        errors,
        data: {
            variante_talla:         talla?.toUpperCase() ?? "",
            variante_color:         color ?? "",
            variante_sku:           sku?.toUpperCase() ?? "",
            variante_precio_venta:  round2(pv),
            variante_precio_compra: pc !== null ? round2(pc) : null,
            variante_stock_minimo:  sm,
            variante_activo:        1
        }
    };
}

// GET / — productos activos con variantes activas
export const getProductos = async (req: Request, res: Response): Promise<void> => {
    try {
        const productos = await productoRepo().find({
            where: { producto_activo: 1 },
            relations: { categoria: true, marca: true, variantes: true },
            order: { producto_nombre: "ASC" }
        });
        // Filtrar solo variantes activas
        const result = productos.map((p) => ({
            ...p,
            variantes: (p.variantes ?? []).filter((v) => v.variante_activo === 1)
        }));
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Error obteniendo productos" });
    }
};

// GET /:id — producto activo por ID con variantes activas
export const getProductoById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID inválido" }); return; }

        const producto = await productoRepo().findOne({
            where: { producto_id: id, producto_activo: 1 },
            relations: { categoria: true, marca: true, variantes: true }
        });
        if (!producto) { res.status(404).json({ message: "Producto no encontrado o inactivo" }); return; }

        res.json({
            ...producto,
            variantes: (producto.variantes ?? []).filter((v) => v.variante_activo === 1)
        });
    } catch (error) {
        res.status(500).json({ message: "Error buscando producto" });
    }
};

// GET /id/:id — sin filtro activo
export const getProductosById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID inválido" }); return; }

        const producto = await productoRepo().findOne({
            where: { producto_id: id },
            relations: { categoria: true, marca: true, variantes: true }
        });
        if (!producto) { res.status(404).json({ message: "Producto no encontrado" }); return; }

        res.json(producto);
    } catch (error) {
        res.status(500).json({ message: "Error buscando producto" });
    }
};

// POST / — crear producto con variantes en transacción
export const createProducto = async (req: Request, res: Response): Promise<void> => {
    try {
        const { categoria_id, marca_id, producto_nombre, producto_descripcion,
                producto_genero, producto_temporada, variantes: variantesBody } = req.body;

        // Validar campos del producto
        const errors: string[] = [];

        if (!categoria_id || !Number.isInteger(Number(categoria_id)) || Number(categoria_id) < 1)
            errors.push("categoria_id es obligatorio y debe ser un entero positivo");
        if (!marca_id || !Number.isInteger(Number(marca_id)) || Number(marca_id) < 1)
            errors.push("marca_id es obligatorio y debe ser un entero positivo");

        const nombre = trimOrNull(producto_nombre);
        if (!nombre) errors.push("producto_nombre es obligatorio");
        if (nombre && nombre.length > 150) errors.push("producto_nombre máximo 150 caracteres");

        const genero = trimOrNull(producto_genero)?.toUpperCase();
        if (!genero || !GENEROS_VALIDOS.includes(genero))
            errors.push(`producto_genero debe ser: ${GENEROS_VALIDOS.join(", ")}`);

        if (!Array.isArray(variantesBody) || variantesBody.length === 0)
            errors.push("Debe incluir al menos 1 variante");
        if (Array.isArray(variantesBody) && variantesBody.length > 100)
            errors.push("Máximo 100 variantes por producto");

        if (errors.length) { res.status(400).json({ message: errors.join("; ") }); return; }

        // Parsear y validar cada variante
        const varianteParsed: ReturnType<typeof parseVariante>["data"][] = [];
        const allErrors: string[] = [];
        const skusVistos = new Set<string>();
        const combosVistos = new Set<string>();

        for (let i = 0; i < variantesBody.length; i++) {
            const { errors: vErrors, data } = parseVariante(variantesBody[i], i);
            allErrors.push(...vErrors);
            if (vErrors.length === 0) {
                if (skusVistos.has(data.variante_sku))
                    allErrors.push(`variante[${i}]: SKU "${data.variante_sku}" repetido en la solicitud`);
                const combo = `${data.variante_talla}|${data.variante_color}`;
                if (combosVistos.has(combo))
                    allErrors.push(`variante[${i}]: combinación talla+color repetida en la solicitud`);
                skusVistos.add(data.variante_sku);
                combosVistos.add(combo);
                varianteParsed.push(data);
            }
        }
        if (allErrors.length) { res.status(400).json({ message: allErrors.join("; ") }); return; }

        // Crear producto con variantes en una transacción
        const result = await AppDataSource.transaction(async (manager) => {
            const producto = manager.create(NovaProducto, {
                categoria_id:         Number(categoria_id),
                marca_id:             Number(marca_id),
                producto_nombre:      nombre!,
                producto_descripcion: trimOrNull(producto_descripcion),
                producto_genero:      genero!,
                producto_temporada:   trimOrNull(producto_temporada),
                producto_activo:      1,
                variantes:            varianteParsed as any
            });
            return manager.save(NovaProducto, producto);
        });

        // Recargar con relaciones
        const full = await productoRepo().findOne({
            where: { producto_id: result.producto_id },
            relations: { categoria: true, marca: true, variantes: true }
        });
        res.status(201).json(full);
    } catch (error: any) {
        console.error("ERROR CREANDO PRODUCTO:", error);
        const code = getOraCode(error);
        if (code === "ORA-00001")
            { res.status(400).json({ message: "El SKU ya existe, o la combinación producto/talla/color está repetida" }); return; }
        if (code === "ORA-02291")
            { res.status(400).json({ message: "La categoría o la marca especificada no existe" }); return; }
        res.status(500).json({ message: "Error creando producto" });
    }
};

// PUT /:id — actualizar datos del producto (no variantes)
export const updateProducto = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID inválido" }); return; }

        const producto = await productoRepo().findOneBy({ producto_id: id, producto_activo: 1 });
        if (!producto) { res.status(404).json({ message: "Producto no encontrado" }); return; }

        const { producto_nombre, producto_descripcion, producto_genero, producto_temporada, categoria_id, marca_id } = req.body;

        if (producto_nombre !== undefined) {
            const n = trimOrNull(producto_nombre);
            if (!n) { res.status(400).json({ message: "producto_nombre no puede quedar vacío" }); return; }
            if (n.length > 150) { res.status(400).json({ message: "producto_nombre máximo 150 caracteres" }); return; }
            producto.producto_nombre = n;
        }
        if (producto_descripcion !== undefined) producto.producto_descripcion = trimOrNull(producto_descripcion);
        if (producto_genero !== undefined) {
            const g = trimOrNull(producto_genero)?.toUpperCase();
            if (!g || !GENEROS_VALIDOS.includes(g)) {
                res.status(400).json({ message: `producto_genero debe ser: ${GENEROS_VALIDOS.join(", ")}` }); return;
            }
            producto.producto_genero = g;
        }
        if (producto_temporada !== undefined) producto.producto_temporada = trimOrNull(producto_temporada);
        if (categoria_id !== undefined) producto.categoria_id = Number(categoria_id);
        if (marca_id !== undefined) producto.marca_id = Number(marca_id);

        const result = await productoRepo().save(producto);
        res.json(result);
    } catch (error: any) {
        console.error("ERROR ACTUALIZANDO PRODUCTO:", error);
        if (getOraCode(error) === "ORA-02291")
            { res.status(400).json({ message: "La categoría o la marca especificada no existe" }); return; }
        res.status(500).json({ message: "Error actualizando producto" });
    }
};

// DELETE /:id — borrado lógico del producto
export const deleteProducto = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID inválido" }); return; }
        const producto = await productoRepo().findOneBy({ producto_id: id });
        if (!producto) { res.status(404).json({ message: "Producto no encontrado" }); return; }
        producto.producto_activo = 0;
        await productoRepo().save(producto);
        res.json({ ok: true, message: "Producto desactivado correctamente" });
    } catch (error) {
        console.error("ERROR DESACTIVANDO PRODUCTO:", error);
        res.status(500).json({ message: "Error eliminando producto" });
    }
};

// POST /:id/variantes — agregar variante a producto existente
export const addVariante = async (req: Request, res: Response): Promise<void> => {
    try {
        const productoId = parseIntId(req.params.id);
        if (!productoId) { res.status(400).json({ message: "ID de producto inválido" }); return; }

        const producto = await productoRepo().findOneBy({ producto_id: productoId, producto_activo: 1 });
        if (!producto) { res.status(404).json({ message: "Producto no encontrado" }); return; }

        const { errors, data } = parseVariante(req.body, 0);
        if (errors.length) { res.status(400).json({ message: errors.join("; ") }); return; }

        const variante = varianteRepo().create({ ...data, producto } as any);
        const result = await varianteRepo().save(variante);
        res.status(201).json(result);
    } catch (error: any) {
        console.error("ERROR CREANDO VARIANTE:", error);
        if (getOraCode(error) === "ORA-00001")
            { res.status(400).json({ message: "El SKU ya existe, o la combinación producto/talla/color está repetida" }); return; }
        res.status(500).json({ message: "Error creando variante" });
    }
};

// PUT /variante/:id — modificar variante
export const updateVariante = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID de variante inválido" }); return; }

        const variante = await varianteRepo().findOneBy({ variante_id: id, variante_activo: 1 });
        if (!variante) { res.status(404).json({ message: "Variante no encontrada" }); return; }

        const { variante_talla, variante_color, variante_sku, variante_precio_compra, variante_precio_venta, variante_stock_minimo } = req.body;

        if (variante_talla  !== undefined) variante.variante_talla  = String(variante_talla).toUpperCase();
        if (variante_color  !== undefined) variante.variante_color  = String(variante_color);
        if (variante_sku    !== undefined) variante.variante_sku    = String(variante_sku).toUpperCase();
        if (variante_precio_venta !== undefined) {
            const pv = Number(variante_precio_venta);
            if (isNaN(pv) || pv < 0) { res.status(400).json({ message: "variante_precio_venta debe ser >= 0" }); return; }
            variante.variante_precio_venta = round2(pv);
        }
        if (variante_precio_compra !== undefined) {
            const pc = variante_precio_compra === null ? null : Number(variante_precio_compra);
            if (pc !== null && (isNaN(pc) || pc < 0)) { res.status(400).json({ message: "variante_precio_compra debe ser >= 0" }); return; }
            variante.variante_precio_compra = pc !== null ? round2(pc) : null;
        }
        if (variante_stock_minimo !== undefined) {
            const sm = variante_stock_minimo === null ? null : Number(variante_stock_minimo);
            if (sm !== null && (!Number.isInteger(sm) || sm < 0)) { res.status(400).json({ message: "variante_stock_minimo debe ser entero >= 0" }); return; }
            variante.variante_stock_minimo = sm;
        }

        const result = await varianteRepo().save(variante);
        res.json(result);
    } catch (error: any) {
        console.error("ERROR ACTUALIZANDO VARIANTE:", error);
        if (getOraCode(error) === "ORA-00001")
            { res.status(400).json({ message: "El SKU ya existe, o la combinación producto/talla/color está repetida" }); return; }
        res.status(500).json({ message: "Error actualizando variante" });
    }
};

// DELETE /variante/:id — borrado lógico de variante
export const deleteVariante = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID de variante inválido" }); return; }
        const variante = await varianteRepo().findOneBy({ variante_id: id });
        if (!variante) { res.status(404).json({ message: "Variante no encontrada" }); return; }
        variante.variante_activo = 0;
        await varianteRepo().save(variante);
        res.json({ ok: true, message: "Variante desactivada correctamente" });
    } catch (error) {
        console.error("ERROR DESACTIVANDO VARIANTE:", error);
        res.status(500).json({ message: "Error eliminando variante" });
    }
};
