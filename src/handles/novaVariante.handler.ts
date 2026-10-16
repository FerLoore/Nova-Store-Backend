import { Request, Response } from "express";
import { Not } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { NovaProducto } from "../entities/novaProducto";
import { NovaVariante } from "../entities/novaVariante";
import { parseIntId, trimOrNull, round2, getOraCode } from "../utils/validation";

const productoRepo = () => AppDataSource.getRepository(NovaProducto);
const varianteRepo = () => AppDataSource.getRepository(NovaVariante);

/**
 * Valida y normaliza los campos de una variante
 */
export function validateVarianteInput(v: any) {
    const errors: string[] = [];

    const talla = trimOrNull(v.variante_talla ?? v.VAR_TALLA);
    if (!talla) errors.push("variante_talla es obligatorio");
    if (talla && talla.length > 10) errors.push("variante_talla no puede exceder 10 caracteres");

    const color = trimOrNull(v.variante_color ?? v.VAR_COLOR);
    if (!color) errors.push("variante_color es obligatorio");
    if (color && color.length > 30) errors.push("variante_color no puede exceder 30 caracteres");

    const sku = trimOrNull(v.variante_sku ?? v.VAR_SKU);
    if (!sku) errors.push("variante_sku es obligatorio");
    if (sku && sku.length > 50) errors.push("variante_sku no puede exceder 50 caracteres");

    const rawPv = v.variante_precio_venta ?? v.VAR_PRECIO_VENTA;
    if (rawPv === undefined || rawPv === null || rawPv === "") {
        errors.push("variante_precio_venta es obligatorio");
    }
    const pv = Number(rawPv);
    if (isNaN(pv) || pv < 0) errors.push("variante_precio_venta debe ser un número >= 0");

    const rawPc = v.variante_precio_compra ?? v.VAR_PRECIO_COMPRA;
    const pc = rawPc !== undefined && rawPc !== null && rawPc !== "" ? Number(rawPc) : null;
    if (pc !== null && (isNaN(pc) || pc < 0)) errors.push("variante_precio_compra debe ser un número >= 0");

    const rawSm = v.variante_stock_minimo ?? v.VAR_STOCK_MINIMO;
    const sm = rawSm !== undefined && rawSm !== null && rawSm !== "" ? Number(rawSm) : 0;
    if (sm !== null && (!Number.isInteger(sm) || sm < 0)) errors.push("variante_stock_minimo debe ser un número entero >= 0");

    return {
        isValid: errors.length === 0,
        errors,
        data: {
            variante_talla:         talla ? talla.toUpperCase() : "",
            variante_color:         color ?? "",
            variante_sku:           sku ? sku.toUpperCase() : "",
            variante_precio_venta:  round2(pv),
            variante_precio_compra: pc !== null ? round2(pc) : null,
            variante_stock_minimo:  sm ?? 0,
            variante_activo:        1
        }
    };
}

/**
 * Obtiene el ID del producto desde req.params, req.query o req.body
 */
function extractProductoId(req: Request): number | null {
    if (req.params.productoId) return parseIntId(req.params.productoId);
    if (req.params.id && req.params.varianteId) return parseIntId(req.params.id);
    if (req.query.producto_id) return parseIntId(req.query.producto_id as string);
    if (req.query.PRODU_PRODUCTO) return parseIntId(req.query.PRODU_PRODUCTO as string);
    if (req.body?.producto_id) return parseIntId(req.body.producto_id);
    if (req.body?.PRODU_PRODUCTO) return parseIntId(req.body.PRODU_PRODUCTO);
    return null;
}

/**
 * Obtiene el ID de la variante desde req.params o req.body
 */
function extractVarianteId(req: Request): number | null {
    if (req.params.varianteId) return parseIntId(req.params.varianteId);
    if (req.params.id && !req.params.varianteId) return parseIntId(req.params.id);
    if (req.body?.variante_id) return parseIntId(req.body.variante_id);
    if (req.body?.VAR_VARIANTE) return parseIntId(req.body.VAR_VARIANTE);
    return null;
}

/**
 * GET /nova-variante — Listar variantes filtrando por producto (query param producto_id obligatorio)
 */
