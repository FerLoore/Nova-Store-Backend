import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";

// GET /nova-permiso - Obtener todos los permisos del sistema
export const getPermisos = async (_req: Request, res: Response) => {
    try {
        const rows = await AppDataSource.query(
            `SELECT PERM_PERMISO AS "permiso_id",
                    PERM_CODIGO AS "permiso_codigo",
                    PERM_DESCRIPCION AS "permiso_descripcion"
             FROM NOVA_PERMISO
             ORDER BY PERM_PERMISO ASC`
        );
        return res.json(rows);
    } catch (error) {
        console.error("ERROR OBTENIENDO PERMISOS:", error);
        return res.status(500).json({ message: "Error al obtener permisos" });
    }
};

// GET /nova-permiso/rol/:rolId - Obtener permisos de un rol específico
export const getPermisosByRol = async (req: Request, res: Response) => {
    try {
        const { rolId } = req.params;
        const rows = await AppDataSource.query(
            `SELECT p.PERM_PERMISO AS "permiso_id",
                    p.PERM_CODIGO AS "permiso_codigo",
                    p.PERM_DESCRIPCION AS "permiso_descripcion"
             FROM NOVA_ROL_PERMISO rp
             JOIN NOVA_PERMISO p ON rp.PERM_PERMISO = p.PERM_PERMISO
             WHERE rp.ROL_ROL = :1
             ORDER BY p.PERM_PERMISO ASC`,
            [Number(rolId)]
        );
        return res.json(rows);
    } catch (error) {
        console.error("ERROR OBTENIENDO PERMISOS DEL ROL:", error);
        return res.status(500).json({ message: "Error al obtener permisos del rol" });
    }
};

// PUT /nova-permiso/rol/:rolId - Asignar múltiples permisos a un rol
export const setPermisosRol = async (req: Request, res: Response) => {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        const { rolId } = req.params;
        const { permiso_ids } = req.body;

        if (!Array.isArray(permiso_ids)) {
            return res.status(400).json({ message: "El campo permiso_ids debe ser un arreglo de IDs" });
        }

        const numericRolId = Number(rolId);

        // 1. Eliminar asignaciones previas del rol
        await queryRunner.query(
            `DELETE FROM NOVA_ROL_PERMISO WHERE ROL_ROL = :1`,
            [numericRolId]
        );

        // 2. Insertar cada nuevo permiso asignado
        for (const permId of permiso_ids) {
            await queryRunner.query(
                `INSERT INTO NOVA_ROL_PERMISO (ROL_ROL, PERM_PERMISO) VALUES (:1, :2)`,
                [numericRolId, Number(permId)]
            );
        }

        await queryRunner.commitTransaction();

        return res.json({
            message: "Permisos actualizados exitosamente",
            rol_id: numericRolId,
            permisos_asignados: permiso_ids.length
        });
    } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error("ERROR ASIGNANDO PERMISOS AL ROL:", error);
        return res.status(500).json({ message: "Error al actualizar permisos del rol" });
    } finally {
        await queryRunner.release();
    }
};
