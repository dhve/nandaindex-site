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
    if (mt === MEDIA.mcp) return 'mcp';
    if (mt === MEDIA.skill) return 'skill';
    if (mt === MEDIA.dns) return 'dns-aid';
    if (mt.indexOf('a2a') !== -1) return 'a2a';
    return 'catalog';
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
      '<article class="card" data-key="' + esc(r.key) + '" role="button" tabindex="0" aria-label="' + esc(r.name) + ' — open record">' +
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
    var items = [{ key: 'all', label: 'All' }].concat(
      CAT_KEYS.map(function (k) { return { key: k, label: CAT_LABEL[k] }; })
    );
    host.innerHTML = items.map(function (it) {
      var on = it.key === 'all' ? state.cats.size === 0 : state.cats.has(it.key);
      return '<button class="cat-item' + (on ? ' on' : '') + '" data-cat="' + it.key + '" type="button">' + esc(it.label) + '</button>';
    }).join('');
    Array.prototype.forEach.call(host.querySelectorAll('.cat-item'), function (btn) {
      btn.addEventListener('click', function () {
        var k = btn.getAttribute('data-cat');
        if (k === 'all') state.cats = new Set();
        else if (state.cats.has(k)) state.cats.delete(k);
        else state.cats.add(k);
        state.page = 1;
        render();
      });
    });
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
      '<a class="card card-preview" href="explore.html" aria-label="' + esc(r.name) + ' — browse the index">' +
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
    var emailBadge = r.verified
      ? '<span class="vbadge ok">✓ Email verified</span>'
      : '<span class="vbadge pending">◷ Email unverified</span>';
    var chips = r.tags.map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join('');
    var agents = r.agents.map(function (a) {
      return '<div class="sp-agent"><span class="an">' + esc(a.name) + '</span><span class="al">live</span></div>';
    }).join('');
    var caps = r.caps.map(function (c) { return '<span class="sp-cap">' + esc(c) + '</span>'; }).join('');
    var pq = ['locator: ' + r.identity, r.host, 'card · ' + r.agents[0].name, 'live runtime endpoint'];
    var ptrace = HOPS.map(function (h, i) {
      var last = i === HOPS.length - 1;
      return '<div class="pt-row" data-pt="' + h.n + '">' +
        '<div class="pt-rail"><span class="pt-n">' + h.n + '</span>' + (last ? '' : '<span class="pt-line"></span>') + '</div>' +
        '<div class="pt-body"><div class="pt-title">' + esc(h.title) + '</div>' +
        '<div class="pt-q">' + esc(pq[i]) + '</div>' +
        '<div class="pt-api">' + esc(h.api) + '</div></div></div>';
    }).join('');

    panel.innerHTML =
      '<div class="sp-head"><div><span class="sp-kicker">Index record</span>' +
      '<div class="sp-title"><h2>' + esc(r.name) + '</h2>' + vmark +
      '<span class="cat-pill" data-cat="' + esc(r.cat) + '">' + esc(CAT_LABEL[r.cat]) + '</span></div>' +
      '<div class="sp-idn">' + esc(r.identity) + '</div></div>' +
      '<button class="sp-close" id="spClose" type="button" aria-label="Close">' +
      '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg></button></div>' +
      '<div class="sp-body">' +
      '<section>' + (r.domain ? '<p class="sp-domain">' + esc(r.domain) + '</p>' : '') +
      '<p class="sp-desc">' + esc(r.description) + '</p>' +
      '<div class="chips" style="margin-top:12px;">' + chips + '</div></section>' +
      '<section><p class="sp-label">Verification</p><div class="sp-vrow">' + emailBadge + statusBadge(r) + '</div></section>' +
      '<section><p class="sp-label">Indexed agents</p><div class="sp-agents">' + agents + '</div></section>' +
      '<section><p class="sp-label">Capabilities</p><div class="sp-caps">' + caps + '</div></section>' +
      '<section><p class="sp-label">Record</p><dl class="sp-meta">' +
      '<dt>Media type</dt><dd class="mono">' + esc(r.mediaType) + '</dd>' +
      '<dt>Hosting</dt><dd>' + esc(r.host) + '</dd>' +
      '<dt>Region</dt><dd>' + esc(r.region) + '</dd>' +
      '<dt>Version</dt><dd>' + esc(r.version) + '</dd>' +
      '<dt>TTL</dt><dd>' + esc(r.ttl) + 's</dd>' +
      '<dt>Created</dt><dd>' + esc(fmtDate(r.created)) + '</dd>' +
      '<dt>Updated</dt><dd>' + esc(fmtDate(r.updated)) + '</dd></dl></section>' +
      '<section><div class="sp-trace-head"><p class="sp-label" style="margin:0;">Resolution path</p>' +
      '<button class="btn" id="spReplay" type="button">▶ Replay trace</button></div>' + ptrace + '</section>' +
      '<section><p class="sp-label">Export</p><div class="sp-exports">' +
      '<button class="ebtn primary" id="spJson">' + ICON.json + 'Download JSON</button>' +
      '<button class="ebtn" id="spMd">' + ICON.md + 'Download Markdown</button>' +
      '<button class="ebtn" id="spCopy">' + ICON.copy + 'Copy identifier</button></div></section>' +
      '<a class="btn primary sp-cta" href="#" id="spOpen">Open agent card →</a>' +
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