export const getVariantes = async (req: Request, res: Response): Promise<void> => {
    try {
        const productoId = extractProductoId(req);
        if (!productoId) {
            res.status(400).json({ message: "El parámetro producto_id es obligatorio para listar sus variantes" });
            return;
        }

        const producto = await productoRepo().findOneBy({ producto_id: productoId });
        if (!producto) {
            res.status(404).json({ message: "Producto no encontrado" });
            return;
        }

        const incluirInactivos = req.query.incluir_inactivos === "true";
        const whereClause: any = { producto: { producto_id: productoId } };
        if (!incluirInactivos) {
            whereClause.variante_activo = 1;
        }

        const variantes = await varianteRepo().find({
            where: whereClause,
            order: { variante_id: "ASC" }
        });

        res.json(variantes);
    } catch (error) {
        console.error("ERROR LISTANDO VARIANTES:", error);
        res.status(500).json({ message: "Error al obtener las variantes del producto" });
    }
};

/**
 * GET /nova-producto/:id/variantes o /nova-variante/producto/:productoId
 * Listar variantes de un producto específico
 */
export const getVariantesByProducto = async (req: Request, res: Response): Promise<void> => {
    try {
        const productoId = parseIntId(req.params.productoId || req.params.id);
        if (!productoId) {
            res.status(400).json({ message: "ID de producto inválido" });
            return;
        }

        const producto = await productoRepo().findOneBy({ producto_id: productoId });
        if (!producto) {
            res.status(404).json({ message: "Producto no encontrado" });
            return;
        }

        const incluirInactivos = req.query.incluir_inactivos === "true";
        const whereClause: any = { producto: { producto_id: productoId } };
        if (!incluirInactivos) {
            whereClause.variante_activo = 1;
        }

        const variantes = await varianteRepo().find({
            where: whereClause,
            order: { variante_id: "ASC" }
        });

        res.json(variantes);
    } catch (error) {
        console.error("ERROR BUSCANDO VARIANTES POR PRODUCTO:", error);
        res.status(500).json({ message: "Error al buscar variantes del producto" });
    }
};

/**
 * POST /nova-producto/:id/variantes o POST /nova-variante
 * Crear variante asociada siempre a PRODU_PRODUCTO con validación previa de SKU duplicado
 */
export const createVariante = async (req: Request, res: Response): Promise<void> => {
    try {
        const productoId = extractProductoId(req) || parseIntId(req.params.id);
        if (!productoId) {
            res.status(400).json({ message: "El ID del producto (PRODU_PRODUCTO) es obligatorio" });
            return;
        }

        const producto = await productoRepo().findOneBy({ producto_id: productoId, producto_activo: 1 });
        if (!producto) {
            res.status(404).json({ message: "Producto no encontrado o se encuentra inactivo" });
            return;
        }

        const { isValid, errors, data } = validateVarianteInput(req.body);
        if (!isValid) {
            res.status(400).json({ message: errors.join("; ") });
            return;
        }

        // VALIDACIÓN DE SKU DUPLICADO ANTES DE GUARDAR
        const existingSku = await varianteRepo().findOne({
            where: { variante_sku: data.variante_sku }
        });
        if (existingSku) {
            res.status(400).json({ message: `El SKU "${data.variante_sku}" ya se encuentra registrado en el sistema` });
            return;
        }

        // Validación de combinación talla + color para el mismo producto activo
        const existingCombo = await varianteRepo().findOne({
            where: {
                producto: { producto_id: productoId },
                variante_talla: data.variante_talla,
                variante_color: data.variante_color,
                variante_activo: 1
            }
        });
        if (existingCombo) {
            res.status(400).json({
                message: `Ya existe una variante activa con talla "${data.variante_talla}" y color "${data.variante_color}" para este producto`
            });
            return;
        }

        const variante = varianteRepo().create({
            ...data,
            producto,
            producto_id: producto.producto_id
        });

        const saved = await varianteRepo().save(variante);
        res.status(201).json(saved);
    } catch (error: any) {
        console.error("ERROR CREANDO VARIANTE:", error);
        if (getOraCode(error) === "ORA-00001") {
            res.status(400).json({ message: "El SKU ya existe o la combinación producto/talla/color está repetida" });
            return;
        }
        res.status(500).json({ message: "Error al guardar la variante" });
    }
};

