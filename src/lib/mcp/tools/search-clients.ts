import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function db(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "search_clients",
  title: "Buscar clientes",
  description:
    "Busca clientes de LavaExpress por nombre, teléfono o dirección (coincidencia parcial, insensible a mayúsculas).",
  inputSchema: {
    query: z.string().trim().min(1).describe("Texto a buscar en nombre, teléfono o dirección"),
    limit: z.number().int().min(1).max(50).optional().describe("Máximo de resultados (por defecto 20)"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    const q = query.replace(/[%,]/g, " ");
    const { data, error } = await db(ctx)
      .from("clients")
      .select("id, name, phone, address, active, created_at")
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%,address.ilike.%${q}%`)
      .eq("active", true)
      .limit(limit ?? 20);
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { clients: data ?? [] },
    };
  },
});
