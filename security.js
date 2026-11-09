import crypto from 'node:crypto';

export function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

export function signSessionToken(secret, expiresAt, sessionEpoch = 0, nonce = crypto.randomUUID()) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters.');
  const payload = Buffer.from(`v1.${Number(expiresAt)}.${Number(sessionEpoch)}.${nonce}`).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifySessionToken(token, secret, expectedEpoch = 0, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (typeof token !== 'string' || !token || typeof secret !== 'string' || secret.length < 32) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (!safeEqual(signature, expected)) return false;
  try {
    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    const [version, expiryRaw, epochRaw, nonce] = decoded.split('.');
    const expiry = Number(expiryRaw);
    const epoch = Number(epochRaw);
    return version === 'v1' && Boolean(nonce) && Number.isSafeInteger(expiry) &&
      Number.isSafeInteger(epoch) && expiry > nowSeconds && epoch === Number(expectedEpoch);
  } catch {
    return false;
  }
}

export function isSameOriginRequest({ origin, referer, host, protocol, production = false }) {
  if (!host || typeof host !== 'string') return false;
  const source = typeof origin === 'string' && origin ? origin : (typeof referer === 'string' ? referer : '');
  if (!source) return false;
  try {
    const parsed = new URL(source);
    if (parsed.host.toLowerCase() !== host.toLowerCase()) return false;
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    if (production && (parsed.protocol !== 'https:' || protocol !== 'https')) return false;
    if (protocol && parsed.protocol !== `${protocol}:`) return false;
    if (origin && parsed.origin !== origin) return false;
    return true;
  } catch {
    return false;
  }
}

export function validateFileSignature(filename, buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return { ok: false, error: 'Dosya boş.' };
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  const starts = (...bytes) => bytes.every((value, index) => buffer[index] === value);
  const ascii = (start, length) => buffer.subarray(start, start + length).toString('ascii');
  if (['.jpg', '.jpeg'].includes(ext) && !starts(0xff, 0xd8, 0xff)) return { ok: false, error: 'JPEG dosyasının içeriği doğrulanamadı.' };
  if (ext === '.png' && !starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { ok: false, error: 'PNG dosyasının içeriği doğrulanamadı.' };
  if (ext === '.webp' && (ascii(0, 4) !== 'RIFF' || ascii(8, 4) !== 'WEBP')) return { ok: false, error: 'WEBP dosyasının içeriği doğrulanamadı.' };
  if (ext === '.pdf' && ascii(0, 5) !== '%PDF-') return { ok: false, error: 'PDF dosyasının içeriği doğrulanamadı.' };
  if (['.docx', '.xlsx', '.pptx', '.odt'].includes(ext) && !starts(0x50, 0x4b, 0x03, 0x04)) return { ok: false, error: 'Office/OpenDocument arşiv imzası doğrulanamadı.' };
  if (['.doc', '.xls', '.ppt'].includes(ext) && !starts(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)) return { ok: false, error: 'Eski Office dosyası imzası doğrulanamadı.' };
  if (ext === '.rtf' && !ascii(0, 5).startsWith('{\\rtf')) return { ok: false, error: 'RTF dosyasının içeriği doğrulanamadı.' };
  if (['.txt', '.md', '.json', '.html', '.xml', '.js', '.py', '.sql', '.log', '.srt', '.csv', '.tsv'].includes(ext) && buffer.includes(0)) return { ok: false, error: 'Metin dosyası beklenmeyen ikili veri içeriyor.' };
  return { ok: true };
}
