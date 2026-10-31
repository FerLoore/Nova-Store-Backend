import { Request, Response } from "express";
import { In } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { NovaPermiso } from "../entities/novaPermiso";
import { NovaRol } from "../entities/novaRol";
import { NovaRolModulo, MODULOS_VALIDOS, NivelModulo, NombreModulo } from "../entities/novaRolModulo";
import { parseIntId } from "../utils/validation";
import { invalidateRolCache } from "../middlewares/auth";

const permisoRepo  = () => AppDataSource.getRepository(NovaPermiso);
const rolRepo      = () => AppDataSource.getRepository(NovaRol);
const rolModRepo   = () => AppDataSource.getRepository(NovaRolModulo);

const NIVELES_VALIDOS: NivelModulo[] = ["NINGUNO", "LECTURA", "ESCRITURA"];

// ─── Endpoints LEGADOS (catálogo de permisos atómicos) ──────────────────────

// GET /nova-permiso — catálogo completo
export const getPermisos = async (req: Request, res: Response): Promise<void> => {
    try {
        const permisos = await permisoRepo().find({ order: { permiso_codigo: "ASC" } });
        res.json(permisos);
    } catch (error) {
        console.error("ERROR OBTENIENDO PERMISOS:", error);
        res.status(500).json({ message: "Error obteniendo permisos" });
    }
};

// GET /nova-permiso/rol/:id — permisos atómicos del rol (legado)
export const getPermisosByRol = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID de rol inválido" }); return; }

        const rol = await rolRepo().findOne({
            where: { rol_id: id },
            relations: { permisos: true }
        });
        if (!rol) { res.status(404).json({ message: "Rol no encontrado" }); return; }

        res.json(rol.permisos ?? []);
    } catch (error) {
        console.error("ERROR OBTENIENDO PERMISOS DEL ROL:", error);
        res.status(500).json({ message: "Error obteniendo permisos del rol" });
    }
};

// PUT /nova-permiso/rol/:id — reemplaza permisos atómicos del rol (legado)
export const setPermisosRol = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID de rol inválido" }); return; }

        const { permiso_ids } = req.body;
        if (!Array.isArray(permiso_ids)) {
            res.status(400).json({ message: "permiso_ids debe ser un arreglo de números" });
            return;
        }

        const ids: number[] = permiso_ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);

        const permisos = await permisoRepo().findBy({ permiso_id: In(ids) });
        if (permisos.length !== ids.length) {
            res.status(400).json({ message: "Uno o más permisos no existen" });
            return;
        }

        const rol = await rolRepo().findOne({
            where: { rol_id: id },
            relations: { permisos: true }
        });
        if (!rol) { res.status(404).json({ message: "Rol no encontrado" }); return; }

        rol.permisos = permisos;
        await rolRepo().save(rol);

        res.json({ ok: true, message: "Permisos del rol actualizados", permisos });
    } catch (error) {
        console.error("ERROR ACTUALIZANDO PERMISOS DEL ROL:", error);
        res.status(500).json({ message: "Error actualizando permisos del rol" });
    }
};

// ─── Endpoints NUEVOS: permisos por módulo ───────────────────────────────────

/**
 * GET /nova-permiso/rol/:id/modulos
 * Devuelve un mapa { MODULO: nivel } con los 11 módulos siempre presentes.
 * Para ADMINISTRADOR (rol_id=1) devuelve todo en ESCRITURA.
 */
export const getPermisosModulo = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID de rol inválido" }); return; }

        const rol = await rolRepo().findOneBy({ rol_id: id });
        if (!rol) { res.status(404).json({ message: "Rol no encontrado" }); return; }

        // Mapa base con NINGUNO
        const mapa: Record<string, NivelModulo> = {};
        for (const mod of MODULOS_VALIDOS) mapa[mod] = "NINGUNO";

        // ADMINISTRADOR → todo ESCRITURA
        if (id === 1) {
            for (const mod of MODULOS_VALIDOS) mapa[mod] = "ESCRITURA";
            res.json(mapa);
            return;
        }

        const filas = await rolModRepo().find({ where: { rmo_rol: id } });
        for (const fila of filas) {
            if (MODULOS_VALIDOS.includes(fila.rmo_modulo as NombreModulo)) {
                mapa[fila.rmo_modulo] = fila.rmo_nivel;
            }
        }

        res.json(mapa);
    } catch (error) {
        console.error("ERROR OBTENIENDO PERMISOS MODULO:", error);
        res.status(500).json({ message: "Error obteniendo permisos de módulo" });
    }
};

/**
 * PUT /nova-permiso/rol/:id/modulos
 * Body: { modulos: { MODULO: nivel, ... } }
 * Upsert de las 11 filas del rol en NOVA_ROL_MODULO dentro de una transacción.
 * Protecciones:
 *  - No permite degradar ADMINISTRADOR (rol_id=1).
 *  - No permite que el usuario quitarse a sí mismo el acceso a ROLES.
 */
export const setPermisosModulo = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseIntId(req.params.id);
        if (!id) { res.status(400).json({ message: "ID de rol inválido" }); return; }

        // Impedir editar ADMINISTRADOR
        if (id === 1) {
            res.status(403).json({ message: "No se puede modificar los permisos del rol ADMINISTRADOR" });
            return;
        }

        const rol = await rolRepo().findOneBy({ rol_id: id });
        if (!rol) { res.status(404).json({ message: "Rol no encontrado" }); return; }

        const { modulos } = req.body as { modulos: Record<string, string> };
        if (!modulos || typeof modulos !== "object") {
            res.status(400).json({ message: "Se espera un objeto 'modulos' con los 11 módulos y sus niveles" });
            return;
        }

        // Validar que todos los módulos y niveles sean válidos
        for (const [mod, nivel] of Object.entries(modulos)) {
            if (!MODULOS_VALIDOS.includes(mod as NombreModulo)) {
                res.status(400).json({ message: `Módulo inválido: ${mod}` });
                return;
            }
            if (!NIVELES_VALIDOS.includes(nivel as NivelModulo)) {
                res.status(400).json({ message: `Nivel inválido para ${mod}: ${nivel}` });
                return;
            }
        }

        // Impedir que el usuario se quite acceso a ROLES
        const usuarioActual = req.user;
        if (usuarioActual && usuarioActual.rol_id === id) {
            const nivelRoles = modulos["ROLES"] as NivelModulo;
            if (nivelRoles === "NINGUNO") {
                res.status(400).json({ message: "No puedes quitarte el acceso al módulo ROLES" });
                return;
            }
        }

        // Upsert dentro de una transacción
        await AppDataSource.transaction(async (em) => {
            const repo = em.getRepository(NovaRolModulo);
            for (const mod of MODULOS_VALIDOS) {
                const nivel = (modulos[mod] as NivelModulo) ?? "NINGUNO";
                await repo.upsert(
                    { rmo_rol: id, rmo_modulo: mod, rmo_nivel: nivel },
                    ["rmo_rol", "rmo_modulo"]
                );
            }
        });

        // Invalidar caché del rol
        invalidateRolCache(id);

        res.json({ ok: true, message: "Permisos de módulo actualizados", rol_id: id });
    } catch (error) {
        console.error("ERROR ACTUALIZANDO PERMISOS MODULO:", error);
        res.status(500).json({ message: "Error actualizando permisos de módulo" });
    }
};