/**
 * PUT /nova-producto/:id/variantes/:varianteId, PUT /nova-variante/:id, o PUT /nova-producto/variante/:id
 * Actualizar variante filtrando siempre por PRODU_PRODUCTO y validando SKU duplicado
 */
export const updateVariante = async (req: Request, res: Response): Promise<void> => {
    try {
        const varianteId = extractVarianteId(req);
        if (!varianteId) {
            res.status(400).json({ message: "ID de variante inválido" });
            return;
        }

        const productoId = extractProductoId(req);

        // Buscar la variante. Si se envió producto_id, filtrar estrictamente por PRODU_PRODUCTO
        let variante: NovaVariante | null = null;
        if (productoId) {
            variante = await varianteRepo().findOne({
                where: {
                    variante_id: varianteId,
                    producto: { producto_id: productoId }
                },
                relations: { producto: true }
            });
        } else {
            variante = await varianteRepo().findOne({
                where: { variante_id: varianteId },
                relations: { producto: true }
            });
        }

        if (!variante) {
            res.status(404).json({
                message: productoId
                    ? "Variante no encontrada para el producto especificado"
                    : "Variante no encontrada"
            });
            return;
        }

        const effectiveProductoId = variante.producto?.producto_id || variante.producto_id || productoId;

        const {
            variante_talla,
            VAR_TALLA,
            variante_color,
            VAR_COLOR,
            variante_sku,
            VAR_SKU,
            variante_precio_compra,
            VAR_PRECIO_COMPRA,
            variante_precio_venta,
            VAR_PRECIO_VENTA,
            variante_stock_minimo,
            VAR_STOCK_MINIMO,
            variante_activo,
            VAR_ACTIVO
        } = req.body;

        const inTalla = variante_talla ?? VAR_TALLA;
        const inColor = variante_color ?? VAR_COLOR;
        const inSku = variante_sku ?? VAR_SKU;
        const inPc = variante_precio_compra !== undefined ? variante_precio_compra : VAR_PRECIO_COMPRA;
        const inPv = variante_precio_venta !== undefined ? variante_precio_venta : VAR_PRECIO_VENTA;
        const inSm = variante_stock_minimo !== undefined ? variante_stock_minimo : VAR_STOCK_MINIMO;
        const inActivo = variante_activo !== undefined ? variante_activo : VAR_ACTIVO;

        // Validar y actualizar SKU si viene en el payload
        if (inSku !== undefined) {
            const skuClean = trimOrNull(inSku)?.toUpperCase();
            if (!skuClean) {
                res.status(400).json({ message: "variante_sku no puede quedar vacío" });
                return;
            }
            if (skuClean.length > 50) {
                res.status(400).json({ message: "variante_sku máximo 50 caracteres" });
                return;
            }

            // VALIDACIÓN PREVIA: Verificar que ningún otro registro tenga este SKU
            const existingSku = await varianteRepo().findOne({
                where: {
                    variante_sku: skuClean,
                    variante_id: Not(varianteId)
                }
            });
            if (existingSku) {
                res.status(400).json({ message: `El SKU "${skuClean}" ya está en uso por otra variante` });
                return;
            }
            variante.variante_sku = skuClean;
        }

        // Validar y actualizar Talla / Color
        const nextTalla = inTalla !== undefined ? trimOrNull(inTalla)?.toUpperCase() : variante.variante_talla;
        const nextColor = inColor !== undefined ? trimOrNull(inColor) : variante.variante_color;

        if (inTalla !== undefined) {
            if (!nextTalla) {
                res.status(400).json({ message: "variante_talla no puede quedar vacía" });
                return;
            }
            if (nextTalla.length > 10) {
                res.status(400).json({ message: "variante_talla máximo 10 caracteres" });
                return;
            }
            variante.variante_talla = nextTalla;
        }

        if (inColor !== undefined) {
            if (!nextColor) {
                res.status(400).json({ message: "variante_color no puede quedar vacío" });
                return;
            }
            if (nextColor.length > 30) {
                res.status(400).json({ message: "variante_color máximo 30 caracteres" });
                return;
            }
            variante.variante_color = nextColor;
        }

        // Validar duplicado de combo talla + color si cambiaron
        if ((inTalla !== undefined || inColor !== undefined) && effectiveProductoId) {
            const comboDuplicado = await varianteRepo().findOne({
                where: {
                    producto: { producto_id: effectiveProductoId },
                    variante_talla: variante.variante_talla,
                    variante_color: variante.variante_color,
                    variante_activo: 1,
                    variante_id: Not(varianteId)
                }
            });
            if (comboDuplicado) {
                res.status(400).json({
                    message: `Ya existe una variante activa con talla "${variante.variante_talla}" y color "${variante.variante_color}" para este producto`
                });
                return;
            }
        }

        // Validar y actualizar Precio de Venta
        if (inPv !== undefined) {
            const pv = Number(inPv);
            if (isNaN(pv) || pv < 0) {
                res.status(400).json({ message: "variante_precio_venta debe ser un número >= 0" });
                return;
            }
            variante.variante_precio_venta = round2(pv);
        }

        // Validar y actualizar Precio de Compra
        if (inPc !== undefined) {
            const pc = inPc === null || inPc === "" ? null : Number(inPc);
            if (pc !== null && (isNaN(pc) || pc < 0)) {
                res.status(400).json({ message: "variante_precio_compra debe ser un número >= 0" });
                return;
            }
            variante.variante_precio_compra = pc !== null ? round2(pc) : null;
        }

        // Validar y actualizar Stock Mínimo
        if (inSm !== undefined) {
            const sm = inSm === null || inSm === "" ? 0 : Number(inSm);
            if (!Number.isInteger(sm) || sm < 0) {
                res.status(400).json({ message: "variante_stock_minimo debe ser un número entero >= 0" });
                return;
            }
            variante.variante_stock_minimo = sm;
        }

        // Actualizar Activo si se especifica
        if (inActivo !== undefined) {
            const act = Number(inActivo);
            if (act !== 0 && act !== 1) {
                res.status(400).json({ message: "variante_activo debe ser 0 o 1" });
                return;
            }
            variante.variante_activo = act;
        }

        const saved = await varianteRepo().save(variante);
        res.json(saved);
    } catch (error: any) {
        console.error("ERROR ACTUALIZANDO VARIANTE:", error);
        if (getOraCode(error) === "ORA-00001") {
            res.status(400).json({ message: "El SKU ya existe o la combinación producto/talla/color está repetida" });
            return;
        }
        res.status(500).json({ message: "Error al actualizar la variante" });
    }
};

