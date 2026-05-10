#!/usr/bin/env node
/**
 * Creates the 25 Q2 2026 roadmap deliverables as GitHub issues,
 * adds each to the project, and sets Sprint Start / Sprint End dates.
 */
const path  = require('path');
const fs    = require('fs');
const https = require('https');

// Load .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length && !process.env[k.trim()]) process.env[k.trim()] = v.join('=').trim();
  });
}

const TOKEN       = process.env.GITHUB_TOKEN;
const OWNER       = 'Quokka-Labs-LLP';
const REPO        = 'rtd-pm';
const PROJECT_ID  = 'PVT_kwDOCBcfsM4BWwWe';
const START_FIELD = 'PVTF_lADOCBcfsM4BWwWezhSgFGA';
const END_FIELD   = 'PVTF_lADOCBcfsM4BWwWezhSgFGE';

const ROADMAP = [
  // Sprint 1 (May 4–15) — Foundation
  { title: 'Track initiated vs completed payments',             sprint: 'Sprint 1', owner: 'BE',    priority: 'High',   dependency: '–',   outcome: 'Funnel visibility established',   start: '2026-05-04', end: '2026-05-15' },
  { title: 'Admin alerts for payment failures',                 sprint: 'Sprint 1', owner: 'BE',    priority: 'High',   dependency: '–',   outcome: 'Faster issue detection',           start: '2026-05-04', end: '2026-05-15' },
  { title: 'Registration analytics reliability (logging fixes)',sprint: 'Sprint 1', owner: 'BE',    priority: 'High',   dependency: '–',   outcome: 'Clean data layer',                start: '2026-05-04', end: '2026-05-15' },
  { title: 'Reduce registration time',                          sprint: 'Sprint 1', owner: 'FE',    priority: 'High',   dependency: '–',   outcome: 'No solution/approach so far',     start: '2026-05-04', end: '2026-05-15' },
  { title: 'Fix critical site builder bugs',                    sprint: 'Sprint 1', owner: 'FE',    priority: 'High',   dependency: '–',   outcome: 'Removes adoption blockers',        start: '2026-05-04', end: '2026-05-15' },
  { title: 'Regression + tracking validation',                  sprint: 'Sprint 1', owner: 'QA',    priority: 'High',   dependency: '–',   outcome: 'Data accuracy ensured',           start: '2026-05-04', end: '2026-05-15' },
  // Sprint 2 (May 18–29) — Recovery + Insights
  { title: 'Admin alerts for incomplete payments',              sprint: 'Sprint 2', owner: 'BE',    priority: 'High',   dependency: '1.2', outcome: 'Recovery trigger enabled',         start: '2026-05-18', end: '2026-05-29' },
  { title: 'Daily cron for drop-off recovery',                  sprint: 'Sprint 2', owner: 'BE',    priority: 'High',   dependency: '1.2', outcome: 'Automated recovery system',        start: '2026-05-18', end: '2026-05-29' },
  { title: 'Drop-off dashboard (v1)',                           sprint: 'Sprint 2', owner: 'FE',    priority: 'High',   dependency: '1.2', outcome: 'Actionable insights',             start: '2026-05-18', end: '2026-05-29' },
  { title: 'SEO for core RTD pages',                            sprint: 'Sprint 2', owner: 'FE',    priority: 'High',   dependency: '–',   outcome: 'Organic traffic base',            start: '2026-05-18', end: '2026-05-29' },
  { title: 'Meta pixel integration (global)',                   sprint: 'Sprint 2', owner: 'BE',    priority: 'High',   dependency: '–',   outcome: 'Attribution tracking',            start: '2026-05-18', end: '2026-05-29' },
  { title: 'Recovery flow validation',                          sprint: 'Sprint 2', owner: 'QA',    priority: 'High',   dependency: '–',   outcome: 'End-to-end correctness',          start: '2026-05-18', end: '2026-05-29' },
  // Sprint 3 (Jun 1–12) — Scale + Analytics MVP
  { title: 'Optimize scoring for large races',                  sprint: 'Sprint 3', owner: 'BE',    priority: 'High',   dependency: '–',   outcome: 'Scale readiness',                 start: '2026-06-01', end: '2026-06-12' },
  { title: 'Load testing for large races',                      sprint: 'Sprint 3', owner: 'BE',    priority: 'High',   dependency: '2.2', outcome: 'Failure thresholds known',         start: '2026-06-01', end: '2026-06-12' },
  { title: 'Registration analytics reliability (complete)',     sprint: 'Sprint 3', owner: 'BE',    priority: 'High',   dependency: 'P1',  outcome: 'Trusted reporting',               start: '2026-06-01', end: '2026-06-12' },
  { title: 'SEO for active race pages',                         sprint: 'Sprint 3', owner: 'FE',    priority: 'High',   dependency: '–',   outcome: 'Traffic expansion',               start: '2026-06-01', end: '2026-06-12' },
  { title: 'Predefined analytics queries (no NLP)',             sprint: 'Sprint 3', owner: 'BE',    priority: 'Medium', dependency: '5.3', outcome: 'Faster insights access',          start: '2026-06-01', end: '2026-06-12' },
  { title: 'Query UI (dropdown-based)',                         sprint: 'Sprint 3', owner: 'FE',    priority: 'Medium', dependency: '5.3', outcome: 'Usable analytics layer',          start: '2026-06-01', end: '2026-06-12' },
  { title: 'Load + analytics validation',                       sprint: 'Sprint 3', owner: 'QA',    priority: 'High',   dependency: '–',   outcome: 'Stability ensured',               start: '2026-06-01', end: '2026-06-12' },
  // Sprint 4 (Jun 15–26) — Monetization + Automation
  { title: 'Report download functionality',                     sprint: 'Sprint 4', owner: 'FE/BE', priority: 'Medium', dependency: '5.1', outcome: 'Export capability',               start: '2026-06-15', end: '2026-06-26' },
  { title: 'Auto Meta pixel in generated sites',                sprint: 'Sprint 4', owner: 'BE',    priority: 'Medium', dependency: '3.3', outcome: 'Reduces manual setup',            start: '2026-06-15', end: '2026-06-26' },
  { title: 'AI-assisted email templates',                       sprint: 'Sprint 4', owner: 'BE',    priority: 'Medium', dependency: '–',   outcome: 'Faster email creation',           start: '2026-06-15', end: '2026-06-26' },
  { title: 'Template selection UI',                             sprint: 'Sprint 4', owner: 'FE',    priority: 'Medium', dependency: '–',   outcome: 'Simple UX',                       start: '2026-06-15', end: '2026-06-26' },
  { title: 'Dashboard + alert improvements',                    sprint: 'Sprint 4', owner: 'FE/BE', priority: 'Medium', dependency: '–',   outcome: 'UX polish',                       start: '2026-06-15', end: '2026-06-26' },
  { title: 'Email + system validation',                         sprint: 'Sprint 4', owner: 'QA',    priority: 'High',   dependency: '–',   outcome: 'Release readiness',               start: '2026-06-15', end: '2026-06-26' },
];

