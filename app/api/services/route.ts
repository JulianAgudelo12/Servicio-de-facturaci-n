import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth";
import {
  validateDate,
  validateTime,
  validatePhone,
  validateString,
  validateEstado,
  validatePrioridad,
  validateMaterial,
  validateMoney,
  validateFile,
  sanitizeString,
} from "../utils/validators";
import { handleError, createErrorResponse } from "../utils/errors";

export const runtime = "nodejs";

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

/**
 * GET → Listar + buscar + filtrar servicios
 * 
 * ✅ SEGURIDAD IMPLEMENTADA:
 * - Autenticación requerida
 * - Validación de parámetros de consulta
 * - Manejo seguro de errores
 * 
 * Query params soportados:
 * - q=texto (busca en varios campos)
 * - estado=Pendiente|En trabajo|Cerrado
 * - maquina=...
 * - prioridad=24 horas|48 horas|72 horas|Normal
 * - agente=...
 * - almacen=...
 * - desde=YYYY-MM-DD
 * - hasta=YYYY-MM-DD
 * - limit=number (default 200, max 500)
 */
export async function GET(req: Request) {
  try {
    // ✅ 1. VERIFICAR AUTENTICACIÓN
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    // ✅ 2. Obtener cliente de Supabase con SERVICE_ROLE_KEY (necesario para operaciones administrativas)
    // Nota: Aunque verificamos autenticación, usamos SERVICE_ROLE_KEY porque necesitamos acceso completo
    // En producción, considera usar RLS en Supabase para mayor seguridad
    const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    
    // ✅ 3. VALIDAR Y SANITIZAR PARÁMETROS DE CONSULTA
    const q = sanitizeString(url.searchParams.get("q") ?? "");
    const estado = sanitizeString(url.searchParams.get("estado") ?? "");
    const maquina = sanitizeString(url.searchParams.get("maquina") ?? "");
    const prioridad = sanitizeString(url.searchParams.get("prioridad") ?? "");
    const agente = sanitizeString(url.searchParams.get("agente") ?? "");
    const almacen = sanitizeString(url.searchParams.get("almacen") ?? "");
    const desde = url.searchParams.get("desde") ?? "";
    const hasta = url.searchParams.get("hasta") ?? "";

    const safeParam = (v: string | null) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      if (s === "undefined" || s === "null") return "";
      return s;
    };

    const abonoMinRaw = safeParam(url.searchParams.get("abono_min"));
    const abonoMaxRaw = safeParam(url.searchParams.get("abono_max"));
    const costoFinalMinRaw = safeParam(url.searchParams.get("costo_final_min"));
    const costoFinalMaxRaw = safeParam(url.searchParams.get("costo_final_max"));
    const abonoPagadoRaw = safeParam(url.searchParams.get("abono_pagado"));
    const costoFinalPagadoRaw = safeParam(url.searchParams.get("costo_final_pagado"));

    // Validar fechas si se proporcionan
    if (desde) {
      const dateValidation = validateDate(desde);
      if (!dateValidation.valid) {
        return createErrorResponse(dateValidation.error!, 400);
      }
    }
    if (hasta) {
      const dateValidation = validateDate(hasta);
      if (!dateValidation.valid) {
        return createErrorResponse(dateValidation.error!, 400);
      }
    }

    // Validar filtros monetarios si se proporcionan
    if (abonoMinRaw) {
      const v = validateMoney(abonoMinRaw, "Abono mínimo", false);
      if (!v.valid) return createErrorResponse(v.error!, 400);
    }
    if (abonoMaxRaw) {
      const v = validateMoney(abonoMaxRaw, "Abono máximo", false);
      if (!v.valid) return createErrorResponse(v.error!, 400);
    }
    if (costoFinalMinRaw) {
      const v = validateMoney(costoFinalMinRaw, "Costo final mínimo", false);
      if (!v.valid) return createErrorResponse(v.error!, 400);
    }
    if (costoFinalMaxRaw) {
      const v = validateMoney(costoFinalMaxRaw, "Costo final máximo", false);
      if (!v.valid) return createErrorResponse(v.error!, 400);
    }

    // Validar límite
    const limitParam = Number(url.searchParams.get("limit") ?? "200");
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 200;

    // Validar offset
    const offsetParam = Number(url.searchParams.get("offset") ?? "0");
    const offset = Number.isFinite(offsetParam) ? Math.max(offsetParam, 0) : 0;

    // Validar orden
    const orderParam = url.searchParams.get("order") ?? "created_at.desc";
    const [orderField, orderDirection] = orderParam.split(".");
    const ascending = orderDirection === "asc";
    
    // Validar que el campo de orden sea válido
    const validOrderFields = ["created_at", "fecha", "code", "cliente"];
    const finalOrderField = validOrderFields.includes(orderField) ? orderField : "created_at";

    let query = supabase
      .from("services")
      .select("*")
      .order(finalOrderField, { ascending })
      .range(offset, offset + limit - 1);

    // Filtros exactos
    if (estado) {
      const estadoValidation = validateEstado(estado);
      if (!estadoValidation.valid) {
        return createErrorResponse(estadoValidation.error!, 400);
      }
      query = query.eq("estado", estado);
    }
    if (maquina) query = query.eq("maquina", maquina);
    if (prioridad) {
      const prioridadValidation = validatePrioridad(prioridad);
      if (!prioridadValidation.valid) {
        return createErrorResponse(prioridadValidation.error!, 400);
      }
      query = query.eq("prioridad", prioridad);
    }
    if (agente) query = query.eq("agente", agente);
    if (almacen) query = query.eq("almacen", almacen);

    // Rango por fecha
    if (desde) query = query.gte("fecha", desde);
    if (hasta) query = query.lte("fecha", hasta);

    const parseMoney = (v: string) => {
      const normalized = String(v ?? "").trim().replace(/\s+/g, "").replace(",", ".");
      return Number(normalized);
    };

    // Rango por abono / costo_final
    if (abonoMinRaw) query = query.gte("abono", parseMoney(abonoMinRaw));
    if (abonoMaxRaw) query = query.lte("abono", parseMoney(abonoMaxRaw));
    if (costoFinalMinRaw) query = query.gte("costo_final", parseMoney(costoFinalMinRaw));
    if (costoFinalMaxRaw) query = query.lte("costo_final", parseMoney(costoFinalMaxRaw));

    // Estado pagado / pendiente (boolean)
    if (abonoPagadoRaw === "true" || abonoPagadoRaw === "false") {
      query = query.eq("abono_pagado", abonoPagadoRaw === "true");
    }
    if (costoFinalPagadoRaw === "true" || costoFinalPagadoRaw === "false") {
      query = query.eq("costo_final_pagado", costoFinalPagadoRaw === "true");
    }

    // Búsqueda libre en múltiples campos (OR con ilike)
    if (q) {
      const term = `%${q}%`;
      query = query.or(
        [
          `code.ilike.${term}`,
          `cliente.ilike.${term}`,
          `telefono.ilike.${term}`,
          `maquina.ilike.${term}`,
          `descripcion.ilike.${term}`,
          `material.ilike.${term}`,
          `agente.ilike.${term}`,
          `almacen.ilike.${term}`,
        ].join(",")
      );
    }

    const { data, error } = await query;

    if (error) {
      return handleError(error, "Error obteniendo servicios");
    }

    return NextResponse.json({ services: data ?? [] }, { status: 200 });
  } catch (err: any) {
    return handleError(err, "Error procesando la solicitud");
  }
}

