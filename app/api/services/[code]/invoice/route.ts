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

/**
 * PDFKit + algunos visores pueden renderizar caracteres de control / unicode raros
 * como "cuadritos" o íconos (por ejemplo tabs, VT, etc.).
 * Esto limpia el texto antes de enviarlo al PDF.
 */
function sanitizePdfText(input: unknown) {
  return String(input ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    // elimina caracteres de control (mantiene \n)
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "")
    // elimina separadores unicode que a veces rompen el layout
    .replace(/[\u2028\u2029]/g, "\n")
    .trimEnd();
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

function formatCOP(value: unknown) {
  const v = Number(value ?? 0);
  if (!Number.isFinite(v)) return "CO$ 0";
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `CO$ ${Math.round(v)}`;
  }
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
  req: Request,
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
    // Papel: por defecto LETTER (suele imprimir mejor centrado en impresoras), pero permite forzar A4.
    // Ej: /api/services/SER2026-0001/invoice?paper=a4
    const paperParam = new URL(req.url).searchParams.get("paper");
    const paperSize = paperParam?.toLowerCase() === "a4" ? "A4" : "LETTER";

    const doc = new PDFDocument({
      size: paperSize as any,
      margins: { top: 36, left: 36, right: 36, bottom: 36 },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));

    const done = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    const pageWidth = doc.page.width;
    // Usamos un "content box" más angosto y centrado para mejorar el centrado al imprimir
    // (y para reducir el tamaño del contenido en la hoja).
    const maxContentWidth = Math.min(520, pageWidth - 144); // ~72pt por lado (≈ 2.54cm)
    const left = (pageWidth - maxContentWidth) / 2;
    const right = left + maxContentWidth;

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
    const headerTop = doc.page.margins.top;

    // Logo (solo si existe)
    let logoHeight = 0;
    if (fs.existsSync(logoPath)) {
      try {
        const logoBuf = await fs.promises.readFile(logoPath);
        if (logoBuf.length > 0) {
          // Columna derecha reservada para la info de empresa
          const companyInfoWidth = 190;
          const companyInfoX = right - (companyInfoWidth + 10);
          const leftColumnRight = companyInfoX - 20;
          const leftColumnWidth = Math.max(120, leftColumnRight - left);

          // Logo más moderado, pero sin invadir la columna derecha
          const desiredLogoWidth = 220;
          const logoWidth = Math.min(desiredLogoWidth, leftColumnWidth);

          // `openImage` existe en runtime, pero no está declarado en los tipos de pdfkit
          const img = (doc as any).openImage(logoBuf);
          logoHeight = (logoWidth / img.width) * img.height;

          // Más pegado a la esquina superior izquierda (sin centrado), alineado con el header
          const companyBlockHeight = 54 + 10; // último renglón está en +54 con fontSize 9
          const headerHeight = Math.max(companyBlockHeight, logoHeight);
          const logoX = left;
          const logoY = headerTop + Math.max(0, (companyBlockHeight - logoHeight) / 2);

          doc.image(img, logoX, logoY, { width: logoWidth });
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
    const companyInfoY = headerTop;

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
    const companyBlockHeight = 54 + 10;
    const headerHeight = Math.max(companyBlockHeight, logoHeight);
    const titleY = headerTop + headerHeight + 18;

    doc
      .font("Inter-Bold")
      .fontSize(16)
      .fillColor("#111111")
      .text(`Servicio: ${sanitizePdfText(data.code)}`, left, titleY);

    const titleSeparatorY = titleY + 22;
    doc
      .moveTo(left, titleSeparatorY)
      .lineTo(right, titleSeparatorY)
      .lineWidth(1)
      .strokeColor("#111111")
      .stroke();

    const topY = titleSeparatorY + 10;

    // Bloque de datos en 3 columnas (evita solapamientos al hacer wrap y calcula alturas)
    doc.font("Inter").fontSize(10).fillColor("#111111");

    const availableW = right - left;
    const colGap = 14;
    const colW = (availableW - colGap * 2) / 3;
    const col1X = left;
    const col2X = left + colW + colGap;
    const col3X = left + (colW + colGap) * 2;

    const col1Line1 = `Fecha: ${sanitizePdfText(formatDateDDMMYYYY(data.fecha))}`;
    const col2Line1 = `Hora: ${sanitizePdfText(formatTimeHHMM(data.hora))}`;
    const col3Line1 = `Estado: ${sanitizePdfText(data.estado ?? "")}`;

    const col1Line2 = `Cliente: ${sanitizePdfText(data.cliente ?? "")}`;
    const col2Line2 = `Teléfono: ${sanitizePdfText(data.telefono ?? "")}`;
    const col3Line2 = `Máquina: ${sanitizePdfText(data.maquina ?? "")}`;

    const lineOpts = { width: colW as number };
    const lineGap = 6;

    const col1H =
      doc.heightOfString(col1Line1, lineOpts) +
      lineGap +
      doc.heightOfString(col1Line2, lineOpts);
    const col2H =
      doc.heightOfString(col2Line1, lineOpts) +
      lineGap +
      doc.heightOfString(col2Line2, lineOpts);
    const col3H =
      doc.heightOfString(col3Line1, lineOpts) +
      lineGap +
      doc.heightOfString(col3Line2, lineOpts);

    const rowH = Math.max(col1H, col2H, col3H);

    doc.text(col1Line1, col1X, topY, lineOpts);
    doc.text(col2Line1, col2X, topY, lineOpts);
    doc.text(col3Line1, col3X, topY, lineOpts);

    const line2Y = topY + Math.max(
      doc.heightOfString(col1Line1, lineOpts),
      doc.heightOfString(col2Line1, lineOpts),
      doc.heightOfString(col3Line1, lineOpts)
    ) + lineGap;

    doc.text(col1Line2, col1X, line2Y, lineOpts);
    doc.text(col2Line2, col2X, line2Y, lineOpts);
    doc.text(col3Line2, col3X, line2Y, lineOpts);

    const afterTopBlockY = topY + rowH + 10;

    doc
      .moveTo(left, afterTopBlockY)
      .lineTo(right, afterTopBlockY)
      .lineWidth(1)
      .strokeColor("#111111")
      .stroke();

    // Pagos (si existen en el servicio)
    const abonoVal = Number(data.abono ?? 0);
    const costoFinalVal = Number(data.costo_final ?? 0);
    const pagoFinalVal = Number(data.pago_final ?? (costoFinalVal - abonoVal));

    const pagosY = afterTopBlockY + 10;
    doc.font("Inter").fontSize(10).fillColor("#111111");
    doc.text(`Abono: ${formatCOP(abonoVal)}`, col1X, pagosY, { width: colW });
    doc.text(`Costo final: ${formatCOP(costoFinalVal)}`, col2X, pagosY, { width: colW });
    doc.text(`Pago final: ${formatCOP(pagoFinalVal)}`, col3X, pagosY, { width: colW });

    const sectionY = pagosY + 24;

    // Descripción
    doc
      .font("Inter-Bold")
      .fontSize(11)
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
      .fontSize(10)
      .fillColor("#111111")
      .text(sanitizePdfText(data.descripcion ?? ""), left, sectionY + 28, {
        width: right - left,
      });

    // Observaciones
    const descText = sanitizePdfText(data.descripcion ?? "");
    const descH = doc.heightOfString(descText, { width: right - left });
    const observacionesY = sectionY + 28 + descH + 18;

    doc
      .font("Inter-Bold")
      .fontSize(11)
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
      .fontSize(10)
      .fillColor("#111111")
      .text(sanitizePdfText(data.material ?? ""), left, observacionesY + 30, {
        width: right - left,
      });

    // Footer (debajo del contenido) para que la factura no ocupe toda la hoja
    const obsText = sanitizePdfText(data.material ?? "");
    const obsH = doc.heightOfString(obsText, { width: right - left });
    const footerY = observacionesY + 30 + obsH + 24;

    doc
      .font("Inter")
      .fontSize(8)
      .fillColor("#444444")
      .text("Generado por Briolete · Sistema de Servicios", left, footerY, {
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