const SPRINT_FOCUS = {
  'Sprint 1': 'Foundation (Funnel + Stability) · 4–15 May 2026',
  'Sprint 2': 'Recovery + Insights · 18–29 May 2026',
  'Sprint 3': 'Scale + Analytics MVP · 1–12 Jun 2026',
  'Sprint 4': 'Monetization + Automation · 15–26 Jun 2026',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function restRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com', path: urlPath, method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'rtd-pm-sync',
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(buf) }); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function graphql(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ query, variables });
    const req = https.request({
      hostname: 'api.github.com', path: '/graphql', method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'rtd-pm-sync',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function buildBody(d) {
  return [
    `**Sprint:** ${d.sprint} — ${SPRINT_FOCUS[d.sprint]}`,
    `**Owner:** ${d.owner}`,
    `**Priority:** ${d.priority}`,
    `**Dependency:** ${d.dependency}`,
    `**Expected Outcome:** ${d.outcome}`,
  ].join('\n');
}

async function addToProject(nodeId) {
  const res = await graphql(`
    mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
        item { id }
      }
    }
  `, { projectId: PROJECT_ID, contentId: nodeId });
  return res?.data?.addProjectV2ItemById?.item?.id || null;
}

async function setDate(itemId, fieldId, date) {
  await graphql(`
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $date: Date!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId itemId: $itemId fieldId: $fieldId value: { date: $date }
      }) { projectV2Item { id } }
    }
  `, { projectId: PROJECT_ID, itemId, fieldId, date });
}

async function fetchExistingTitles() {
  const titles = new Map(); // title → { number, nodeId }
  let page = 1;
  while (true) {
    const res = await restRequest('GET', `/repos/${OWNER}/${REPO}/issues?state=all&per_page=100&page=${page}`);
    if (!Array.isArray(res.data) || res.data.length === 0) break;
    res.data.forEach(i => titles.set(i.title.trim(), { number: i.number, nodeId: i.node_id }));
    if (res.data.length < 100) break;
    page++;
    await sleep(400);
  }
  return titles;
}

async function main() {
  console.log('Fetching existing issues...');
  const existing = await fetchExistingTitles();
  console.log(`Found ${existing.size} existing issues.\n`);
  console.log(`Processing ${ROADMAP.length} roadmap deliverables...\n`);
  const stats = { created: 0, skipped: 0, failed: 0 };

  for (const d of ROADMAP) {
    process.stdout.write(`  [${d.sprint}] ${d.title}\n`);

    let issueNodeId;

    const ex = existing.get(d.title);
    if (ex) {
      console.log(`    ↩ Already exists #${ex.number}`);
      issueNodeId = ex.nodeId;
      stats.skipped++;
    } else {
      // Create issue (retry without labels if 422)
      let res = await restRequest('POST', `/repos/${OWNER}/${REPO}/issues`, {
        title: d.title,
        body: buildBody(d),
        labels: [`roadmap`, `${d.sprint.toLowerCase().replace(' ', '-')}`, `owner:${d.owner.toLowerCase()}`, `priority:${d.priority.toLowerCase()}`],
      });
      if (res.status !== 201) {
        res = await restRequest('POST', `/repos/${OWNER}/${REPO}/issues`, { title: d.title, body: buildBody(d) });
      }
      if (res.status !== 201) {
        console.error(`    ✗ Failed (${res.status}):`, JSON.stringify(res.data).substring(0, 120));
        stats.failed++;
        continue;
      }
      issueNodeId = res.data.node_id;
      console.log(`    ✓ Created #${res.data.number}`);
      stats.created++;
      await sleep(400);
    }

    // Add to project & set dates
    const itemId = await addToProject(issueNodeId);
    if (!itemId) { console.error(`    ✗ Could not add to project`); stats.failed++; continue; }
    await sleep(300);

    await setDate(itemId, START_FIELD, d.start);
    await sleep(150);
    await setDate(itemId, END_FIELD, d.end);
    await sleep(200);
    console.log(`    ✓ Dates set: ${d.start} → ${d.end}`);
  }

  console.log('\n─────────────────────────────────');
  console.log(`Done. Created: ${stats.created}  Already existed: ${stats.skipped}  Failed: ${stats.failed}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
