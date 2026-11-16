import { NextResponse } from "next/server";

import { proxyPost } from "./proxyPost";

/**
 * Registro de leads de la web en el CRM nuevo (API de Ancosur Leads).
 *
 * Todos los formularios del sitio llegan aquí (proyectos, promociones, popup, WhatsApp, inversionistas,
 * terrenos, referidos). Se normalizan los datos y se envían a POST {CRM_API_URL}/api/integraciones/leads con
 * la clave X-API-Key. La clave solo vive en el servidor: nunca llega al navegador.
 *
 * Variables de entorno (servidor):
 *   CRM_API_URL  URL pública de la API del CRM nuevo (por defecto https://api.ancosur.com)
 *   CRM_API_KEY  una de las claves de INTEGRATION_API_KEYS de esa API
 *
 * Respaldo: si falta la clave, el CRM la rechaza o no responde, el lead se envía por el camino anterior (LEADS_API_URL)
 * para no perderlo. Los errores de datos del cliente (nombre o celular inválidos) no van al respaldo.
 */

type Datos = Record<string, unknown>;

const TIEMPO_MAXIMO = 15_000;

const esObjeto = (v: unknown): v is Datos => typeof v === "object" && v !== null && !Array.isArray(v);

const texto = (v: unknown): string => (typeof v === "string" || typeof v === "number" ? String(v).trim() : "");

/** El primer valor no vacío entre varios nombres de campo (cada formulario los llama distinto). */
function campo(d: Datos, ...nombres: string[]): string {
  for (const n of nombres) {
    const v = texto(d[n]);
    if (v) return v;
  }
  return "";
}

const unaLinea = (v: string, max: number) => v.replace(/\s+/g, " ").trim().slice(0, max);

/** Celular peruano de 9 dígitos con prefijo +51; otros números con «+» se respetan. */
function telefono(v: string): string {
  const d = v.replace(/\D/g, "");
  if (/^9\d{8}$/.test(d)) return `+51${d}`;
  if (/^519\d{8}$/.test(d)) return `+${d}`;
  return v.trim().startsWith("+") && d.length >= 8 ? `+${d}` : "";
}

function correo(v: string): string {
  const e = v.toLowerCase().replace(/\s/g, "");
  return /^[^@\s,;]+@[^@\s,;]+\.[a-z]{2,}$/.test(e) ? e.slice(0, 120) : "";
}

const dni = (v: string) => (/^\d{8}$/.test(v.replace(/\D/g, "")) ? v.replace(/\D/g, "") : "");

/** El mensaje del cliente: texto tal cual o, si llegó un objeto, su JSON. */
function mensaje(d: Datos): string {
  for (const n of ["mensaje", "message", "msj_client", "comentario"]) {
    const v = d[n];
    if (typeof v === "string" && v.trim()) return v.trim().slice(0, 1000);
    if (esObjeto(v)) return JSON.stringify(v).slice(0, 1000);
  }
  return "";
}

/** Campos que ya van en columnas propias del lead (no se repiten como «preguntas adicionales»). */
const PRINCIPALES = new Set([
  "nombre", "nombres", "fullName", "full_name", "name", "nombre_completo", "telefono", "celular", "phone", "whatsapp",
  "email", "correo", "dni", "documento", "numero_documento", "mensaje", "message", "msj_client", "comentario",
  "campania", "campaña", "campana", "campaign", "campania_nombre", "anuncio", "ad", "fuente_id", "source_id",
  "consent", "consentimiento", "website",
]);

/** Arma el lead en el formato normalizado que acepta el CRM. */
function aLeadCRM(d: Datos, formulario: string) {
  const proyecto = unaLinea(campo(d, "proyecto", "project", "proyecto_interes"), 80);
  const preguntas: Record<string, string> = { formulario };
  const msj = mensaje(d);
  if (msj) preguntas.mensaje = msj;
  for (const [k, v] of Object.entries(d)) {
    if (PRINCIPALES.has(k)) continue;
    const valor = esObjeto(v) || Array.isArray(v) ? JSON.stringify(v) : texto(v);
    if (valor) preguntas[k] = valor.slice(0, 500);
  }
  return {
    nombre: unaLinea(campo(d, "nombre", "nombres", "fullName", "full_name", "name", "nombre_completo"), 80),
    telefono: telefono(campo(d, "telefono", "celular", "phone", "whatsapp")),
    email: correo(campo(d, "email", "correo")),
    dni: dni(campo(d, "dni", "documento", "numero_documento")),
    fecha_hora: new Date().toISOString(),
    origen: "Página web",
    campana: unaLinea(campo(d, "campania", "campaña", "campana", "campaign", "campania_nombre") || proyecto || formulario, 120),
    anuncio: unaLinea(campo(d, "anuncio", "ad") || proyecto, 120),
    id_externo: `web:${crypto.randomUUID()}`,
    preguntas_adicionales: preguntas,
  };
}

