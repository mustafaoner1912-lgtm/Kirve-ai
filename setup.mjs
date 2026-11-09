import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env');

function askHidden(label) {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    if (!input.isTTY || typeof input.setRawMode !== 'function') {
      reject(new Error('Kurulum sihirbazı etkileşimli terminal gerektirir. Windows için KIRVE-AI-KUR.bat dosyasını aç.'));
      return;
    }
    let value = '';
    const wasRaw = input.isRaw;
    process.stdout.write(label);
    input.setRawMode(true);
    input.setEncoding('utf8');
    input.resume();
    const cleanup = () => {
      input.off('data', onData);
      input.setRawMode(Boolean(wasRaw));
      input.pause();
      process.stdout.write('\n');
    };
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\u0003') {
          cleanup();
          reject(new Error('Kurulum kullanıcı tarafından iptal edildi.'));
          return;
        }
        if (char === '\r' || char === '\n') {
          cleanup();
          resolve(value);
          return;
        }
        if (char === '\u007f' || char === '\b') {
          value = value.slice(0, -1);
          process.stdout.write('\b \b');
        } else if (char >= ' ') {
          value += char;
          process.stdout.write('*');
        }
      }
    };
    input.on('data', onData);
  });
}

function randomSecret(bytes = 48) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function envLine(name, value) {
  return `${name}=${JSON.stringify(value)}`;
}

if (fs.existsSync(envPath)) {
  console.error('.env zaten mevcut. Güvenlik için üzerine yazılmadı.');
  process.exit(1);
}

try {
  console.log('\nKİRVE AI ilk kurulum');
  console.log('OpenAI API anahtarın yalnızca bu bilgisayardaki .env dosyasına yazılır; ekranda gösterilmez.');
  const apiKey = (await askHidden('OpenAI API anahtarı: ')).trim();
  if (apiKey.length < 20 || /\s/.test(apiKey)) throw new Error('API anahtarı biçimi geçersiz görünüyor.');

  const appPassword = randomSecret(24);
  const values = [
    ['NODE_ENV', 'production'],
    ['PORT', '3000'],
    ['OPENAI_API_KEY', apiKey],
    ['OPENAI_MODEL', 'gpt-6-astra'],
    ['OPENAI_REASONING_EFFORT', 'high'],
    ['OPENAI_REALTIME_MODEL', 'gpt-realtime-2.1'],
    ['OPENAI_REALTIME_VOICE', 'marin'],
    ['ENABLE_WEB_SEARCH', 'true'],
    ['APP_PASSWORD', appPassword],
    ['SESSION_SECRET', randomSecret()],
    ['STORE_ENCRYPTION_KEY', randomSecret()],
    ['DATA_DIR', './data']
  ];
  const body = `${values.map(([key, value]) => envLine(key, value)).join('\n')}\n`;
  fs.writeFileSync(envPath, body, { flag: 'wx', mode: 0o600 });
  try { fs.chmodSync(envPath, 0o600); } catch {}
  console.log('\nKurulum ayarları .env dosyasına kaydedildi.');
  console.log(`Uygulama giriş parolan (şimdi güvenli yere kaydet): ${appPassword}`);
  console.log('Veri şifreleme anahtarı otomatik üretildi. .env dosyasının güvenli yedeğini al; kaybolursa kayıtlı veriler açılamaz.');
  console.log('\nBaşlatılıyor: http://localhost:3000/login');
} catch (error) {
  console.error(`Kurulum tamamlanamadı: ${error.message}`);
  process.exit(1);
}
