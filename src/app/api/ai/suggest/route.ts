import { aiDeps } from "@/lib/ai/server";
import { handleSuggest } from "@/lib/ai/server/handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  return handleSuggest(req, await aiDeps());
}
