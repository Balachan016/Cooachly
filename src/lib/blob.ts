import "server-only";
import { put } from "@vercel/blob";

// Vercel's newer "Connect Database"/Storage flow wires up a Blob store via
// OIDC (BLOB_STORE_ID + the platform's own auto-injected VERCEL_OIDC_TOKEN)
// instead of handing you a static BLOB_READ_WRITE_TOKEN to copy — @vercel/
// blob's put() already knows how to use either. But if more than one Blob
// store is ever connected to this project at once, Vercel disambiguates by
// numbering the variable (BLOB1_STORE_ID, BLOB2_STORE_ID, ...) instead of
// using the bare name, and put()'s own OIDC fallback only ever looks at the
// bare BLOB_STORE_ID — so this finds whichever one actually exists and
// passes it through explicitly instead of trusting put() to find it itself.
function findBlobStoreId(): string | undefined {
  if (process.env.BLOB_STORE_ID) return process.env.BLOB_STORE_ID;
  const numberedKey = Object.keys(process.env).find((key) => /^BLOB\d+_STORE_ID$/.test(key));
  return numberedKey ? process.env[numberedKey] : undefined;
}

export const isBlobConfigured = Boolean(process.env.BLOB_READ_WRITE_TOKEN || findBlobStoreId());

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
    const storeId = findBlobStoreId();
    const blob = await put(opts.pathname, opts.file, {
      access: "public",
      addRandomSuffix: true,
      // Only needed for the OIDC path — passing it alongside a real
      // BLOB_READ_WRITE_TOKEN is harmless (put() ignores storeId when a
      // token is set), so no need to branch on which auth mode is active.
      ...(storeId ? { storeId } : {}),
    });
    return { url: blob.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to upload file to Vercel Blob", err);
    return { url: null, error: message };
  }
}
