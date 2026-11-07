import { z } from "zod";
/** Error controlado: el mensaje es seguro para mostrarse al usuario */
export class HttpError extends Error {
    status;
    code;
    details;
    constructor(status, code, message, details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }
}
export const asyncH = (fn) => (req, res, next) => {
    fn(req, res, next).catch(next);
};
/** Valida el cuerpo con un esquema zod estricto (campos desconocidos = rechazo) */
export function parseBody(schema, body) {
    const r = schema.safeParse(body);
    if (!r.success) {
        throw new HttpError(400, "VALIDACION", "Revisa los datos del formulario.", r.error.issues.map((i) => ({ campo: i.path.join("."), error: i.message })));
    }
    return r.data;
}
/** Texto seguro: sin caracteres de control, recortado */
export const texto = (min, max) => z
    .string()
    .transform((s) => s.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim())
    .pipe(z.string().min(min, `mínimo ${min} caracteres`).max(max, `máximo ${max} caracteres`));
export const celularCO = z
    .string()
    .transform((s) => {
    let d = s.replace(/\D/g, "");
    if (d.length === 12 && d.startsWith("57"))
        d = d.slice(2);
    return d;
})
    .pipe(z.string().regex(/^3\d{9}$/, "celular colombiano de 10 dígitos (3XXXXXXXXX)"));
