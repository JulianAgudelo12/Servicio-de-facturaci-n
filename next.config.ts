import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * PDFKit needs runtime access to its packaged font metric files under:
   * node_modules/pdfkit/js/data/*.afm
   *
   * When bundled by Turbopack/Next, these files can be missing, causing:
   * ENOENT: ... pdfkit/js/data/Helvetica.afm
   *
   * Mark it as external so Node can resolve it from node_modules at runtime.
   */
  serverExternalPackages: ["pdfkit"],
  
  /**
   * Asegurar que todas las rutas se generen correctamente
   */
  output: undefined, // Usar el output por defecto de Next.js
};

export default nextConfig;
