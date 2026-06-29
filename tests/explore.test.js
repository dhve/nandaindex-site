'use strict';
const assert = require('node:assert');
const E = require('../explore.js');

// dataset spans all six discovery-mechanism categories, >9 entries for pagination
const cats = new Set(E.DATA.map((r) => r.cat));
['catalog', 'dns-aid', 'card', 'directory', 'gateway', 'emerging'].forEach((c) =>
  assert.ok(cats.has(c), `dataset missing category ${c}`));
assert.ok(E.DATA.length > 9, 'need >9 records to exercise pagination');

// every record carries the fields the UI renders
E.DATA.forEach((r) => {
  ['key', 'name', 'cat', 'identity', 'mediaType', 'description', 'updated'].forEach((f) =>
    assert.ok(r[f] !== undefined, `record ${r.key} missing ${f}`));
  assert.ok(Array.isArray(r.tags) && Array.isArray(r.agents) && Array.isArray(r.caps));
  assert.ok(r.agents.length >= 1, `record ${r.key} needs an agent for the trace`);
});

// category derivation from media type
assert.equal(E.categoryOf({ cat: 'dns-aid' }), 'dns-aid');
assert.equal(E.categoryOf({ mediaType: 'application/ai-catalog+json' }), 'catalog');

// search filter (case-insensitive, matches name/identity/domain/description)
const bakery = E.applyFilters(E.DATA, { search: 'moonbakery', cats: new Set(), sort: 'recent' });
assert.ok(
  bakery.length >= 1 &&
    bakery.every((r) => /moonbakery/i.test(r.name + r.identity + (r.domain || '') + r.description)),
  'search should match moonbakery',
);

// category filter
const onlyCard = E.applyFilters(E.DATA, { search: '', cats: new Set(['card']), sort: 'recent' });
assert.ok(onlyCard.length >= 1 && onlyCard.every((r) => r.cat === 'card'), 'card filter');

// sort: name A–Z
const byName = E.sortRecords(E.DATA.slice(), 'name');
for (let i = 1; i < byName.length; i++)
  assert.ok(byName[i - 1].name.localeCompare(byName[i].name) <= 0, 'name sort order');

// sort: verified first
const byVer = E.sortRecords(E.DATA.slice(), 'verified');
const firstUnverified = byVer.findIndex((r) => !r.verified);
if (firstUnverified !== -1)
  assert.ok(byVer.slice(firstUnverified).every((r) => !r.verified), 'verified-first order');

// exports: AI Catalog entry shape: identifier first, then mediaType, then metadata
const rec = E.DATA[0];
const parsed = JSON.parse(E.toJSON(rec));
assert.deepStrictEqual(Object.keys(parsed).slice(0, 2), ['identifier', 'mediaType']);
assert.equal(parsed.identifier, rec.identity, 'JSON identifier matches');
assert.ok(parsed.url || parsed.data, 'entry points to a url or inline routing data');
assert.equal(typeof parsed.metadata, 'object', 'entry carries metadata');
console.log('ok - explore.js logic', E.DATA.length, 'records');

// markdown export
const md = E.toMarkdown(rec);
assert.ok(md.startsWith('# '), 'markdown export should start with an H1 title');
assert.ok(md.includes(rec.identity), 'markdown must include the identifier');
console.log('ok - export shapes');
