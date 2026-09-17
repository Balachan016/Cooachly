import "server-only";
import { put } from "@vercel/blob";

export const isBlobConfigured = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

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
