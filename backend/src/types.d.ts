import "express";

declare global {
  namespace Express {
    interface Request {
      /** Sesión autenticada (solo existe si la cookie de sesión es válida) */
      session?: { idHash: string; userId: string; rol: "mayorista" | "admin"; nombre: string; usuario: string };
      /** Cuerpo crudo (solo en el webhook, para verificar firmas) */
      rawBody?: Buffer;
    }
  }
}
export {};
