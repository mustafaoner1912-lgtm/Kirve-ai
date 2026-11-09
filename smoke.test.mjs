import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('PWA entry point exposes all wired controls', () => {
  const html = file('public/index.html');
  const js = file('public/app.js');
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  for (const id of ['newChat','tasksToggle','tabChats','chatList','taskList','memoryList','mic','speaker','send','prompt','attach','filePicker','attachmentTray','backupDownload']) {
    assert.ok(ids.has(id), `missing #${id}`);
    assert.ok(js.includes(`$("${id}")`), `unwired #${id}`);
  }
});

test('encrypted store schema includes conversations', () => {
  const server = file('server.js');
  assert.match(server, /memories: \[\], tasks: \[\], chats: \[\]/);
  assert.match(server, /chats: Array\.isArray\(parsed\.chats\) \? parsed\.chats : \[\]/);
  assert.match(server, /sessionEpoch: Number\.isSafeInteger\(parsed\.sessionEpoch\)/);
  assert.match(server, /app\.put\("\/api\/chats\/:id"/);
  assert.match(server, /store\.sessionEpoch = Number\(store\.sessionEpoch \|\| 0\) \+ 1/);
});

test('sensitive API key remains server-side', () => {
  const html = file('public/index.html');
  const js = file('public/app.js');
  assert.doesNotMatch(html + js, /sk-[A-Za-z0-9]{20,}/);
  assert.match(file('.gitignore'), /\.env/);
});

test('file uploads are scoped to a chat and sent as validated Responses inputs', () => {
  const server = file('server.js');
  assert.match(server, /app\.post\("\/api\/chats\/:id\/files"/);
  assert.match(server, /purpose\", \"user_data/);
  assert.match(server, /input_image/);
  assert.match(server, /input_file/);
  assert.match(server, /deleteOpenAIFile/);
  assert.match(server, /validateFileSignature\(filename, req\.body\)/);
});

test('web search citation parser follows current Responses API annotation nesting', () => {
  const server = file('server.js');
  assert.match(server, /const citation = annotation\.url_citation \|\| annotation/);
  assert.match(server, /citation\.url/);
});

test('CSRF validation fails closed when browser origin headers are absent', () => {
  const security = file('lib/security.js');
  assert.match(security, /if \(!source\) return false/);
  assert.match(security, /production && \(parsed\.protocol !== 'https:' \\|\| protocol !== 'https'\)/);
});

test('service worker never caches authenticated API responses', () => {
  const sw = file('public/sw.js');
  assert.match(sw, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(sw, /url\.pathname === "\/login"/);
});
