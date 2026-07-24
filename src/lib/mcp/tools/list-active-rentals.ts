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
  name: "list_active_rentals",
  title: "Listar alquileres activos",
  description:
    "Devuelve los alquileres actualmente activos (status = 'active') de LavaExpress, con cliente, zona, servicio, repartidor y hora de entrega.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    const { data, error } = await db(ctx)
      .from("rentals")
      .select(
        "id, client_name, phone, address, zone, service_type, price, total, delivered_by, entry_time, status",
      )
      .eq("status", "active")
      .order("entry_time", { ascending: false });
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { rentals: data ?? [] },
    };
  },
});
