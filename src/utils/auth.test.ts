import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, loginAsDemoStudent } from './auth.js';

test('hashPassword hashes input consistently and verifyPassword validates', () => {
  const hash = hashPassword('mySecretPass123');
  assert.ok(hash !== 'mySecretPass123');
  assert.equal(verifyPassword('mySecretPass123', hash), true);
  assert.equal(verifyPassword('wrongPass', hash), false);
});

test('loginAsDemoStudent generates a valid student session with demo user properties', () => {
  const demo = loginAsDemoStudent('সাকিব হাসান');
  assert.equal(demo.name, 'সাকিব হাসান');
  assert.equal(demo.studentClass, '10');
  assert.equal(demo.isVerified, true);
  assert.ok((demo.totalXP ?? 0) >= 0);
});