/**
 * POST → Crear servicio
 * 
 * ✅ SEGURIDAD IMPLEMENTADA:
 * - Autenticación requerida
 * - Validación completa de todos los campos
 * - Validación de archivos (tipo y tamaño)
 * - Sanitización de inputs
 * - Manejo seguro de errores
 */
export async function POST(req: Request) {
  try {
    // ✅ 1. VERIFICAR AUTENTICACIÓN
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    // ✅ 2. Obtener cliente de Supabase
    const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    const form = await req.formData();

    // ✅ 3. EXTRAER Y SANITIZAR DATOS
    const cliente = sanitizeString(String(form.get("cliente") ?? ""));
    const telefono = sanitizeString(String(form.get("telefono") ?? ""));
    const maquina = sanitizeString(String(form.get("maquina") ?? ""));
    const fecha = String(form.get("fecha") ?? "").trim();
    const hora = String(form.get("hora") ?? "").trim();
    const estado = String(form.get("estado") ?? "").trim();
    const descripcion = sanitizeString(String(form.get("descripcion") ?? ""));
    const material = sanitizeString(String(form.get("material") ?? ""));
    const agente = sanitizeString(String(form.get("agente") ?? ""));
    const almacen = sanitizeString(String(form.get("almacen") ?? ""));
    const prioridad = String(form.get("prioridad") ?? "").trim();
    const abonoRaw = String(form.get("abono") ?? "").trim();
    const costoFinalRaw = String(form.get("costo_final") ?? "").trim();
    const abonoPagadoRaw = String(form.get("abono_pagado") ?? "false").trim();
    const costoFinalPagadoRaw = String(form.get("costo_final_pagado") ?? "false").trim();

    const parseBool = (v: string) => String(v).toLowerCase() === "true";
    const abono_pagado = parseBool(abonoPagadoRaw);
    const costo_final_pagado = parseBool(costoFinalPagadoRaw);

    const parseMoney = (v: string) => {
      const normalized = String(v ?? "").trim().replace(/\s+/g, "").replace(",", ".");
      if (!normalized) return 0;
      return Number(normalized);
    };
    const abono = parseMoney(abonoRaw);
    const costo_final = parseMoney(costoFinalRaw);

    // ✅ 4. VALIDAR TODOS LOS CAMPOS
    const validations = [
      validateString(cliente, "Cliente"),
      validatePhone(telefono),
      validateString(maquina, "Máquina"),
      validateDate(fecha),
      validateTime(hora),
      validateEstado(estado),
      validateString(descripcion, "Descripción", 2000),
      validateMaterial(material),
      validateString(agente, "Agente"),
      validateString(almacen, "Almacén"),
      validatePrioridad(prioridad),
      validateMoney(abonoRaw, "Abono", false),
      validateMoney(costoFinalRaw, "Costo final", true),
    ];

    for (const validation of validations) {
      if (!validation.valid) {
        return createErrorResponse(validation.error!, 400);
      }
    }

    if (Number.isFinite(abono) && Number.isFinite(costo_final) && abono > costo_final) {
      return createErrorResponse("El abono no puede ser mayor al costo final", 400);
    }

    // ✅ 5. VALIDAR Y PROCESAR ARCHIVO (si existe)
    let cotizacion_url: string | null = null;
    const file = form.get("cotizacionFile");
    
    if (file instanceof File) {
      const fileValidation = validateFile(file);
      if (!fileValidation.valid) {
        return createErrorResponse(fileValidation.error!, 400);
      }

      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const year = new Date().getFullYear();
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const path = `${year}/${fileName}`;

      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from("cotizaciones")
        .upload(path, bytes, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        return handleError(uploadError, "Error subiendo cotización");
      }

      const { data } = supabase.storage.from("cotizaciones").getPublicUrl(path);
      cotizacion_url = data.publicUrl;
    }

    // ✅ 6. INSERTAR SERVICIO
    const { data: created, error: insertError } = await supabase
      .from("services")
      .insert({
        cliente,
        telefono,
        maquina,
        fecha,
        hora,
        estado,
        descripcion,
        material,
        agente,
        almacen,
        prioridad,
        cotizacion_url,
        abono,
        costo_final,
        abono_pagado,
        costo_final_pagado,
      })
      .select("*")
      .single();

    if (insertError) {
      return handleError(insertError, "Error insertando servicio");
    }

    return NextResponse.json({ service: created }, { status: 201 });
  } catch (err: any) {
    return handleError(err, "Error procesando la solicitud");
  }
}

