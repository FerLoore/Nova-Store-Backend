import { EntityManager } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { NovaAuditoria } from "../entities/novaAuditoria";

export type AccionAuditoria = "INSERT" | "UPDATE" | "DELETE";

export interface RegistrarAuditoriaOptions {
    tabla: string;
    accion: AccionAuditoria | string;
    campo?: string | null;
    valorAntes?: string | null;
    valorDespues?: string | null;
    usuarioId?: number | null;
    manager?: EntityManager;
}

const ACCIONES_VALIDAS: Record<string, AccionAuditoria> = {
    INSERT: "INSERT",
    UPDATE: "UPDATE",
    DELETE: "DELETE"
};

/**
 * Registra una entrada en la tabla NOVA_AUDITORIA.
 * Respeta la restricción de base de datos AUDI_ACCION IN ('INSERT','UPDATE','DELETE').
 * Si se pasa un `manager`, participa de la transacción activa;
 * de lo contrario usa el repositorio por defecto.
 * Nunca lanza excepciones para no interrumpir el flujo del negocio si falla la auditoría.
 */
export async function registrarAuditoria(opts: RegistrarAuditoriaOptions): Promise<NovaAuditoria | null> {
    try {
        const repo = opts.manager
            ? opts.manager.getRepository(NovaAuditoria)
            : AppDataSource.getRepository(NovaAuditoria);

        const accionNormalizada = ACCIONES_VALIDAS[String(opts.accion).toUpperCase()] ?? "UPDATE";

        const registro = repo.create({
            auditoria_tabla: opts.tabla.slice(0, 50).toUpperCase(),
            auditoria_accion: accionNormalizada,
            auditoria_campo: opts.campo ? opts.campo.slice(0, 50) : null,
            auditoria_valor_antes: opts.valorAntes ? String(opts.valorAntes).slice(0, 4000) : null,
            auditoria_valor_despues: opts.valorDespues ? String(opts.valorDespues).slice(0, 4000) : null,
            usuario_id: opts.usuarioId ?? null,
            auditoria_fecha: new Date(),
        });

        return await repo.save(registro);
    } catch (error) {
        console.error("⚠️ Error registrando auditoría en", opts.tabla, ":", error);
        return null;
    }
}
