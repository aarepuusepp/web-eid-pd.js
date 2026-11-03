import test from 'node:test';
import assert from 'node:assert/strict';
import { ErrorCode } from '../dist/es/web-eid-decrypt.js';

test('ErrorCode contains expected client decrypt codes', () => {
  assert.equal(ErrorCode.ERR_EIDPD_EXTENSION_UNAVAILABLE, 'ERR_EIDPD_EXTENSION_UNAVAILABLE');
  assert.equal(ErrorCode.ERR_EIDPD_CARD_NOT_FOUND, 'ERR_EIDPD_CARD_NOT_FOUND');
  assert.equal(ErrorCode.ERR_EIDPD_ACTION_PENDING, 'ERR_EIDPD_ACTION_PENDING');
});
