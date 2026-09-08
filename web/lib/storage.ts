import fs from 'fs';
import { put } from '@vercel/blob';

/**
 * Stores the rendered video file and returns a public URL.
 * Strategy:
 * 1. If BLOB_READ_WRITE_TOKEN is configured, upload directly to Vercel Blob.
 * 2. Otherwise, upload to zero-cost cloud storage (Catbox) for a permanent public HTTPS URL with range streaming.
 * 3. Fallback to inlined Base64 Data URI (safe for all serverless environments with zero external dependencies).
 */
export async function storeVideo(
  filePath: string,
  filename: string
): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);

  // 1. Vercel Blob (if token provided in Vercel project environment)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      console.log(`[Storage] Uploading ${filename} to Vercel Blob...`);
      const blob = await put(`videos/${filename}`, fileBuffer, {
        access: 'public',
        contentType: 'video/mp4',
      });
      console.log(`[Storage] Successfully uploaded to Vercel Blob: ${blob.url}`);
      return blob.url;
    } catch (blobErr) {
      console.warn('[Storage] Vercel Blob upload failed, falling back:', blobErr);
    }
  }

  // 2. Zero-config cloud storage (Catbox)
  try {
    console.log(
      `[Storage] Uploading ${filename} (${fileBuffer.length} bytes) to zero-config cloud storage...`
    );
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append(
      'fileToUpload',
      new Blob([fileBuffer], { type: 'video/mp4' }),
      filename
    );

    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(12000),
    });

    if (res.ok) {
      const url = (await res.text()).trim();
      if (url.startsWith('https://files.catbox.moe/')) {
        console.log(`[Storage] Cloud storage upload succeeded: ${url}`);
        return url;
      }
    }
  } catch (cloudErr) {
    console.warn('[Storage] Cloud storage upload failed or timed out:', cloudErr);
  }

  // 3. Fallback: Base64 Data URI
  console.log(`[Storage] Falling back to Base64 Data URI (${fileBuffer.length} bytes)...`);
  return `data:video/mp4;base64,${fileBuffer.toString('base64')}`;
}
