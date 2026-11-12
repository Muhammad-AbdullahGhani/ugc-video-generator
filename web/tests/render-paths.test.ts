import path from 'path';
import { describe, expect, it } from 'vitest';
import { getRendersDir } from '@/lib/render-paths';

describe('render directory', () => {
  /**
   * Regression guard. Renders used to be written to `public/renders`, and
   * everything in `public/` is served statically by Next at its own path — so
   * `/renders/ugc_<id>.mp4` returned the file with no signature, bypassing the
   * HMAC check on `/api/video/[filename]` entirely. The directory must stay
   * outside anything statically served.
   */
  it('is never inside the statically served public directory', async () => {
    const dir = await getRendersDir();
    const segments = dir.split(/[\\/]/);

    expect(segments).not.toContain('public');
    expect(path.isAbsolute(dir)).toBe(true);
  });

  it('is stable across calls', async () => {
    expect(await getRendersDir()).toBe(await getRendersDir());
  });
});
