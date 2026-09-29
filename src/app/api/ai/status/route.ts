import { aiDeps } from "@/lib/ai/server";
import { statusFor } from "@/lib/ai/server/handlers";

export const dynamic = "force-dynamic";

export async function GET() {
  const deps = await aiDeps();
  return Response.json(statusFor(deps), { headers: { "cache-control": "no-store" } });
}
