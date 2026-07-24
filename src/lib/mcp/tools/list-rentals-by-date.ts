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
  name: "list_rentals_by_date",
  title: "Listar alquileres por fecha",
  description:
    "Devuelve los alquileres creados en una fecha específica (zona horaria America/Bogota). Formato de fecha: YYYY-MM-DD.",
  inputSchema: {
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe("Fecha en formato YYYY-MM-DD (hora Colombia)"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ date }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    // Colombia is UTC-5 (no DST). Local day [00:00, 24:00) => UTC [05:00, 29:00).
    const startUtc = `${date}T05:00:00.000Z`;
    const end = new Date(`${date}T05:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    const { data, error } = await db(ctx)
      .from("rentals")
      .select(
        "id, client_name, zone, service_type, total, status, delivered_by, picked_up_by, entry_time, completed_at, created_at",
      )
      .gte("created_at", startUtc)
      .lt("created_at", end.toISOString())
      .order("created_at", { ascending: false });
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { rentals: data ?? [], date },
    };
  },
});