type ResultadoCRM = { resultado?: string; lead_id?: number | null; errores?: string[] };

/**
 * Recibe el formulario y lo registra en el CRM. Responde en el formato que ya esperan los formularios del sitio:
 * { success, message, data: { guardado_local, id, estado_crm, crm: { success, lead_id, estado, http_status, message } } }.
 */
export async function registrarLead(request: Request, formulario: string): Promise<NextResponse> {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return respuesta(400, false, "No se pudieron leer los datos del formulario.");
  }
  if (!esObjeto(cuerpo)) return respuesta(400, false, "No se pudieron leer los datos del formulario.");
  // Trampa para bots: el campo «website» va oculto en los formularios; una persona no lo llena.
  if (texto(cuerpo.website)) return respuesta(200, true, "¡Gracias! Te contactaremos pronto.");

  const lead = aLeadCRM(cuerpo, texto(cuerpo.nombre_formulario) || texto(cuerpo.form_name) || formulario);
  if (!lead.nombre) return respuesta(422, false, "Escribe tu nombre.");
  if (!lead.telefono && !lead.email) return respuesta(422, false, "Escribe un celular de 9 dígitos o un correo válido.");

  const respaldo = () =>
    proxyPost(new Request(request.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) }));
  const url = (process.env.CRM_API_URL?.trim() || "https://api.ancosur.com").replace(/\/+$/, "");
  const clave = process.env.CRM_API_KEY?.trim();
  if (!clave) {
    console.error("[CRM] Falta configurar CRM_API_KEY: el lead va por el camino anterior.", { formulario });
    return respaldo();
  }

  const control = new AbortController();
  const plazo = setTimeout(() => control.abort(), TIEMPO_MAXIMO);
  try {
    const res = await fetch(`${url}/api/integraciones/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-API-Key": clave },
      body: JSON.stringify(lead),
      cache: "no-store",
      signal: control.signal,
    });
    const datos = (await res.json().catch(() => null)) as { data?: { resultados?: ResultadoCRM[] }; error?: { message?: string } } | null;
    const r = datos?.data?.resultados?.[0];
    // creado = lead nuevo; reingreso = ya existía y se registra la nueva consulta; duplicado = reenvío del mismo formulario.
    const ok = res.ok && !!r && ["creado", "reingreso", "duplicado"].includes(r.resultado ?? "");
    if (!ok && (res.status === 401 || res.status === 403 || res.status >= 500)) {
      console.error("[CRM] El CRM no está disponible: el lead va por el camino anterior.", { formulario, status: res.status });
      return respaldo();
    }
    if (!ok) {
      console.error("[CRM] El CRM no registró el lead.", { formulario, status: res.status, resultado: r?.resultado, errores: r?.errores ?? datos?.error?.message });
      return respuesta(res.status === 401 ? 502 : 422, false, r?.errores?.[0] ?? "Revisa tu nombre, celular y correo, por favor.", {
        crm: { success: false, estado: r?.resultado ?? "error", http_status: res.status, message: r?.errores?.join(" ") ?? datos?.error?.message ?? "" },
      });
    }
    return respuesta(200, true, "¡Gracias! Un asesor te contactará pronto.", {
      guardado_local: true,
      id: r.lead_id ?? null,
      estado_crm: r.resultado,
      crm: { success: true, lead_id: r.lead_id ?? null, estado: r.resultado, http_status: res.status, message: "Lead registrado en el CRM." },
    });
  } catch (e) {
    console.error("[CRM] No se pudo conectar con el CRM: el lead va por el camino anterior.", { formulario, error: e instanceof Error ? e.message : String(e) });
    return respaldo();
  } finally {
    clearTimeout(plazo);
  }
}

function respuesta(status: number, success: boolean, message: string, data: Record<string, unknown> = {}) {
  return NextResponse.json({ success, message, ...(success ? {} : { error: message }), data }, { status });
}