/**
 * DELETE → Eliminar servicios
 * 
 * ✅ SEGURIDAD IMPLEMENTADA:
 * - Autenticación requerida
 * - Validación de entrada (array de códigos)
 * - Límite en cantidad de eliminaciones
 * - Manejo seguro de errores
 */
export async function DELETE(req: Request) {
  try {
    // ✅ 1. VERIFICAR AUTENTICACIÓN
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    // ✅ 2. Obtener cliente de Supabase
    const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    // ✅ 3. VALIDAR ENTRADA
    const body = await req.json().catch(() => ({}));
    const codes: string[] = Array.isArray(body?.codes) ? body.codes : [];

    if (!codes.length) {
      return createErrorResponse("No hay códigos para eliminar", 400);
    }

    // ✅ 4. LIMITAR CANTIDAD DE ELIMINACIONES (prevenir eliminaciones masivas accidentales)
    if (codes.length > 100) {
      return createErrorResponse("No se pueden eliminar más de 100 servicios a la vez", 400);
    }

    // ✅ 5. VALIDAR QUE LOS CÓDIGOS SEAN STRINGS VÁLIDOS
    const validCodes = codes.filter((code) => typeof code === "string" && code.trim().length > 0);
    if (validCodes.length !== codes.length) {
      return createErrorResponse("Algunos códigos no son válidos", 400);
    }

    // ✅ 6. ELIMINAR SERVICIOS
    const { error } = await supabase.from("services").delete().in("code", validCodes);

    if (error) {
      return handleError(error, "Error eliminando servicios");
    }

    return NextResponse.json({ ok: true, deleted: validCodes.length }, { status: 200 });
  } catch (err: any) {
    return handleError(err, "Error procesando la solicitud");
  }
}
