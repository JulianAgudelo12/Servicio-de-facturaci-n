/**
 * Funciones de validación para inputs de la API
 * Previene ataques de inyección y valida formato de datos
 */

const MAX_STRING_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_MONEY_VALUE = 1_000_000_000; // 1B (ajusta si necesitas más)
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/**
 * Valida formato de fecha YYYY-MM-DD
 */
export function validateDate(dateStr: string): { valid: boolean; error?: string } {
  if (!dateStr || typeof dateStr !== "string") {
    return { valid: false, error: "La fecha es requerida" };
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return { valid: false, error: "Formato de fecha inválido. Debe ser YYYY-MM-DD" };
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return { valid: false, error: "Fecha inválida" };
  }

  return { valid: true };
}

/**
 * Valida formato de hora HH:mm o HH:mm:ss
 */
export function validateTime(timeStr: string): { valid: boolean; error?: string } {
  if (!timeStr || typeof timeStr !== "string") {
    return { valid: false, error: "La hora es requerida" };
  }

  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9](:([0-5][0-9]))?$/;
  if (!timeRegex.test(timeStr)) {
    return { valid: false, error: "Formato de hora inválido. Debe ser HH:mm o HH:mm:ss" };
  }

  return { valid: true };
}

/**
 * Valida formato de teléfono (permite números, espacios, guiones, paréntesis, +)
 */
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  if (!phone || typeof phone !== "string") {
    return { valid: false, error: "El teléfono es requerido" };
  }

  if (phone.length > 50) {
    return { valid: false, error: "El teléfono es demasiado largo" };
  }

  // Permite números, espacios, guiones, paréntesis, +
  const phoneRegex = /^[0-9+\-\s()]+$/;
  if (!phoneRegex.test(phone)) {
    return { valid: false, error: "Formato de teléfono inválido" };
  }

  return { valid: true };
}

/**
 * Valida string genérico con límite de longitud
 */
export function validateString(
  value: string,
  fieldName: string,
  maxLength: number = MAX_STRING_LENGTH,
  required: boolean = true
): { valid: boolean; error?: string } {
  if (required && (!value || typeof value !== "string" || value.trim().length === 0)) {
    return { valid: false, error: `${fieldName} es requerido` };
  }

  if (value && value.length > maxLength) {
    return { valid: false, error: `${fieldName} es demasiado largo (máximo ${maxLength} caracteres)` };
  }

  return { valid: true };
}

/**
 * Valida estado del servicio
 */
export function validateEstado(estado: string): { valid: boolean; error?: string } {
  const validEstados = ["Pendiente", "En fabricación", "Garantía", "Entregado"];
  if (!validEstados.includes(estado)) {
    return { valid: false, error: `Estado inválido. Debe ser uno de: ${validEstados.join(", ")}` };
  }
  return { valid: true };
}

/**
 * Valida prioridad del servicio
 */
export function validatePrioridad(prioridad: string): { valid: boolean; error?: string } {
  const validPrioridades = ["24 horas", "48 horas", "72 horas", "Normal"];
  if (!validPrioridades.includes(prioridad)) {
    return { valid: false, error: `Prioridad inválida. Debe ser una de: ${validPrioridades.join(", ")}` };
  }
  return { valid: true };
}

/**
 * Valida material del servicio
 */
export function validateMaterial(material: string): { valid: boolean; error?: string } {
  const validMateriales = ["Oro de 14k", "Oro 18k", "Plata 925", "Plata 950"];
  if (!validMateriales.includes(material)) {
    return { valid: false, error: `Material inválido. Debe ser uno de: ${validMateriales.join(", ")}` };
  }
  return { valid: true };
}

/**
 * Valida valores monetarios (abono / costo final).
 * Acepta números positivos (incluye decimales). Soporta "," como decimal.
 */
export function validateMoney(
  value: string,
  fieldName: string,
  required: boolean = false
): { valid: boolean; error?: string } {
  const raw = String(value ?? "").trim();
  if (!raw) {
    if (required) return { valid: false, error: `${fieldName} es requerido` };
    return { valid: true };
  }

  const normalized = raw.replace(/\s+/g, "").replace(",", ".");
  const num = Number(normalized);

  if (!Number.isFinite(num)) {
    return { valid: false, error: `${fieldName} debe ser un número válido` };
  }
  if (num < 0) {
    return { valid: false, error: `${fieldName} no puede ser negativo` };
  }
  if (num > MAX_MONEY_VALUE) {
    return { valid: false, error: `${fieldName} es demasiado alto` };
  }

  return { valid: true };
}

/**
 * Valida archivo subido
 */
export function validateFile(file: File | null): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: true }; // Archivo es opcional
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `Archivo demasiado grande. Máximo ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de archivo no permitido. Permitidos: PDF, PNG, JPG, DOC, DOCX`,
    };
  }

  return { valid: true };
}

/**
 * Sanitiza string para prevenir inyección XSS básica
 */
export function sanitizeString(input: string): string {
  return String(input)
    .trim()
    .replace(/[<>]/g, "") // Elimina < y > básicos
    .slice(0, MAX_STRING_LENGTH);
}
