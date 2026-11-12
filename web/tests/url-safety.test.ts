import { describe, expect, it } from 'vitest';
import { extractUrl } from '@/lib/url-detector';
import { isBlockedAddress, assertPublicUrl } from '@/lib/safe-fetch';
import { AppError } from '@/lib/errors';

describe('extractUrl', () => {
  it('finds explicit and bare URLs', () => {
    expect(extractUrl('check out https://stripe.com/pricing please')).toBe(
      'https://stripe.com/pricing'
    );
    expect(extractUrl('try calai.app')).toBe('https://calai.app/');
    expect(extractUrl('www.notion.so')).toBe('https://www.notion.so/');
  });

  it('trims trailing punctuation', () => {
    expect(extractUrl('look at https://linear.app.')).toBe('https://linear.app/');
  });

  it('returns null when there is no URL', () => {
    expect(extractUrl('hey, what can you do?')).toBeNull();
    expect(extractUrl('')).toBeNull();
  });

  it('rejects obvious local targets', () => {
    expect(extractUrl('http://localhost:3000/admin')).toBeNull();
    expect(extractUrl('http://printer.local/status')).toBeNull();
  });

  it('rejects embedded credentials', () => {
    expect(extractUrl('https://user:pass@evil.com/')).toBeNull();
  });

  it('skips a non-http scheme', () => {
    expect(extractUrl('file:///etc/passwd')).toBeNull();
  });
});

describe('isBlockedAddress', () => {
  it('blocks the cloud metadata address', () => {
    // The canonical SSRF target.
    expect(isBlockedAddress('169.254.169.254')).toBe(true);
  });

  it('blocks loopback and private ranges', () => {
    for (const ip of ['127.0.0.1', '10.0.0.5', '172.16.1.1', '172.31.255.255', '192.168.1.1', '0.0.0.0']) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
  });

  it('blocks carrier-grade NAT, benchmarking and multicast', () => {
    for (const ip of ['100.64.0.1', '198.18.0.1', '224.0.0.1', '255.255.255.255']) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
  });

  it('allows public addresses', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '172.32.0.1', '192.167.1.1', '99.99.99.99']) {
      expect(isBlockedAddress(ip), ip).toBe(false);
    }
  });

  it('blocks IPv6 loopback, link-local and unique-local', () => {
    for (const ip of ['::1', '::', 'fe80::1', 'fd00::1', 'fc00::1', 'ff02::1']) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
  });

  it('judges IPv4-mapped IPv6 by its IPv4 half', () => {
    expect(isBlockedAddress('::ffff:169.254.169.254')).toBe(true);
    expect(isBlockedAddress('::ffff:8.8.8.8')).toBe(false);
  });

  it('refuses anything unparseable', () => {
    expect(isBlockedAddress('not-an-ip')).toBe(true);
    expect(isBlockedAddress('')).toBe(true);
  });
});

describe('assertPublicUrl', () => {
  const expectRejection = async (url: string) => {
    await expect(assertPublicUrl(url)).rejects.toBeInstanceOf(AppError);
  };

  it('rejects IP literals inside the network without touching DNS', async () => {
    await expectRejection('http://169.254.169.254/latest/meta-data/');
    await expectRejection('http://127.0.0.1:8080/');
    await expectRejection('http://[::1]/');
  });

  it('rejects non-http schemes and credentialed URLs', async () => {
    await expectRejection('file:///etc/passwd');
    await expectRejection('gopher://evil.com/');
    await expectRejection('https://user:pass@example.com/');
  });

  it('rejects a hostname that cannot be public', async () => {
    await expectRejection('http://localhost/');
    await expectRejection('http://intranet/');
  });
});
