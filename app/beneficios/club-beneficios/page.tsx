import ClubBeneficiosPage from "./ClubBeneficiosPage";
import { clubBenefits, type ClubBenefit } from "../data/clubBenefits";

import { createSeoMetadata } from "@/src/seo";

/* Sin caché: lo que marketing publica u oculta en el CRM se ve al recargar la página. */
export const dynamic = "force-dynamic";

export const metadata = createSeoMetadata({
  title: "Club de Beneficios Ancosur",
  description:
    "Descubre los beneficios, promociones y descuentos exclusivos para clientes Ancosur en Huancayo.",
  pathname: "/beneficios/club-beneficios",

  keywords: [
    "Club de Beneficios Ancosur",
    "beneficios Ancosur",
    "descuentos Ancosur",
    "promociones Ancosur",
    "clientes Ancosur",
    "beneficios inmobiliarios",
    "Huancayo",
  ],
});

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.ancosur.com").replace(/\/+$/, "");

type BeneficioCRM = {
  categoria: string;
  nombre: string;
  descuento: string;
  descripcion: string;
  condiciones: string | null;
  imagen_url: string | null;
  terminos_url: string | null;
};

/* Los beneficios los gestiona marketing en el CRM (Página web → Club de beneficios): publicar u ocultar se ve en la web
   al recargar. Si el CRM no responde, se muestran los de respaldo escritos en el código. */
async function obtenerBeneficios(): Promise<ClubBenefit[]> {
  if (!BACKEND_URL) return clubBenefits;
  try {
    const res = await fetch(`${BACKEND_URL}/api/web/beneficios`, { cache: "no-store" });
    const json = (await res.json()) as { success?: boolean; data?: BeneficioCRM[] };
    /* Una lista vacía es válida (marketing ocultó todos): el respaldo es solo para cuando el CRM no responde. */
    if (!res.ok || json.success !== true || !Array.isArray(json.data)) return clubBenefits;
    const absoluta = (url: string | null) => (url ? (url.startsWith("http") ? url : `${BACKEND_URL}${url}`) : "");
    return json.data.map((b) => ({
      category: b.categoria,
      name: b.nombre,
      discount: b.descuento,
      image: absoluta(b.imagen_url) || "/assets/benefits/club/placeholder.webp",
      description: b.descripcion,
      terms: b.condiciones ?? "",
      termsHref: absoluta(b.terminos_url),
    }));
  } catch {
    return clubBenefits;
  }
}

export default async function Page() {
  return <ClubBeneficiosPage beneficios={await obtenerBeneficios()} />;
}