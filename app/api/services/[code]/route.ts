import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { requireAuth } from "../../middleware/auth";
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
} from "../../utils/validators";
import { handleError, createErrorResponse } from "../../utils/errors";

export const runtime = "nodejs";

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function normalizeTimeHHMMSS(hhmm: string) {
  // "13:00" -> "13:00:00"
  // "13:00:00" -> "13:00:00"
  const t = String(hhmm || "").trim();
  if (!t) return "";
  if (t.length === 5) return `${t}:00`;
  return t.slice(0, 8);
}

async function findServiceByCode(supabase: any, code: string) {
  // 1) exact match
  let { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error) throw new Error(error.message);

  // 2) fallback ilike
  if (!data) {
    const fallback = await supabase
      .from("services")
      .select("*")
      .ilike("code", code)
      .maybeSingle();

    if (fallback.error) throw new Error(fallback.error.message);
    data = fallback.data ?? null;
  }

  return data as any | null;
}

/**
 * GET → Obtener un servicio por código
 * 
 * ✅ SEGURIDAD IMPLEMENTADA:
 * - Autenticación requerida
 * - Validación del parámetro code
 * - Manejo seguro de errores
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ code: string }> | { code: string } }
) {
  try {
    // ✅ 1. VERIFICAR AUTENTICACIÓN
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    // ✅ 2. Obtener cliente de Supabase
    const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    // ✅ 3. VALIDAR PARÁMETRO CODE
    const params = await Promise.resolve(context.params);
    const raw = params?.code ?? "";
    const code = decodeURIComponent(String(raw)).trim();

    if (!code) {
      return createErrorResponse("Falta el parámetro code", 400);
    }

    // Validar longitud del código
    if (code.length > 100) {
      return createErrorResponse("Código de servicio inválido", 400);
    }

    // ✅ 4. BUSCAR SERVICIO
    const data = await findServiceByCode(supabase, code);

    if (!data) {
      return createErrorResponse("Servicio no encontrado", 404);
    }

    return NextResponse.json({ service: data }, { status: 200 });
  } catch (err: any) {
    return handleError(err, "Error procesando la solicitud");
  }
}

/**
 * PUT → Actualizar servicio
 * 
 * ✅ SEGURIDAD IMPLEMENTADA:
 * - Autenticación requerida
 * - Validación completa de todos los campos
 * - Validación de archivos (tipo y tamaño)
 * - Sanitización de inputs
 * - Verificación de existencia del servicio
 * - Manejo seguro de errores
 */
export async function PUT(
  req: Request,
  context: { params: Promise<{ code: string }> | { code: string } }
) {
  try {
    // ✅ 1. VERIFICAR AUTENTICACIÓN
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    // ✅ 2. Obtener cliente de Supabase
    const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    // ✅ 3. VALIDAR PARÁMETRO CODE
    const params = await Promise.resolve(context.params);
    const raw = params?.code ?? "";
    const code = decodeURIComponent(String(raw)).trim();

    if (!code) {
      return createErrorResponse("Falta el parámetro code", 400);
    }

    if (code.length > 100) {
      return createErrorResponse("Código de servicio inválido", 400);
    }

    // ✅ 4. VERIFICAR QUE EL SERVICIO EXISTA
    const existing = await findServiceByCode(supabase, code);
    if (!existing) {
      return createErrorResponse("Servicio no encontrado", 404);
    }

    // ✅ 5. LEER Y VALIDAR FORM DATA
    const form = await req.formData();

    const cliente = sanitizeString(String(form.get("cliente") ?? ""));
    const telefono = sanitizeString(String(form.get("telefono") ?? ""));
    const maquina = sanitizeString(String(form.get("maquina") ?? ""));
    const fecha = String(form.get("fecha") ?? "").trim();
    const horaRaw = String(form.get("hora") ?? "").trim();
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

    // ✅ 6. VALIDAR TODOS LOS CAMPOS
    const validations = [
      validateString(cliente, "Cliente"),
      validatePhone(telefono),
      validateString(maquina, "Máquina"),
      validateDate(fecha),
      validateTime(horaRaw),
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

    const hora = normalizeTimeHHMMSS(horaRaw);

    // ✅ 7. VALIDAR Y PROCESAR ARCHIVO (si existe)
    let cotizacion_url: string | null = existing.cotizacion_url ?? null;

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

      // (Opcional) borrar archivo anterior: lo dejamos para después
    }

    // ✅ 8. ACTUALIZAR SERVICIO
    const { data: updated, error: updateError } = await supabase
      .from("services")
      .update({
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
      .eq("code", existing.code)
      .select("*")
      .single();

    if (updateError) {
      return handleError(updateError, "Error actualizando servicio");
    }

    return NextResponse.json({ service: updated }, { status: 200 });
  } catch (err: any) {
    return handleError(err, "Error procesando la solicitud");
  }
}
