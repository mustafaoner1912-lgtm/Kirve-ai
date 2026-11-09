import test from 'node:test';
import assert from 'node:assert/strict';
import { signSessionToken, verifySessionToken, isSameOriginRequest, validateFileSignature } from '../lib/security.js';

const secret = 'a-very-long-random-looking-session-secret-for-tests';

test('signed sessions reject tampering, expiry and old session epochs', () => {
  const now = 1_800_000_000;
  const token = signSessionToken(secret, now + 3600, 4, 'unit-test-nonce');
  assert.equal(verifySessionToken(token, secret, 4, now), true);
  assert.equal(verifySessionToken(token, secret, 5, now), false);
  assert.equal(verifySessionToken(token, secret, 4, now + 3601), false);
  const damaged = token.slice(0, -2) + 'aa';
  assert.equal(verifySessionToken(damaged, secret, 4, now), false);
});

test('state-changing requests require a matching same-origin source', () => {
  assert.equal(isSameOriginRequest({ origin: 'https://kirve.example', host: 'kirve.example', protocol: 'https', production: true }), true);
  assert.equal(isSameOriginRequest({ referer: 'https://kirve.example/chat', host: 'kirve.example', protocol: 'https', production: true }), true);
  assert.equal(isSameOriginRequest({ origin: 'https://attacker.example', host: 'kirve.example', production: true }), false);
  assert.equal(isSameOriginRequest({ host: 'kirve.example', production: true }), false);
  assert.equal(isSameOriginRequest({ origin: 'http://kirve.example', host: 'kirve.example', protocol: 'http', production: true }), false);
  assert.equal(isSameOriginRequest({ origin: 'https://kirve.example', host: 'kirve.example', protocol: 'http', production: true }), false);
  assert.equal(isSameOriginRequest({ origin: 'https://kirve.example', host: 'kirve.example', protocol: 'https', production: true }), true);
});

test('file signature checks reject extension spoofing', () => {
  assert.equal(validateFileSignature('good.pdf', Buffer.from('%PDF-1.7 test')).ok, true);
  assert.equal(validateFileSignature('fake.pdf', Buffer.from('<html>not pdf')).ok, false);
  assert.equal(validateFileSignature('good.png', Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])).ok, true);
  assert.equal(validateFileSignature('fake.png', Buffer.from('not an image')).ok, false);
  assert.equal(validateFileSignature('text.txt', Buffer.from([0x41,0x00,0x42])).ok, false);
});
