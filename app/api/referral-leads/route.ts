import { registrarLead } from "../_shared/crm";

export const dynamic = "force-dynamic";

/** Registra el lead en el CRM nuevo (ver _shared/crm.ts). */
export async function POST(request: Request) {
  return registrarLead(request, "Socio referido");
}
