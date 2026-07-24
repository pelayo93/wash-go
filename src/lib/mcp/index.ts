import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listActiveRentals from "./tools/list-active-rentals";
import listRentalsByDate from "./tools/list-rentals-by-date";
import getDailySummary from "./tools/get-daily-summary";
import searchClients from "./tools/search-clients";
import listDeliveryPeople from "./tools/list-delivery-people";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "lavaexpress-mcp",
  title: "LavaExpress MCP",
  version: "0.1.0",
  instructions:
    "Herramientas para consultar datos operativos de LavaExpress (alquileres activos y por fecha, resumen de caja, clientes y personal de reparto). Todas las herramientas leen datos como el usuario autenticado y respetan RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listActiveRentals,
    listRentalsByDate,
    getDailySummary,
    searchClients,
    listDeliveryPeople,
  ],
});
