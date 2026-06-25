/* NANDA Index — Explore catalog engine.
   Vanilla JS. Pure data/logic is unit-tested under Node; DOM rendering and the
   resolution-path animation (added in later tasks) run only in a browser.
   Example identities are fictional; no real organisations or personal data. */
(function () {
  'use strict';

  var REDUCED =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CAT_KEYS = ['enterprise', 'dns', 'smb', 'personal', 'mcp', 'skill'];
  var CAT_LABEL = {
    enterprise: 'Enterprise',
    dns: 'DNS-AID',
    smb: 'SMBs',
    personal: 'Personal',
    mcp: 'MCPs',
    skill: 'Skills',
  };

  /* ---------------- the 4 resolution hops (ported from the Resolve trace) -------------- */
  var HOPS = [
    { n: 1, title: 'NANDA Index', q: 'Who manages this identity?', api: 'GET /api/v1/resolve?locator=…' },
    { n: 2, title: 'Agent Source', q: 'What is this agent’s entry?', api: 'GET <registry_url>/agents/<id>' },
    { n: 3, title: 'Agent Card', q: 'What can this agent do?', api: 'GET <catalog_entry.url>' },
    { n: 4, title: 'Talk with Agent', q: 'Send a task directly.', api: 'POST <agent_card.url>/run' },
  ];

  var MEDIA = {
    enterprise: 'application/ai-catalog+json',
    dns: 'application/vnd.dns-aid+json',
    smb: 'application/a2a-agent-card+json',
    personal: 'application/a2a-agent-card+json',
    mcp: 'application/mcp-server-card+json',
    skill: 'application/agentskill+zip',
  };

  /* ---------------- mock dataset (>=12 records across all six categories) -------------- */
  var DATA = [
    {
      key: 'acme', mono: 'AC', name: 'Acme Time Services', cat: 'enterprise', verified: true, status: 'active',
      identity: 'urn:ai:domain:acme.com:agent:time', domain: 'acme.com',
      host: 'Self-hosted registry', region: 'US-East', ttl: 300, version: 'v1.4.0',
      mediaType: MEDIA.enterprise, identityType: 'dns',
      description: 'Authoritative time, timezone and scheduling agent. Resolves wall-clock and monotonic time across regions with signed responses.',
      tags: ['time', 'scheduling', 'enterprise'],
      agents: [{ name: 'time', role: 'scheduling' }, { name: 'billing-assistant', role: 'billing' }, { name: 'support-router', role: 'routing' }],
      caps: ['urn:nanda:cap:scheduling', 'urn:nanda:cap:billing'],
      created: '2026-03-02', updated: '2026-06-22',
    },
    {
      key: 'globex', mono: 'GX', name: 'Globex', cat: 'enterprise', verified: true, status: 'active',
      identity: 'urn:ai:domain:globex.example', domain: 'globex.example',
      host: 'Self-hosted registry', region: 'EU-West', ttl: 300, version: 'v2.1.0',
      mediaType: MEDIA.enterprise, identityType: 'dns',
      description: 'Industrial operations catalog exposing IT-ops and data-broker agents through a self-hosted registry.',
      tags: ['it-ops', 'data', 'enterprise'],
      agents: [{ name: 'ops-bot', role: 'it-ops' }, { name: 'data-broker', role: 'data' }],
      caps: ['urn:nanda:cap:itops'],
      created: '2026-02-11', updated: '2026-06-18',
    },
    {
      key: 'jpmorgan', mono: 'JP', name: 'JPMorgan', cat: 'enterprise', verified: true, status: 'active',
      identity: 'urn:ai:domain:jpmorgan.com', domain: 'jpmorgan.com',
      host: 'Self-hosted registry', region: 'US-East', ttl: 300, version: 'v3.0.1',
      mediaType: MEDIA.enterprise, identityType: 'dns',
      description: 'Enterprise financial-services catalog: market-data, settlement and compliance agents behind a private registry.',
      tags: ['finance', 'compliance', 'enterprise'],
      agents: [{ name: 'market-data', role: 'data' }, { name: 'settlement', role: 'ops' }, { name: 'compliance', role: 'risk' }],
      caps: ['urn:nanda:cap:finance', 'urn:nanda:cap:compliance'],
      created: '2026-01-20', updated: '2026-06-20',
    },
    {
      key: 'dell', mono: 'DT', name: 'Dell Technologies', cat: 'enterprise', verified: true, status: 'active',
      identity: 'urn:ai:domain:dell.com', domain: 'dell.com',
      host: 'Self-hosted registry', region: 'US-Central', ttl: 300, version: 'v1.0.0',
      mediaType: MEDIA.enterprise, identityType: 'dns',
      description: 'Hardware and support catalog exposing provisioning and warranty agents to enterprise customers.',
      tags: ['hardware', 'support', 'enterprise'],
      agents: [{ name: 'provisioning', role: 'ops' }, { name: 'warranty', role: 'support' }],
      caps: ['urn:nanda:cap:support'],
      created: '2026-04-01', updated: '2026-06-12',
    },
    {
      key: 'skyblue', mono: 'SB', name: 'SkyBlue Airlines', cat: 'dns', verified: true, status: 'active',
      identity: 'urn:ai:domain:skyblue.com:agent:refunds', domain: 'skyblue.com',
      host: 'DNS-AID (TXT records)', region: 'EU-West', ttl: 600, version: 'v1.2.0',
      mediaType: MEDIA.dns, identityType: 'dns',
      description: 'Travel agents published through DNS-AID TXT records: refunds, flight status and rebooking resolve directly from DNS.',
      tags: ['travel', 'dns-aid'],
      agents: [{ name: 'refunds', role: 'travel' }, { name: 'flight-status', role: 'travel' }, { name: 'rebooking', role: 'travel' }],
      caps: ['urn:nanda:cap:travel'],
      created: '2026-03-15', updated: '2026-06-19',
    },
    {
      key: 'initech', mono: 'IT', name: 'Initech', cat: 'dns', verified: true, status: 'active',
      identity: 'urn:ai:domain:initech.example:agent:support', domain: 'initech.example',
      host: 'DNS-AID (TXT records)', region: 'US-Central', ttl: 600, version: 'v0.8.0',
      mediaType: MEDIA.dns, identityType: 'dns',
      description: 'Support agent discoverable via DNS-AID, updated instantly through DNS without a hosted registry.',
      tags: ['support', 'dns-aid'],
      agents: [{ name: 'support', role: 'support' }],
      caps: ['urn:nanda:cap:support'],
      created: '2026-02-28', updated: '2026-06-05',
    },
    {
      key: 'moonbakery', mono: 'MB', name: 'Moon Bakery', cat: 'smb', verified: true, status: 'active',
      identity: 'urn:ai:domain:moonbakery39.com:agent:orders', domain: 'moonbakery39.com',
      host: 'host39.org', region: 'US-West', ttl: 900, version: 'v1.0.0',
      mediaType: MEDIA.smb, identityType: 'dns',
      description: 'Small-business orders agent. Owns a domain but no backend — the A2A agent card is hosted on host39.org.',
      tags: ['commerce', 'smb'],
      agents: [{ name: 'orders', role: 'commerce' }],
      caps: ['urn:nanda:cap:commerce'],
      created: '2026-05-02', updated: '2026-06-21',
    },
    {
      key: 'postgres-mcp', mono: 'PG', name: 'Postgres MCP', cat: 'mcp', verified: true, status: 'active',
      identity: 'urn:ai:domain:supabase.io:mcp:postgres', domain: 'supabase.io',
      host: 'Self-hosted registry', region: 'US-West', ttl: 600, version: 'v0.9.2',
      mediaType: MEDIA.mcp, identityType: 'dns',
      description: 'Model Context Protocol server exposing read/write Postgres tools with row-level security and schema introspection.',
      tags: ['database', 'sql', 'tools'],
      agents: [{ name: 'postgres', role: 'database' }],
      caps: ['urn:nanda:cap:database'],
      created: '2026-05-18', updated: '2026-06-24',
    },
    {
      key: 'synergetics', mono: 'SY', name: 'Synergetics AI', cat: 'mcp', verified: true, status: 'active',
      identity: 'urn:ai:domain:synergetics.ai:mcp:tools', domain: 'synergetics.ai',
      host: 'Self-hosted registry', region: 'US-West', ttl: 600, version: 'v0.5.0',
      mediaType: MEDIA.mcp, identityType: 'dns',
      description: 'MCP toolbox bundling search, retrieval and summarisation tools for agent runtimes.',
      tags: ['mcp', 'tools', 'retrieval'],
      agents: [{ name: 'toolbox', role: 'tools' }],
      caps: ['urn:nanda:cap:tools'],
      created: '2026-05-25', updated: '2026-06-15',
    },
    {
      key: 'cmu-skill', mono: 'CM', name: 'CMU Research', cat: 'skill', verified: false, status: 'pending',
      identity: 'urn:ai:domain:cmu.edu:skill:research', domain: 'cmu.edu',
      host: 'host39.org', region: 'US-East', ttl: 900, version: 'v0.2.0',
      mediaType: MEDIA.skill, identityType: 'dns',
      description: 'Packaged agent-skill bundle for literature search and citation extraction, distributed as a signed zip.',
      tags: ['research', 'skill'],
      agents: [{ name: 'lit-search', role: 'research' }],
      caps: ['urn:nanda:cap:research'],
      created: '2026-06-08', updated: '2026-06-23',
    },
    {
      key: 'personal', mono: 'AX', name: 'Alex’s Assistant', cat: 'personal', verified: false, status: 'pending',
      identity: 'urn:ai:email:alex@example.com', domain: null,
      host: 'host39.org', region: '—', ttl: 900, version: 'v0.3.0',
      mediaType: MEDIA.personal, identityType: 'email',
      description: 'Personal email-identity agent. No domain needed — the email address is the agent identity, card hosted on host39.org.',
      tags: ['personal-agent', 'email-identity'],
      agents: [{ name: 'assistant', role: 'personal' }],
      caps: ['urn:nanda:cap:personal'],
      created: '2026-06-01', updated: '2026-06-25',
    },
    {
      key: 'jrivera', mono: 'JR', name: 'John Rivera', cat: 'personal', verified: false, status: 'pending',
      identity: 'urn:ai:email:john@hotmail.com', domain: null,
      host: 'host39.org', region: '—', ttl: 900, version: 'v0.1.0',
      mediaType: MEDIA.personal, identityType: 'email',
      description: 'Personal inbox-triage and reply-drafting agent with email-identity and delegated card hosting via NANDA.',
      tags: ['personal-agent', 'email-identity'],
      agents: [{ name: 'inbox', role: 'personal' }],
      caps: ['urn:nanda:cap:personal'],
      created: '2026-06-10', updated: '2026-06-24',
    },
  ];

  /* ---------------- pure logic ---------------- */
  function categoryOf(record) {
    if (record && CAT_KEYS.indexOf(record.cat) !== -1) return record.cat;
    // Fallback (v2 parity): derive from media_type when cat is absent.
    var mt = (record && (record.mediaType || record.media_type)) || '';
    if (mt === MEDIA.mcp) return 'mcp';
    if (mt === MEDIA.skill) return 'skill';
    if (mt === MEDIA.dns) return 'dns';
    if (mt === MEDIA.enterprise) return 'enterprise';
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
    // identifier FIRST — the AI-Catalog resolution record (paper §5).
    var rec = {
      identifier: record.identity,
      displayName: record.name,
      mediaType: record.mediaType,
      ttl_seconds: record.ttl,
      status: record.status,
      email_verified: !!record.verified,
      publisher: {
        identifier: record.identity.split(':agent:')[0],
        displayName: record.name,
        identityType: record.identityType,
      },
      tags: record.tags,
      metadata: {
        'org.projectnanda.region': record.region,
        'org.projectnanda.host': record.host,
      },
    };
    return JSON.stringify(rec, null, 2);
  }

  function toMarkdown(record) {
    var lines = [];
    lines.push('# ' + record.name);
    lines.push('');
    lines.push('- **Identifier:** `' + record.identity + '`');
    lines.push('- **Category:** ' + (CAT_LABEL[record.cat] || record.cat));
    lines.push('- **Media type:** `' + record.mediaType + '`');
    lines.push('- **Version:** ' + record.version);
    lines.push('- **Verified:** ' + (record.verified ? 'yes' : 'no') + ' · **Status:** ' + record.status);
    lines.push('- **Hosting:** ' + record.host + ' · **Region:** ' + record.region);
    lines.push('- **TTL:** ' + record.ttl + 's · **Updated:** ' + record.updated);
    lines.push('');
    lines.push(record.description);
    lines.push('');
    lines.push('**Agents:** ' + record.agents.map(function (a) { return a.name; }).join(', '));
    lines.push('**Capabilities:** ' + record.caps.join(', '));
    lines.push('**Tags:** ' + record.tags.join(', '));
    return lines.join('\n');
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
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.Explore = api;
  // DOM rendering + init are attached in a later task and run only in a browser.
})();
