import { sanitizeDoc } from "./viz/engine";
import type { ChartDoc } from "./viz/types";

/**
 * Share links encode the whole chart in the URL hash (never sent to a server):
 *   /build#d=<base64url(deflate(json))>
 * Compression uses the browser's CompressionStream when available.
 */

const PREFIX_DEFLATE = "z";
const PREFIX_PLAIN = "j";
export const MAX_SHARE_LENGTH = 60_000;

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const res = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

export async function encodeDoc(doc: ChartDoc): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(doc));
  if (typeof CompressionStream !== "undefined") {
    try {
      return PREFIX_DEFLATE + toBase64Url(await pipe(json, new CompressionStream("deflate-raw")));
    } catch {
      /* fall through */
    }
  }
  return PREFIX_PLAIN + toBase64Url(json);
}

export async function decodeDoc(token: string): Promise<ChartDoc | null> {
  try {
    const kind = token[0];
    const bytes = fromBase64Url(token.slice(1));
    let json: Uint8Array;
    if (kind === PREFIX_DEFLATE) {
      if (typeof DecompressionStream === "undefined") return null;
      json = await pipe(bytes, new DecompressionStream("deflate-raw"));
    } else if (kind === PREFIX_PLAIN) json = bytes;
    else return null;
    const parsed = JSON.parse(new TextDecoder().decode(json));
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.data)) return null;
    return sanitizeDoc(parsed as ChartDoc);
  } catch {
    return null;
  }
}

export async function shareURL(doc: ChartDoc, origin: string): Promise<{ url: string; tooLong: boolean }> {
  const token = await encodeDoc(doc);
  const url = `${origin}/build#d=${token}`;
  return { url, tooLong: url.length > MAX_SHARE_LENGTH };
}
