/** Normaliza un parámetro de Express v5 que puede ser string | string[] a string. */
export function paramStr(value: string | string[]): string {
    return Array.isArray(value) ? value[0] : value;
}

/** Valida que el ID del parámetro sea un entero positivo. Acepta string | string[] (Express v5). */
export function parseIntId(value: string | string[]): number | null {
    const s = Array.isArray(value) ? value[0] : value;
    const n = Number(s);
    if (!Number.isInteger(n) || n < 1) return null;
    return n;
}

/** Valida formato de email básico y longitud máxima. */
export function isValidEmail(email: string, maxLen = 120): boolean {
    if (!email || email.length > maxLen) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Valida formato de teléfono: solo dígitos, espacios, +, -, (, ) entre 7 y 30 caracteres. */
export function isValidPhone(phone: string): boolean {
    return /^[\d\s+\-()\u0028\u0029]{7,30}$/.test(phone);
}

/** Recorta el string y convierte "" en null. */
export function trimOrNull(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    const s = String(value).trim();
    return s === "" ? null : s;
}

/** Redondea a 2 decimales. */
export function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

/** Detecta errores de Oracle en distintas ubicaciones del error. */
export function getOraCode(error: any): string | null {
    return error?.code ?? error?.driverError?.code ?? null;
}
