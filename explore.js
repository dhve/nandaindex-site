/* NANDA Index, Explore catalog engine.
   Vanilla JS. Pure data/logic is unit-tested under Node; DOM rendering and the
   resolution-path animation (added in later tasks) run only in a browser.
   Example identities are fictional; no real organisations or personal data. */
(function () {
  'use strict';

  var REDUCED =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CAT_KEYS = ['catalog', 'dns-aid', 'card', 'directory', 'gateway', 'emerging'];
  var CAT_LABEL = {
    catalog: 'AI Catalog',
    'dns-aid': 'DNS-AID',
    card: 'Hosted Card',
    directory: 'Directory',
    gateway: 'Gateway',
    emerging: 'Telecom / IoT / Sovereign',
  };

  /* ---------------- the 4 resolution hops (ported from the Resolve trace) -------------- */
  var HOPS = [
    { n: 1, title: 'NandaIndex', q: 'Map identity to discovery object.', api: 'GET /resolve?identifier=…' },
    { n: 2, title: 'Discovery object', q: 'AI Catalog, DNS-AID, gateway, or hosted card.', api: 'GET <entry.url | data>' },
    { n: 3, title: 'Agent Card', q: 'Endpoint and auth requirements.', api: 'GET <agent_card.url>' },
    { n: 4, title: 'Runtime', q: 'Execute with required auth.', api: 'POST <runtime.url>' },
  ];

  var MEDIA = {
    catalog: 'application/ai-catalog+json',
    'dns-aid': 'application/vnd.dns-aid+json',
    card: 'application/a2a-agent-card+json',
  };

  // Technical sub-label for the left mechanism menu: the media type or role family each
  // mechanism resolves to.
  var MECH_HINT = {
    catalog: 'application/ai-catalog+json',
    'dns-aid': 'application/vnd.dns-aid+json',
    card: 'application/a2a-agent-card+json',
    directory: 'ADS · ARD · platform',
    gateway: 'gateway · ans / did',
    emerging: 'telecom · iot · sovereign',
  };

  /* ---------------- index records (NandaIndex entries)
     Each entry is an AI Catalog Catalog Entry mapping a stable identity to the correct next
     discovery object. The first four are the canonical entity types (enterprise AI Catalog,
     enterprise DNS-AID, SMB hosted card, individual hosted card); the rest represent the
     discovery mechanisms that bridge through the switchboard. -------------- */
  var DATA = [
    {
      key: 'example-com', mono: 'EX', name: 'example.com', cat: 'catalog', verified: true, status: 'active',
      displayName: 'Example.com Enterprise AI Catalog',
      identity: 'urn:ai:domain:example.com', domain: 'example.com',
      host: 'example.com /.well-known', region: 'n/a', ttl: 3600, version: 'n/a',
      mediaType: MEDIA.catalog, identityType: 'dns',
      url: 'https://example.com/.well-known/ai-catalog.json',
      publisher: { identifier: 'urn:ai:domain:example.com', displayName: 'Example.com', identityType: 'dns' },
      meta: {
        'org.projectnanda.resolutionRole': 'nested-ai-catalog',
        'org.projectnanda.preferredDiscovery': 'ai-catalog',
        'org.projectnanda.nandaIndexRole': 'optional-fallback-entry',
      },
      description: 'Enterprise, pure AI Catalog. Published at https://example.com/.well-known/ai-catalog.json and fetched directly; NandaIndex is not in the critical path. The entry is optional, useful for fallback, federation visibility, and anti-squatting.',
      tags: ['ai-catalog', 'well-known', 'enterprise'],
      agents: [{ name: 'ai-catalog', role: 'nested-ai-catalog' }],
      caps: ['nested-ai-catalog'],
      created: '2026-05-01', updated: '2026-06-22',
    },
    {
      key: 'skyblue-refunds', mono: 'SB', name: 'skyblue.com · refunds', cat: 'dns-aid', verified: true, status: 'active',
      displayName: 'SkyBlue Refunds Agent DNS-AID Pointer',
      identity: 'urn:ai:domain:skyblue.com:agent:refunds', domain: 'skyblue.com',
      host: 'skyblue.com DNS', region: 'n/a', ttl: 600, version: 'n/a',
      mediaType: MEDIA['dns-aid'], identityType: 'dns',
      data: {
        method: 'dns-aid',
        domain: 'skyblue.com',
        organizationDiscoveryName: '_agents.skyblue.com',
        agentDiscoveryName: 'refunds._agents.skyblue.com',
        serviceHint: 'refunds',
        expectedResult: 'DNS-AID returns a gateway, catalog, or agent-card pointer controlled by skyblue.com',
      },
      publisher: { identifier: 'urn:ai:domain:skyblue.com', displayName: 'SkyBlue Airlines', identityType: 'dns' },
      meta: {
        'org.projectnanda.resolutionRole': 'dns-aid-pointer',
        'org.projectnanda.preferredDiscovery': 'dns-aid',
        'org.projectnanda.authoritativeSystem': 'skyblue.com DNS',
        'org.projectnanda.nandaIndexRole': 'federated-pointer',
      },
      description: 'Enterprise on DNS-AID at refunds._agents.skyblue.com. The entry carries inline routing data rather than a URL. NandaIndex makes the DNS-AID path reachable from the switchboard without replacing it.',
      tags: ['dns-aid', 'travel', 'refunds'],
      agents: [{ name: 'refunds', role: 'dns-aid-pointer' }],
      caps: ['dns-aid-pointer'],
      created: '2026-04-18', updated: '2026-06-19',
    },
    {
      key: 'moonbakery-orders', mono: 'MB', name: 'moonbakery.com · orders', cat: 'card', verified: true, status: 'active',
      displayName: 'Moon Bakery Orders Agent',
      identity: 'urn:ai:domain:moonbakery.com:agent:orders', domain: 'moonbakery.com',
      host: 'host39.org', region: 'AWS', ttl: 900, version: 'n/a',
      mediaType: MEDIA.card, identityType: 'dns',
      url: 'https://agentcards.host39.org/moonbakery.com/orders.json',
      publisher: { identifier: 'urn:ai:domain:moonbakery.com', displayName: 'Moon Bakery', identityType: 'dns' },
      meta: {
        'org.projectnanda.resolutionRole': 'smb-agent-card',
        'org.projectnanda.preferredDiscovery': 'nandaindex',
        'org.projectnanda.agentCardHost': 'host39.org',
        'org.projectnanda.runtime.provider': 'AWS',
        'org.projectnanda.runtime.url': 'https://moonbakery-orders.aws.example.com',
        'org.projectnanda.auth.metadata': 'public',
        'org.projectnanda.auth.execution': 'payment_or_session_token_required',
      },
      description: 'SMB hosted card. Owns moonbakery.com but runs no enterprise infrastructure. Runtime, agent card, and domain sit with three separate providers, a demonstration of permissionless deployment: no enterprise gateway, no DNS certificate.',
      tags: ['smb', 'a2a-card', 'orders'],
      agents: [{ name: 'orders', role: 'smb-agent-card' }],
      caps: ['smb-agent-card'],
      created: '2026-05-20', updated: '2026-06-24',
    },
    {
      key: 'john-hotmail', mono: 'JH', name: 'john@hotmail.com', cat: 'card', verified: false, status: 'pending',
      displayName: "John's Personal Agent",
      identity: 'urn:ai:email:john@hotmail.com', domain: null,
      host: 'host39.org', region: 'Azure', ttl: 900, version: 'n/a',
      mediaType: MEDIA.card, identityType: 'email',
      url: 'https://agentcards.host39.org/personal/john%40hotmail.com/card.json',
      publisher: { identifier: 'urn:ai:email:john@hotmail.com', displayName: 'John', identityType: 'email' },
      meta: {
        'org.projectnanda.resolutionRole': 'personal-agent-card',
        'org.projectnanda.preferredDiscovery': 'nandaindex',
        'org.projectnanda.agentCardHost': 'host39.org',
        'org.projectnanda.runtime.provider': 'Azure',
        'org.projectnanda.runtime.url': 'https://john-agent.azure.com',
        'org.projectnanda.auth.metadata': 'public_minimal',
        'org.projectnanda.auth.execution': 'user_consent_required',
      },
      description: 'Individual with no domain. The email address is the stable identity. Runtime on Azure, agent card on a third-party host; no domain ownership required.',
      tags: ['individual', 'a2a-card', 'personal'],
      agents: [{ name: 'card', role: 'personal-agent-card' }],
      caps: ['personal-agent-card'],
      created: '2026-06-02', updated: '2026-06-25',
    },
    {
      key: 'agntcy-ads', mono: 'AG', name: 'AGNTCY Agent Directory (ADS)', cat: 'directory', verified: true, status: 'active',
      displayName: 'AGNTCY Agent Directory (ADS)',
      identity: 'urn:ai:system:agntcy:agent-directory', domain: null,
      host: 'AGNTCY ADS', region: 'DHT', ttl: 3600, version: 'n/a',
      mediaType: MEDIA.catalog, identityType: 'system',
      url: 'https://directory.agntcy.org/ard',
      publisher: { identifier: 'urn:ai:system:agntcy', displayName: 'AGNTCY', identityType: 'system' },
      meta: {
        'org.projectnanda.resolutionRole': 'agntcy-ads',
        'org.projectnanda.preferredDiscovery': 'ard',
        'org.projectnanda.addressing': 'oci-aligned',
        'org.projectnanda.integrity': 'sigstore',
      },
      description: 'Decentralized DHT routing; OCI storage; verifiable integrity. The backend registry uses IPFS Kademlia DHT for decentralized routing, OCI-aligned content addressing for immutable storage, and Sigstore-backed integrity verification.',
      tags: ['agntcy', 'dht', 'oci'],
      agents: [{ name: 'agent-directory', role: 'agntcy-ads' }],
      caps: ['agntcy-ads'],
      created: '2026-03-10', updated: '2026-06-17',
    },
    {
      key: 'ard-finder', mono: 'AR', name: 'ARD finder API', cat: 'directory', verified: true, status: 'active',
      displayName: 'ARD Finder API',
      identity: 'urn:ai:system:ard:finder', domain: null,
      host: 'ARD read-only API', region: 'n/a', ttl: 3600, version: 'n/a',
      mediaType: MEDIA.catalog, identityType: 'system',
      url: 'https://ard.projectnanda.org/find',
      publisher: { identifier: 'urn:ai:system:ard', displayName: 'ARD', identityType: 'system' },
      meta: { 'org.projectnanda.resolutionRole': 'ard', 'org.projectnanda.preferredDiscovery': 'ard' },
      description: 'Read-only standard finder API across conforming registries. Allows external agents to search the directory through the same interface used with other ARD-conforming systems (Hugging Face, GitHub).',
      tags: ['ard', 'finder-api'],
      agents: [{ name: 'finder', role: 'ard' }],
      caps: ['ard'],
      created: '2026-03-22', updated: '2026-06-11',
    },
    {
      key: 'platform-registry', mono: 'PR', name: 'Platform Registry', cat: 'directory', verified: true, status: 'active',
      displayName: 'Platform Registry',
      identity: 'urn:ai:system:platform:registry', domain: null,
      host: 'Platform registry', region: 'n/a', ttl: 3600, version: 'n/a',
      mediaType: MEDIA.catalog, identityType: 'system',
      url: 'https://registry.platform.example.com/ard',
      publisher: { identifier: 'urn:ai:system:platform', displayName: 'Platform Registry', identityType: 'system' },
      meta: { 'org.projectnanda.resolutionRole': 'platform-registry' },
      description: 'Onboarding, hosting, billing, developer experience. Bridged for cross-platform and cross-community discovery.',
      tags: ['platform', 'registry'],
      agents: [{ name: 'registry', role: 'platform-registry' }],
      caps: ['platform-registry'],
      created: '2026-04-05', updated: '2026-06-09',
    },
    {
      key: 'enterprise-gateway', mono: 'GW', name: 'Enterprise Gateway', cat: 'gateway', verified: true, status: 'active',
      displayName: 'Enterprise Gateway',
      identity: 'urn:ai:system:gateway:enterprise', domain: null,
      host: 'Enterprise gateway', region: 'n/a', ttl: 600, version: 'n/a',
      mediaType: MEDIA.catalog, identityType: 'system',
      url: 'https://gateway.enterprise.example.com/.well-known/agents',
      publisher: { identifier: 'urn:ai:system:gateway', displayName: 'Enterprise Gateway', identityType: 'system' },
      meta: { 'org.projectnanda.resolutionRole': 'gateway' },
      description: 'Access control, privacy, throttling, compliance. Bridged for discovery of agents not behind that gateway.',
      tags: ['gateway', 'access-control', 'compliance'],
      agents: [{ name: 'gateway', role: 'gateway' }],
      caps: ['gateway'],
      created: '2026-04-12', updated: '2026-06-14',
    },
    {
      key: 'ans-did', mono: 'AN', name: 'ANS / DIDs', cat: 'gateway', verified: true, status: 'active',
      displayName: 'ANS / DIDs',
      identity: 'urn:ai:system:ans:did', domain: null,
      host: 'ANS / DID resolver', region: 'n/a', ttl: 3600, version: 'n/a',
      mediaType: MEDIA.catalog, identityType: 'system',
      url: 'https://resolver.ans.example.com',
      publisher: { identifier: 'urn:ai:system:ans', displayName: 'ANS / DID', identityType: 'system' },
      meta: { 'org.projectnanda.resolutionRole': 'ans-did' },
      description: 'Identity and ownership proof. Bridged for resource indexing and routing.',
      tags: ['ans', 'did', 'identity'],
      agents: [{ name: 'ans', role: 'ans-did' }],
      caps: ['ans-did'],
      created: '2026-04-20', updated: '2026-06-08',
    },
    {
      key: 'telecom-registry', mono: 'TE', name: 'Telecom Registry', cat: 'emerging', verified: false, status: 'pending',
      displayName: 'Telecom Registry',
      identity: 'urn:ai:system:telecom:registry', domain: null,
      host: 'Carrier registry', region: 'n/a', ttl: 3600, version: 'n/a',
      mediaType: MEDIA.catalog, identityType: 'system',
      url: 'https://registry.telecom.example.com/ard',
      publisher: { identifier: 'urn:ai:system:telecom', displayName: 'Telecom Operator', identityType: 'system' },
      meta: { 'org.projectnanda.resolutionRole': 'telecom-registry' },
      description: 'Telecom registries will integrate agents into carrier infrastructure. Sector-specific governance and carrier integration, bridged into the global index.',
      tags: ['telecom', 'carrier'],
      agents: [{ name: 'carrier-registry', role: 'telecom-registry' }],
      caps: ['telecom-registry'],
      created: '2026-06-01', updated: '2026-06-06',
    },
    {
      key: 'iot-edgeai', mono: 'IO', name: 'IoT / EdgeAI Registry', cat: 'emerging', verified: false, status: 'pending',
      displayName: 'IoT / EdgeAI Registry',
      identity: 'urn:ai:system:iot:edgeai', domain: null,
      host: 'IoT / EdgeAI registry', region: 'n/a', ttl: 3600, version: 'n/a',
      mediaType: MEDIA.catalog, identityType: 'system',
      url: 'https://registry.iot-edge.example.com/ard',
      publisher: { identifier: 'urn:ai:system:iot', displayName: 'IoT / EdgeAI Registry', identityType: 'system' },
      meta: { 'org.projectnanda.resolutionRole': 'iot-registry' },
      description: 'IoT and EdgeAI systems will develop their own lightweight discovery mechanisms. Bridged into the global index through a single entry.',
      tags: ['iot', 'edgeai'],
      agents: [{ name: 'edge-registry', role: 'iot-registry' }],
      caps: ['iot-registry'],
      created: '2026-06-03', updated: '2026-06-07',
    },
    {
      key: 'sovereign-directory', mono: 'SO', name: 'Sovereign National Directory', cat: 'emerging', verified: false, status: 'pending',
      displayName: 'Sovereign National Directory',
      identity: 'urn:ai:system:sovereign:national-directory', domain: null,
      host: 'National directory', region: 'n/a', ttl: 3600, version: 'n/a',
      mediaType: MEDIA.catalog, identityType: 'system',
      url: 'https://directory.sovereign.example.gov/ard',
      publisher: { identifier: 'urn:ai:system:sovereign', displayName: 'National Authority', identityType: 'system' },
      meta: { 'org.projectnanda.resolutionRole': 'sovereign-registry' },
      description: 'Sovereign national directories will be required by some governments. Sector-specific governance and national compliance, bridged into the global index.',
      tags: ['sovereign', 'national', 'compliance'],
      agents: [{ name: 'national-directory', role: 'sovereign-registry' }],
      caps: ['sovereign-registry'],
      created: '2026-06-04', updated: '2026-06-05',
    },
  ];
  /* ---------------- pure logic ---------------- */
  function categoryOf(record) {
    if (record && CAT_KEYS.indexOf(record.cat) !== -1) return record.cat;
    // Fallback: derive from media_type when cat is absent.
    var mt = (record && (record.mediaType || record.media_type)) || '';
    if (mt === MEDIA['dns-aid']) return 'dns-aid';
    if (mt === MEDIA.card) return 'card';
    if (mt === MEDIA.catalog) return 'catalog';
    return null;
  }

  function sortRecords(list, sort) {
    var arr = list.slice();
    if (sort === 'name') {
      arr.sort(function (a, b) { return a.name.localeCompare(b.name); });
    } else if (sort === 'verified') {
      arr.sort(function (a, b) { return (b.verified ? 1 : 0) - (a.verified ? 1 : 0); });
    } else {
      // 'recent' (default): most recently updated first
      arr.sort(function (a, b) { return new Date(b.updated) - new Date(a.updated); });
    }
    return arr;
  }

  function applyFilters(data, opts) {
    opts = opts || {};
    var q = (opts.search || '').trim().toLowerCase();
    var cats = opts.cats || new Set();
    var list = data.filter(function (r) {
      if (cats.size > 0 && !cats.has(r.cat)) return false;
      if (q) {
        var hay = (r.name + ' ' + r.identity + ' ' + (r.domain || '') + ' ' + r.description).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    return sortRecords(list, opts.sort || 'recent');
  }

  function toJSON(record) {
    // AI Catalog-compatible index record: identifier maps to a discovery object.
    var rec = { identifier: record.identity };
    if (record.displayName) rec.displayName = record.displayName;
    rec.mediaType = record.mediaType;
    if (record.url) rec.url = record.url;
    if (record.data) rec.data = record.data;
    rec.description = record.description;
    rec.tags = record.tags || [];
    if (record.publisher) rec.publisher = record.publisher;
    rec.metadata = record.meta || {};
    return JSON.stringify(rec, null, 2);
  }

  function toMarkdown(record) {
    var lines = [];
    lines.push('# ' + record.name);
    lines.push('');
    lines.push('- **Display name:** ' + (record.displayName || record.name));
    lines.push('- **Identifier:** `' + record.identity + '`');
    if (record.publisher) {
      lines.push('- **Publisher:** ' + record.publisher.displayName + ' (`' + record.publisher.identifier + '`, ' + record.publisher.identityType + ')');
    }
    lines.push('- **Mechanism:** ' + (CAT_LABEL[record.cat] || record.cat));
    lines.push('- **Media type:** `' + record.mediaType + '`');
    lines.push('- **Identity type:** ' + record.identityType);
    lines.push('- **Verified:** ' + (record.verified ? 'yes' : 'no') + ' · **Status:** ' + record.status);
    lines.push('- **Target host:** ' + record.host + ' · **Runtime / region:** ' + record.region);
    lines.push('- **TTL:** ' + record.ttl + 's · **Updated:** ' + record.updated);
    lines.push('');
    lines.push(record.description);
    lines.push('');
    lines.push('- **Target object:** ' + record.agents.map(function (a) { return a.name; }).join(', '));
    lines.push('- **Resolution role:** ' + record.caps.join(', '));
    if (record.meta) {
      Object.keys(record.meta).forEach(function (k) { lines.push('- **' + k + ':** ' + record.meta[k]); });
    }
    lines.push('- **Tags:** ' + record.tags.join(', '));
    return lines.join('\n');
  }

  /* ---------------- DOM rendering (browser only) ---------------- */
  var PAGE_SIZE = 9;
  var state = { search: '', cats: new Set(), sort: 'recent', page: 1, selected: null };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // shared SVG icons
  var ICON = {
    verified: '<svg class="verified-mark" viewBox="0 0 20 20" fill="currentColor" aria-label="Verified"><path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
    copy: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="7" y="7" width="9" height="9" rx="1.5"/><path d="M4 13V5a1.5 1.5 0 011.5-1.5H13"/></svg>',
    json: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4c-1.5 0-2 .7-2 2v1.6c0 .9-.5 1.4-1.4 1.4.9 0 1.4.5 1.4 1.4V14c0 1.3.5 2 2 2"/><path d="M12 4c1.5 0 2 .7 2 2v1.6c0 .9.5 1.4 1.4 1.4-.9 0-1.4.5-1.4 1.4V14c0 1.3-.5 2-2 2"/></svg>',
    md: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="15" height="10" rx="2"/><path d="M5 12.5V8l2.2 2.2L9.4 8v4.5"/><path d="M12.7 7.8v3.4m0 1.4l-1.7-1.9m1.7 1.9l1.7-1.9"/></svg>',
  };

  function protoOf(r) {
    var mt = r.mediaType || '';
    if (mt === MEDIA['dns-aid']) return 'dns-aid';
    if (mt.indexOf('a2a') !== -1) return 'a2a-card';
    return 'ai-catalog';
  }
  function fmtDate(s) {
    var d = new Date(s);
    return isNaN(d) ? s : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function cardHTML(r) {
    var vmark = r.verified ? ICON.verified : '';
    var vbadge = r.verified
      ? '<span class="vbadge ok">✓ Verified</span>'
      : '<span class="vbadge pending">◷ Pending</span>';
    var chips = r.tags.slice(0, 4).map(function (t) {
      return '<span class="chip">' + esc(t) + '</span>';
    }).join('');
    return (
      '<article class="card" data-key="' + esc(r.key) + '" role="button" tabindex="0" aria-label="' + esc(r.name) + ', open record">' +
      '<div class="card-head"><div class="title-line"><h3>' + esc(r.name) + '</h3>' + vmark + '</div>' +
      '<span class="cat-pill" data-cat="' + esc(r.cat) + '">' + esc(CAT_LABEL[r.cat]) + '</span></div>' +
      '<div class="identifier">' + esc(r.identity) + '</div>' +
      '<p class="desc">' + esc(r.description) + '</p>' +
      '<div class="meta">' + vbadge +
      '<span class="proto">' + esc(protoOf(r)) + '</span>' +
      '<span class="dot">·</span><span>' + esc(r.version) + '</span>' +
      '<span class="dot">·</span><span>' + esc(fmtDate(r.updated)) + '</span></div>' +
      '<div class="chips">' + chips + '</div>' +
      '<div class="divider"></div>' +
      '<div class="actions"><button class="view" data-act="view">View details →</button>' +
      '<div class="iconbtn-row">' +
      '<button class="iconbtn" data-act="copy" title="Copy identifier" aria-label="Copy identifier">' + ICON.copy + '</button>' +
      '<button class="iconbtn" data-act="json" title="Download JSON" aria-label="Download JSON">' + ICON.json + '</button>' +
      '<button class="iconbtn" data-act="md" title="Download Markdown" aria-label="Download Markdown">' + ICON.md + '</button>' +
      '</div></div></article>'
    );
  }

  function renderMenu() {
    var host = $('#catMenu');
    if (!host) return;
    var counts = {};
    CAT_KEYS.forEach(function (k) { counts[k] = 0; });
    DATA.forEach(function (r) { if (counts[r.cat] != null) counts[r.cat]++; });
    var boxes = CAT_KEYS.map(function (k) {
      return '<label class="cat-check"><input type="checkbox" data-cat="' + k + '"' +
        (state.cats.has(k) ? ' checked' : '') + ' />' +
        '<span class="cc-main"><span class="cc-label">' + esc(CAT_LABEL[k]) + '</span>' +
        '<span class="cc-sub">' + esc(MECH_HINT[k] || '') + '</span></span>' +
        '<span class="cc-count">' + counts[k] + '</span></label>';
    }).join('');
    host.innerHTML =
      '<p class="cat-title">Discovery mechanism</p>' + boxes +
      (state.cats.size ? '<button class="cat-clear" type="button">Clear filters</button>' : '');
    Array.prototype.forEach.call(host.querySelectorAll('input[data-cat]'), function (box) {
      box.addEventListener('change', function () {
        var k = box.getAttribute('data-cat');
        if (box.checked) state.cats.add(k); else state.cats.delete(k);
        state.page = 1;
        render();
      });
    });
    var clear = host.querySelector('.cat-clear');
    if (clear) clear.addEventListener('click', function () { state.cats = new Set(); state.page = 1; render(); });
  }

  function renderGrid() {
    var grid = $('#grid');
    if (!grid) return;
    var list = applyFilters(DATA, state);
    var pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    if (state.page > pages) state.page = pages;
    var items = list.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
    if (!items.length) {
      grid.innerHTML = '<p class="cat-empty">No entries match your filters.</p>';
    } else {
      grid.innerHTML = items.map(cardHTML).join('');
      Array.prototype.forEach.call(grid.querySelectorAll('.card'), function (card) {
        var key = card.getAttribute('data-key');
        var rec = DATA.filter(function (r) { return r.key === key; })[0];
        function open() { openPanel(key); }
        card.addEventListener('click', function (e) {
          var act = e.target.closest('[data-act]');
          if (!act) { open(); return; }
          e.stopPropagation();
          var a = act.getAttribute('data-act');
          if (a === 'view') open();
          else if (a === 'copy') copyIdentifier(rec, act);
          else if (a === 'json') downloadJSON(rec);
          else if (a === 'md') downloadMarkdown(rec);
        });
        card.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
        });
      });
    }
    renderPager(pages);
  }

  function renderPager(pages) {
    var host = $('#pager');
    if (!host) return;
    if (pages <= 1) { host.innerHTML = ''; return; }
    var p = state.page;
    var nums = [];
    if (pages <= 5) { for (var i = 1; i <= pages; i++) nums.push(i); }
    else {
      nums.push(1);
      if (p > 3) nums.push('…');
      for (var j = Math.max(2, p - 1); j <= Math.min(pages - 1, p + 1); j++) nums.push(j);
      if (p < pages - 2) nums.push('…');
      nums.push(pages);
    }
    var html = '<button type="button" data-go="prev"' + (p === 1 ? ' disabled' : '') + '>Prev</button>';
    html += nums.map(function (n) {
      if (n === '…') return '<span class="ell">…</span>';
      return '<button type="button" class="' + (n === p ? 'on' : '') + '" data-go="' + n + '">' + n + '</button>';
    }).join('');
    html += '<button type="button" data-go="next"' + (p === pages ? ' disabled' : '') + '>Next</button>';
    host.innerHTML = html;
    Array.prototype.forEach.call(host.querySelectorAll('button[data-go]'), function (b) {
      b.addEventListener('click', function () {
        var g = b.getAttribute('data-go');
        if (g === 'prev') state.page = Math.max(1, p - 1);
        else if (g === 'next') state.page = Math.min(pages, p + 1);
        else state.page = parseInt(g, 10);
        render();
      });
    });
  }

  function render() { renderMenu(); renderGrid(); }

  /* ---------------- export + panel (panel filled in later task) ---------------- */
  function downloadBlob(name, type, text) {
    var blob = new Blob([text], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }
  function downloadJSON(r) { downloadBlob(r.key + '.json', 'application/json', toJSON(r)); }
  function downloadMarkdown(r) { downloadBlob(r.key + '.md', 'text/markdown', toMarkdown(r)); }
  function copyIdentifier(r, btn) {
    if (navigator.clipboard) navigator.clipboard.writeText(r.identity);
    if (btn) { btn.classList.add('copied'); setTimeout(function () { btn.classList.remove('copied'); }, 1100); }
  }

  var panelTimers = [];
  var lastFocus = null;
  function clearPanelTrace() { panelTimers.forEach(clearTimeout); panelTimers = []; }

  function statusBadge(r) {
    if (r.status === 'active') return '<span class="vbadge ok">● Active</span>';
    if (r.status === 'pending') return '<span class="vbadge pending">◷ Pending</span>';
    return '<span class="chip">' + esc(r.status) + '</span>';
  }

  // Compact, non-interactive preview card that links to the catalog (used on the landing).
  function previewCardHTML(r) {
    var vmark = r.verified ? ICON.verified : '';
    var chips = r.tags.slice(0, 3).map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join('');
    return (
      '<a class="card card-preview" href="explore.html" aria-label="' + esc(r.name) + ', browse the index">' +
      '<div class="card-head"><div class="title-line"><h3>' + esc(r.name) + '</h3>' + vmark + '</div>' +
      '<span class="cat-pill" data-cat="' + esc(r.cat) + '">' + esc(CAT_LABEL[r.cat]) + '</span></div>' +
      '<div class="identifier">' + esc(r.identity) + '</div>' +
      '<p class="desc">' + esc(r.description) + '</p>' +
      '<div class="chips">' + chips + '</div></a>'
    );
  }
  function renderPreview(selector, n) {
    var host = document.querySelector(selector);
    if (!host) return;
    host.innerHTML = sortRecords(DATA.slice(), 'recent').slice(0, n || 3).map(previewCardHTML).join('');
  }

  function openPanel(key) {
    var r = DATA.filter(function (x) { return x.key === key; })[0];
    if (!r) return;
    state.selected = r;
    lastFocus = document.activeElement;
    var panel = $('#slidePanel'), scrim = $('#scrim');

    var vmark = r.verified ? ICON.verified : '';
    var verBadge = r.verified
      ? '<span class="vbadge ok">✓ Verified</span>'
      : '<span class="vbadge pending">◷ Unverified</span>';
    var chips = r.tags.map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join('');
    var role = (r.meta && r.meta['org.projectnanda.resolutionRole']) || r.caps[0] || '';
    var target = r.agents.map(function (a) {
      return '<div class="sp-agent"><span class="an">' + esc(a.name) + '</span><span class="al">' + esc(a.role || '') + '</span></div>';
    }).join('');
    var metaRows = r.meta ? Object.keys(r.meta).map(function (k) {
      return '<dt class="mono">' + esc(k.replace('org.projectnanda.', '')) + '</dt><dd class="mono">' + esc(r.meta[k]) + '</dd>';
    }).join('') : '';
    var pq = [
      'identifier: ' + r.identity,
      r.host,
      role ? 'role: ' + role : 'discovery object',
      (r.region && r.region !== 'n/a') ? r.region + ' runtime' : 'target runtime',
    ];
    var ptrace = HOPS.map(function (h, i) {
      var last = i === HOPS.length - 1;
      return '<div class="pt-row" data-pt="' + h.n + '">' +
        '<div class="pt-rail"><span class="pt-n">' + h.n + '</span>' + (last ? '' : '<span class="pt-line"></span>') + '</div>' +
        '<div class="pt-body"><div class="pt-title">' + esc(h.title) + '</div>' +
        '<div class="pt-q">' + esc(pq[i]) + '</div>' +
        '<div class="pt-api">' + esc(h.api) + '</div></div></div>';
    }).join('');

    panel.innerHTML =
      '<div class="sp-head"><div><span class="sp-kicker">NandaIndex entry</span>' +
      '<div class="sp-title"><h2>' + esc(r.name) + '</h2>' + vmark +
      '<span class="cat-pill" data-cat="' + esc(r.cat) + '">' + esc(CAT_LABEL[r.cat]) + '</span></div>' +
      '<div class="sp-idn">' + esc(r.identity) + '</div></div>' +
      '<button class="sp-close" id="spClose" type="button" aria-label="Close">' +
      '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg></button></div>' +
      '<div class="sp-body">' +
      '<section>' + (r.domain ? '<p class="sp-domain">' + esc(r.domain) + '</p>' : '') +
      '<p class="sp-desc">' + esc(r.description) + '</p>' +
      '<div class="chips" style="margin-top:12px;">' + chips + '</div></section>' +
      '<section><p class="sp-label">Status</p><div class="sp-vrow">' + verBadge + statusBadge(r) + '</div></section>' +
      '<section><p class="sp-label">Target object</p><div class="sp-agents">' + target + '</div></section>' +
      (metaRows ? '<section><p class="sp-label">Routing metadata</p><dl class="sp-meta">' + metaRows + '</dl></section>' : '') +
      '<section><p class="sp-label">Record</p><dl class="sp-meta">' +
      '<dt>Media type</dt><dd class="mono">' + esc(r.mediaType) + '</dd>' +
      '<dt>Identity type</dt><dd>' + esc(r.identityType) + '</dd>' +
      '<dt>Target host</dt><dd>' + esc(r.host) + '</dd>' +
      '<dt>Runtime / region</dt><dd>' + esc(r.region) + '</dd>' +
      '<dt>TTL</dt><dd>' + esc(r.ttl) + 's</dd>' +
      '<dt>Updated</dt><dd>' + esc(fmtDate(r.updated)) + '</dd></dl></section>' +
      '<section><div class="sp-trace-head"><p class="sp-label" style="margin:0;">Resolution path</p>' +
      '<button class="btn" id="spReplay" type="button">▶ Replay trace</button></div>' + ptrace + '</section>' +
      '<section><p class="sp-label">Export</p><div class="sp-exports">' +
      '<button class="ebtn primary" id="spJson">' + ICON.json + 'Download JSON</button>' +
      '<button class="ebtn" id="spMd">' + ICON.md + 'Download Markdown</button>' +
      '<button class="ebtn" id="spCopy">' + ICON.copy + 'Copy identifier</button></div></section>' +
      '<a class="btn primary sp-cta" href="#" id="spOpen">Open discovery object →</a>' +
      '<section class="sp-json"><div class="sp-json-head"><p class="sp-label" style="margin:0;">Raw record</p>' +
      '<button class="sp-copy" id="spRawCopy">Copy</button></div>' +
      '<pre class="codeblock">' + esc(toJSON(r)) + '</pre></section>' +
      '</div>';

    scrim.hidden = false; panel.hidden = false;
    document.body.style.overflow = 'hidden';
    $('#spClose').addEventListener('click', closePanel);
    $('#spReplay').addEventListener('click', playPanelTrace);
    $('#spJson').addEventListener('click', function () { downloadJSON(r); });
    $('#spMd').addEventListener('click', function () { downloadMarkdown(r); });
    $('#spCopy').addEventListener('click', function (e) { copyIdentifier(r, e.currentTarget); });
    $('#spOpen').addEventListener('click', function (e) { e.preventDefault(); });
    $('#spRawCopy').addEventListener('click', function (e) {
      if (navigator.clipboard) navigator.clipboard.writeText(toJSON(r));
      e.currentTarget.textContent = 'Copied'; setTimeout(function () { e.currentTarget.textContent = 'Copy'; }, 1100);
    });
    $('#spClose').focus();
    setTimeout(playPanelTrace, 380);
  }

  function closePanel() {
    clearPanelTrace();
    var panel = $('#slidePanel'), scrim = $('#scrim');
    if (!panel || panel.hidden) return;
    scrim.hidden = true; panel.hidden = true; panel.innerHTML = '';
    document.body.style.overflow = '';
    state.selected = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function paintPanelTrace(active) {
    HOPS.forEach(function (h) {
      var row = $('.pt-row[data-pt="' + h.n + '"]');
      if (!row) return;
      row.classList.toggle('lit', h.n <= active);
      row.classList.toggle('done', h.n < active);
      var n = row.querySelector('.pt-n');
      if (n) n.textContent = h.n < active ? '✓' : String(h.n);
    });
  }
  function playPanelTrace() {
    clearPanelTrace();
    paintPanelTrace(0);
    if (REDUCED) { paintPanelTrace(HOPS.length); return; }
    for (var i = 1; i <= HOPS.length; i++) {
      (function (step) { panelTimers.push(setTimeout(function () { paintPanelTrace(step); }, step * 600)); })(i);
    }
  }

  function init() {
    if (!document.getElementById('grid')) return; // not the explore page
    var q = $('#q');
    if (q) q.addEventListener('input', function () { state.search = q.value; state.page = 1; render(); });
    var sort = $('#sort');
    if (sort) sort.addEventListener('change', function () { state.sort = sort.value; render(); });
    var scrim = $('#scrim');
    if (scrim) scrim.addEventListener('click', closePanel);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });
    render();
  }

  /* ---------------- public API ---------------- */
  var api = {
    DATA: DATA,
    HOPS: HOPS,
    CAT_KEYS: CAT_KEYS,
    CAT_LABEL: CAT_LABEL,
    REDUCED: REDUCED,
    categoryOf: categoryOf,
    sortRecords: sortRecords,
    applyFilters: applyFilters,
    toJSON: toJSON,
    toMarkdown: toMarkdown,
    init: init,
    openPanel: openPanel,
    closePanel: closePanel,
    renderPreview: renderPreview,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    window.Explore = api;
    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
      else init();
    }
  }
})();
