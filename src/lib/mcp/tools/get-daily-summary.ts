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
  name: "get_daily_summary",
  title: "Resumen diario de caja",
  description:
    "Suma ingresos, egresos y balance de los movimientos de caja para una fecha (zona horaria America/Bogota). Formato YYYY-MM-DD.",
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
    const startUtc = `${date}T05:00:00.000Z`;
    const end = new Date(startUtc);
    end.setUTCDate(end.getUTCDate() + 1);
    const { data, error } = await db(ctx)
      .from("cash_entries")
      .select("type, amount, description, category, created_at")
      .gte("created_at", startUtc)
      .lt("created_at", end.toISOString());
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = data ?? [];
    const income = rows.filter((r) => r.type === "income").reduce((s, r) => s + Number(r.amount), 0);
    const expense = rows.filter((r) => r.type === "expense").reduce((s, r) => s + Number(r.amount), 0);
    const summary = { date, income, expense, balance: income - expense, count: rows.length };
    return {
      content: [{ type: "text", text: JSON.stringify(summary) }],
      structuredContent: summary,
    };
  },
});
