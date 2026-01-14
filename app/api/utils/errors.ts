import { NextResponse } from "next/server";

/**
 * Maneja errores de forma segura sin exponer información sensible en producción
 */
export function handleError(err: any, defaultMessage: string = "Error procesando la solicitud"): NextResponse {
  const isDevelopment = process.env.NODE_ENV === "development";
  
  // En desarrollo, mostrar detalles del error para debugging
  // En producción, solo mostrar mensaje genérico
  const errorMessage = isDevelopment 
    ? (err?.message || defaultMessage)
    : defaultMessage;

  return NextResponse.json(
    { error: errorMessage },
    { status: 500 }
  );
}

/**
 * Crea respuesta de error con código de estado específico
 */
export function createErrorResponse(message: string, status: number = 400): NextResponse {
  return NextResponse.json(
    { error: message },
    { status }
  );
}
