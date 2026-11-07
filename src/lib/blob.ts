import "server-only";
import { put } from "@vercel/blob";

// Vercel's newer "Connect Database"/Storage flow wires up a Blob store via
// OIDC (BLOB_STORE_ID + the platform's own auto-injected VERCEL_OIDC_TOKEN)
// instead of handing you a static BLOB_READ_WRITE_TOKEN to copy — @vercel/
// blob's put() already knows how to use either, so this just needs to
// recognize both as "configured" rather than requiring the older token.
export const isBlobConfigured = Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

export async function uploadFile(opts: {
  pathname: string;
  file: File;
}): Promise<{ url: string } | null> {
  if (!isBlobConfigured) {
    console.log(`[blob:skipped, not configured] pathname=${opts.pathname}`);
    return null;
  }

  try {
    const blob = await put(opts.pathname, opts.file, {
      access: "public",
      addRandomSuffix: true,
    });
    return { url: blob.url };
  } catch (err) {
    console.error("Failed to upload file to Vercel Blob", err);
    return null;
  }
}