/**
 * DELETE /nova-producto/:id/variantes/:varianteId, DELETE /nova-variante/:id, o DELETE /nova-producto/variante/:id
 * Desactivar variante (VAR_ACTIVO = 0) filtrando siempre por PRODU_PRODUCTO
 */
export const deleteVariante = async (req: Request, res: Response): Promise<void> => {
    try {
        const varianteId = extractVarianteId(req);
        if (!varianteId) {
            res.status(400).json({ message: "ID de variante inválido" });
            return;
        }

        const productoId = extractProductoId(req);

        let variante: NovaVariante | null = null;
        if (productoId) {
            variante = await varianteRepo().findOne({
                where: {
                    variante_id: varianteId,
                    producto: { producto_id: productoId }
                }
            });
        } else {
            variante = await varianteRepo().findOne({
                where: { variante_id: varianteId }
            });
        }

        if (!variante) {
            res.status(404).json({
                message: productoId
                    ? "Variante no encontrada para el producto especificado"
                    : "Variante no encontrada"
            });
            return;
        }

        variante.variante_activo = 0;
        await varianteRepo().save(variante);

        res.json({
            ok: true,
            message: "Variante desactivada correctamente",
            variante_id: varianteId
        });
    } catch (error) {
        console.error("ERROR DESACTIVANDO VARIANTE:", error);
        res.status(500).json({ message: "Error al desactivar la variante" });
    }
};
