import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { requireAuth } from "../../../middleware/auth";
import { handleError, createErrorResponse } from "../../../utils/errors";

export const runtime = "nodejs";

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function formatDateDDMMYYYY(dateStr: string) {
  const [yyyy, mm, dd] = String(dateStr || "").split("-");
  if (yyyy && mm && dd) return `${dd}-${mm}-${yyyy}`;
  return String(dateStr || "");
}

function formatTimeHHMM(timeStr: string) {
  if (!timeStr) return "";
  return String(timeStr).slice(0, 5);
}

/**
 * GET → Generar PDF de factura/servicio
 *
 * ✅ SEGURIDAD IMPLEMENTADA:
 * - Autenticación requerida
 * - Validación del parámetro code
 * - Manejo seguro de errores
 * - No expone información sensible en errores de producción
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ code: string }> | { code: string } }
) {
  try {
    // ✅ 1. VERIFICAR AUTENTICACIÓN
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    // const { user } = auth; // (no lo usas todavía)

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

    // ✅ 4. BUSCAR SERVICIO
    let { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      return handleError(error, "Error obteniendo servicio");
    }

    if (!data) {
      const fallback = await supabase
        .from("services")
        .select("*")
        .ilike("code", code)
        .maybeSingle();

      if (fallback.error) {
        return handleError(fallback.error, "Error obteniendo servicio");
      }

      data = fallback.data ?? null;
    }

    if (!data) {
      return createErrorResponse("Servicio no encontrado", 404);
    }

    // ✅ 5. GENERAR PDF
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 36, left: 36, right: 36, bottom: 36 },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));

    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    const pageWidth = doc.page.width;
    const left = doc.page.margins.left;
    const right = pageWidth - doc.page.margins.right;

    // ✅ 6. CARGAR FUENTES (con manejo de errores mejorado)
    const fontRegularPath = path.join(
      process.cwd(),
      "public",
      "fonts",
      "Inter-Regular.otf"
    );
    const fontBoldPath = path.join(
      process.cwd(),
      "public",
      "fonts",
      "Inter-Bold.otf"
    );

    let fontRegularBuf: Buffer;
    let fontBoldBuf: Buffer;

    try {
      [fontRegularBuf, fontBoldBuf] = await Promise.all([
        fs.promises.readFile(fontRegularPath),
        fs.promises.readFile(fontBoldPath),
      ]);
    } catch (e: any) {
      const isDevelopment = process.env.NODE_ENV === "development";
      return NextResponse.json(
        {
          error: "Error cargando recursos del PDF",
          ...(isDevelopment && {
            details: e?.message,
            expected: [fontRegularPath, fontBoldPath],
          }),
        },
        { status: 500 }
      );
    }

    doc.registerFont("Inter", fontRegularBuf);
    doc.registerFont("Inter-Bold", fontBoldBuf);
    doc.font("Inter"); // ✅ evita Helvetica

    // ✅ 7. LOGO + INFO EMPRESA
    const logoPath = path.join(process.cwd(), "public", "briolete-logo.png");
    const logoWidth = 150;
    // Logo un poco más arriba que el texto, pero pegado al margen izquierdo
    const logoX = left;
    const logoY = doc.page.margins.top - 40;

    // Logo (solo si existe)
    if (fs.existsSync(logoPath)) {
      try {
        const logoBuf = await fs.promises.readFile(logoPath);
        if (logoBuf.length > 0) {
          doc.image(logoBuf, logoX, logoY, { width: logoWidth });
        }
      } catch (e: any) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error leyendo logo:", e?.message || e);
          console.error("Ruta logo:", logoPath);
        }
      }
    } else {
      if (process.env.NODE_ENV === "development") {
        console.error("Logo no encontrado en:", logoPath);
      }
    }

    // Info empresa derecha (alineada al margen superior visual)
    const companyInfoX = right - 200;
    const companyInfoY = doc.page.margins.top;

    doc
      .font("Inter-Bold")
      .fontSize(12)
      .fillColor("#111111")
      .text("Joyeria Briolete", companyInfoX, companyInfoY, {
        width: 190,
        align: "right",
      });

    doc
      .font("Inter")
      .fontSize(9)
      .fillColor("#333333")
      .text("Dirección: Cra 45c # 38b sur - 64", companyInfoX, companyInfoY + 15, {
        width: 190,
        align: "right",
      });

    doc
      .font("Inter")
      .fontSize(9)
      .fillColor("#333333")
      .text("Envigado (Antioquia) Colombia", companyInfoX, companyInfoY + 28, {
        width: 190,
        align: "right",
      });

    doc
      .font("Inter")
      .fontSize(9)
      .fillColor("#333333")
      .text("Barrio Alcalá", companyInfoX, companyInfoY + 41, {
        width: 190,
        align: "right",
      });

    doc
      .font("Inter")
      .fontSize(9)
      .fillColor("#333333")
      .text("@joyeriabriolete", companyInfoX, companyInfoY + 54, {
        width: 190,
        align: "right",
      });

    // ✅ 8. CONTENIDO DEL PDF
    doc
      .font("Inter-Bold")
      .fontSize(18)
      .fillColor("#111111")
      .text(`Servicio: ${data.code}`, left, 150);

    doc
      .moveTo(left, 180)
      .lineTo(right, 180)
      .lineWidth(1)
      .strokeColor("#111111")
      .stroke();

    const topY = 195;

    doc.font("Inter").fontSize(11).fillColor("#111111");
    doc.text(`Fecha: ${formatDateDDMMYYYY(data.fecha)}`, left, topY);
    doc.text(`Hora: ${formatTimeHHMM(data.hora)}`, left + 240, topY);
    doc.text(`Estado: ${data.estado ?? ""}`, left + 420, topY);

    doc.text(`Cliente: ${data.cliente ?? ""}`, left, topY + 18);
    doc.text(`Teléfono: ${data.telefono ?? ""}`, left + 240, topY + 18);
    doc.text(`Máquina: ${data.maquina ?? ""}`, left + 420, topY + 18);

    doc
      .moveTo(left, topY + 48)
      .lineTo(right, topY + 48)
      .lineWidth(1)
      .strokeColor("#111111")
      .stroke();

    const sectionY = topY + 70;

    // Descripción
    doc
      .font("Inter-Bold")
      .fontSize(12)
      .fillColor("#111111")
      .text("Descripción", left, sectionY);

    doc
      .moveTo(left, sectionY + 18)
      .lineTo(right, sectionY + 18)
      .lineWidth(1)
      .strokeColor("#111111")
      .stroke();

    doc
      .font("Inter")
      .fontSize(12)
      .fillColor("#111111")
      .text(String(data.descripcion ?? ""), left, sectionY + 30, {
        width: right - left,
      });

    // Observaciones
    const observacionesY = sectionY + 120;

    doc
      .font("Inter-Bold")
      .fontSize(12)
      .fillColor("#111111")
      .text("Observaciones", left, observacionesY);

    doc
      .moveTo(left, observacionesY + 18)
      .lineTo(right, observacionesY + 18)
      .lineWidth(1)
      .strokeColor("#111111")
      .stroke();

    doc
      .font("Inter")
      .fontSize(12)
      .fillColor("#111111")
      .text(String(data.material ?? ""), left, observacionesY + 30, {
        width: right - left,
      });

    // Footer
    doc
      .font("Inter")
      .fontSize(9)
      .fillColor("#444444")
      .text("Generado por Briolete · Sistema de Servicios", left, doc.page.height - 60, {
        width: right - left,
        align: "center",
      });

    doc.end();

    const pdfBuffer = await done;

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${data.code}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return handleError(err, "Error generando PDF");
  }
}
