// How an image-only build decides what it does not carry (src/builds.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const { canonical, changedSections } = require('../../src/builds');
const { freshSample } = require('../helpers/fixtures');

test('canonical JSON ignores key order (jsonb reorders keys) but not array order', () => {
  assert.equal(canonical({ b: 1, a: { d: [1, 2], c: null } }), canonical({ a: { c: null, d: [1, 2] }, b: 1 }));
  assert.notEqual(canonical([1, 2]), canonical([2, 1]));
  assert.equal(canonical(undefined), canonical(null));
});

test('changedSections lists only the database sections that differ', () => {
  const a = freshSample();
  // the same spec with every object's keys reversed, as jsonb might return it
  const reversed = JSON.parse(JSON.stringify(a), (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).reverse()) : v,
  );
  assert.deepEqual(changedSections(a, reversed), []);

  const b = structuredClone(a);
  b.organization.contacts[0].contact_phone = '+91-1';
  b.initial_users[1].user_mobile = '+91-2';
  assert.deepEqual(changedSections(a, b).map((c) => c.section), ['organization', 'initial_users']);
  assert.match(changedSections(a, b)[0].label, /contacts/);
});
