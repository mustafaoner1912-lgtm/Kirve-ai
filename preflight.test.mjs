import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts/preflight.mjs');

test('production preflight rejects missing or placeholder secrets', () => {
  const result = spawnSync(process.execPath, [script], { cwd: root, env: { PATH: process.env.PATH }, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /OPENAI_API_KEY/);
});

test('production preflight accepts distinct strong secrets without printing values', () => {
  const env = {
    PATH: process.env.PATH,
    OPENAI_API_KEY: 'sk-test-secret-value-that-must-not-print',
    APP_PASSWORD: 'strong-unique-password-123',
    SESSION_SECRET: 'session-secret-0123456789-0123456789',
    STORE_ENCRYPTION_KEY: 'different-encryption-key-0123456789'
  };
  const result = spawnSync(process.execPath, [script], { cwd: root, env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /preflight passed/);
  assert.doesNotMatch(result.stdout + result.stderr, /sk-test-secret/);
});

test('production preflight rejects reused session and encryption secrets', () => {
  const shared = 'same-secret-0123456789-0123456789';
  const env = {
    PATH: process.env.PATH,
    OPENAI_API_KEY: 'sk-test',
    APP_PASSWORD: 'strong-unique-password-123',
    SESSION_SECRET: shared,
    STORE_ENCRYPTION_KEY: shared
  };
  const result = spawnSync(process.execPath, [script], { cwd: root, env, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /must be different/);
});


test('production preflight rejects placeholder OpenAI credentials', () => {
  const env = {
    PATH: process.env.PATH,
    OPENAI_API_KEY: 'your_openai_api_key_here',
    APP_PASSWORD: 'strong-unique-password-123',
    SESSION_SECRET: 'session-secret-0123456789-0123456789',
    STORE_ENCRYPTION_KEY: 'different-encryption-key-0123456789'
  };
  const result = spawnSync(process.execPath, [script], { cwd: root, env, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /OPENAI_API_KEY/);
});


test('production preflight rejects an application password reused as a server secret', () => {
  const shared = 'same-strong-secret-0123456789';
  const env = {
    PATH: process.env.PATH,
    OPENAI_API_KEY: 'sk-test',
    APP_PASSWORD: shared,
    SESSION_SECRET: shared,
    STORE_ENCRYPTION_KEY: 'different-encryption-key-0123456789'
  };
  const result = spawnSync(process.execPath, [script], { cwd: root, env, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /APP_PASSWORD and SESSION_SECRET must be different/);
});
