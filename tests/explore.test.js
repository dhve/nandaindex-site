'use strict';
const assert = require('node:assert');
const E = require('../explore.js');

// dataset spans all six categories, >9 entries for pagination
const cats = new Set(E.DATA.map((r) => r.cat));
['enterprise', 'dns', 'smb', 'personal', 'mcp', 'skill'].forEach((c) =>
  assert.ok(cats.has(c), `dataset missing category ${c}`));
assert.ok(E.DATA.length > 9, 'need >9 records to exercise pagination');

// every record carries the fields the UI renders
E.DATA.forEach((r) => {
  ['key', 'name', 'cat', 'identity', 'mediaType', 'description', 'updated'].forEach((f) =>
    assert.ok(r[f] !== undefined, `record ${r.key} missing ${f}`));
  assert.ok(Array.isArray(r.tags) && Array.isArray(r.agents) && Array.isArray(r.caps));
});

// category derivation
assert.equal(E.categoryOf({ cat: 'mcp' }), 'mcp');

// search filter (case-insensitive, matches name/identity/domain/description)
const acme = E.applyFilters(E.DATA, { search: 'acme', cats: new Set(), sort: 'recent' });
assert.ok(
  acme.length >= 1 &&
    acme.every((r) => /acme/i.test(r.name + r.identity + (r.domain || '') + r.description)),
  'search should match acme',
);

// category filter
const onlyMcp = E.applyFilters(E.DATA, { search: '', cats: new Set(['mcp']), sort: 'recent' });
assert.ok(onlyMcp.length >= 1 && onlyMcp.every((r) => r.cat === 'mcp'), 'mcp filter');

// sort: name A–Z
const byName = E.sortRecords(E.DATA.slice(), 'name');
for (let i = 1; i < byName.length; i++)
  assert.ok(byName[i - 1].name.localeCompare(byName[i].name) <= 0, 'name sort order');

// sort: verified first
const byVer = E.sortRecords(E.DATA.slice(), 'verified');
const firstUnverified = byVer.findIndex((r) => !r.verified);
if (firstUnverified !== -1)
  assert.ok(byVer.slice(firstUnverified).every((r) => !r.verified), 'verified-first order');

// exports
const rec = E.DATA[0];
const json = E.toJSON(rec);
assert.equal(typeof json, 'string');
assert.deepStrictEqual(Object.keys(JSON.parse(json))[0], 'identifier');
assert.ok(E.toMarkdown(rec).includes(rec.name), 'markdown includes name');

console.log('ok - explore.js logic', E.DATA.length, 'records');

// export shapes
const md = E.toMarkdown(E.DATA[0]);
assert.ok(md.startsWith('# '), 'markdown export should start with an H1 title');
assert.ok(md.includes(E.DATA[0].identity), 'markdown must include the identifier');
const parsed = JSON.parse(E.toJSON(E.DATA[0]));
assert.equal(parsed.identifier, E.DATA[0].identity, 'JSON identifier matches');
assert.equal(typeof parsed.email_verified, 'boolean', 'JSON carries email_verified');
console.log('ok - export shapes');
