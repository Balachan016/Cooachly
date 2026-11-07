import "server-only";
import { put } from "@vercel/blob";

// Vercel's newer "Connect Database"/Storage flow wires up a Blob store via
// OIDC (BLOB_STORE_ID + the platform's own auto-injected VERCEL_OIDC_TOKEN)
// instead of handing you a static BLOB_READ_WRITE_TOKEN to copy — @vercel/
// blob's put() already knows how to use either, so this just needs to
// recognize both as "configured" rather than requiring the older token.
export const isBlobConfigured = Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

/**
 * `error` is only ever set alongside `url: null` — callers that just need
 * success/failure can keep checking `!uploaded.url`; callers that want to
 * show *why* (like the join-nudge test button) can surface `error` too,
 * instead of every failure reading as a generic "not configured" regardless
 * of whether it's actually a missing config or a thrown error from put().
 */
export async function uploadFile(opts: {
  pathname: string;
  file: File;
}): Promise<{ url: string; error?: undefined } | { url: null; error: string }> {
  if (!isBlobConfigured) {
    return { url: null, error: "Vercel Blob isn't configured (no BLOB_READ_WRITE_TOKEN or BLOB_STORE_ID set)." };
  }

  try {
    const blob = await put(opts.pathname, opts.file, {
      access: "public",
      addRandomSuffix: true,
    });
    return { url: blob.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to upload file to Vercel Blob", err);
    return { url: null, error: message };
  }
}
