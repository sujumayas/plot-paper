import { aiDeps } from "@/lib/ai/server";
import { handleSpec } from "@/lib/ai/server/handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  return handleSpec(req, await aiDeps());
}
