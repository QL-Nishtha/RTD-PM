#!/usr/bin/env node
const path = require('path');
const fs   = require('fs');
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
const PROJECT_ID  = 'PVT_kwDOCBcfsM4BWwWe';
const START_FIELD = 'PVTF_lADOCBcfsM4BWwWezhSgFGA';
const END_FIELD   = 'PVTF_lADOCBcfsM4BWwWezhSgFGE';

// Sprint plan from CSV — deliverable title → sprint dates
const SPRINT_PLAN = {
  // Sprint 1 (May 4–15)
  'Track initiated vs completed payments':               { start: '2026-05-04', end: '2026-05-15' },
  'Admin alerts for payment failures':                   { start: '2026-05-04', end: '2026-05-15' },
  'Registration analytics reliability (logging fixes)':  { start: '2026-05-04', end: '2026-05-15' },
  'Reduce registration time':                            { start: '2026-05-04', end: '2026-05-15' },
  'Fix critical site builder bugs':                      { start: '2026-05-04', end: '2026-05-15' },
  'Regression + tracking validation':                    { start: '2026-05-04', end: '2026-05-15' },
  // Sprint 2 (May 18–29)
  'Admin alerts for incomplete payments':                { start: '2026-05-18', end: '2026-05-29' },
  'Daily cron for drop-off recovery':                    { start: '2026-05-18', end: '2026-05-29' },
  'Drop-off dashboard (v1)':                             { start: '2026-05-18', end: '2026-05-29' },
  'SEO for core RTD pages':                              { start: '2026-05-18', end: '2026-05-29' },
  'Meta pixel integration (global)':                    { start: '2026-05-18', end: '2026-05-29' },
  'Recovery flow validation':                            { start: '2026-05-18', end: '2026-05-29' },
  // Sprint 3 (Jun 1–12)
  'Optimize scoring for large races':                    { start: '2026-06-01', end: '2026-06-12' },
  'Load testing for large races':                        { start: '2026-06-01', end: '2026-06-12' },
  'Registration analytics reliability (complete)':       { start: '2026-06-01', end: '2026-06-12' },
  'SEO for active race pages':                           { start: '2026-06-01', end: '2026-06-12' },
  'Predefined analytics queries (no NLP)':               { start: '2026-06-01', end: '2026-06-12' },
  'Query UI (dropdown-based)':                           { start: '2026-06-01', end: '2026-06-12' },
  'Load + analytics validation':                         { start: '2026-06-01', end: '2026-06-12' },
  // Sprint 4 (Jun 15–26)
  'Report download functionality':                       { start: '2026-06-15', end: '2026-06-26' },
  'Auto Meta pixel in generated sites':                  { start: '2026-06-15', end: '2026-06-26' },
  'AI-assisted email templates':                         { start: '2026-06-15', end: '2026-06-26' },
  'Template selection UI':                               { start: '2026-06-15', end: '2026-06-26' },
  'Dashboard + alert improvements':                      { start: '2026-06-15', end: '2026-06-26' },
  'Email + system validation':                           { start: '2026-06-15', end: '2026-06-26' },
};

// Status fallback for non-plan items
const STATUS_DATES = {
  'In Development':           { start: '2026-05-04', end: '2026-05-15' },
  'Code Review':              { start: '2026-05-04', end: '2026-05-15' },
  'In Testing':               { start: '2026-05-04', end: '2026-05-15' },
  'Testing Approved':         { start: '2026-05-04', end: '2026-05-15' },
  'Blocked':                  { start: '2026-05-04', end: '2026-05-15' },
  'Selected for development': { start: '2026-05-18', end: '2026-05-29' },
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function fetchAllItems() {
  const items = [];
  let cursor = null;
  const QUERY = `
    query($projectId: ID!, $cursor: String) {
      node(id: $projectId) {
        ... on ProjectV2 {
          items(first: 100, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes {
              id
              content { ... on Issue { title } }
              fieldValues(first: 20) {
                nodes {
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name field { ... on ProjectV2SingleSelectField { name } }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  while (true) {
    const res = await graphql(QUERY, { projectId: PROJECT_ID, cursor });
    const page = res?.data?.node?.items;
    if (!page) { console.error('Fetch failed:', JSON.stringify(res)); break; }
    items.push(...page.nodes);
    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor;
    await sleep(400);
  }
  return items;
}

const SET_DATE_MUTATION = `
  mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $date: Date!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId itemId: $itemId fieldId: $fieldId value: { date: $date }
    }) { projectV2Item { id } }
  }
`;

async function setDates(itemId, dates) {
  const r1 = await graphql(SET_DATE_MUTATION, { projectId: PROJECT_ID, itemId, fieldId: START_FIELD, date: dates.start });
  if (r1?.errors) console.error('  start err:', r1.errors[0]?.message);
  await sleep(120);
  const r2 = await graphql(SET_DATE_MUTATION, { projectId: PROJECT_ID, itemId, fieldId: END_FIELD, date: dates.end });
  if (r2?.errors) console.error('  end err:', r2.errors[0]?.message);
  await sleep(120);
}

async function main() {
  console.log('Fetching project items...');
  const items = await fetchAllItems();
  console.log(`Total items: ${items.length}\n`);

  const stats = { planMatched: 0, statusFallback: 0, skipped: 0 };

  for (let i = 0; i < items.length; i++) {
    const item   = items[i];
    const title  = item.content?.title?.trim();
    const sv     = item.fieldValues.nodes.find(f => f.field?.name === 'Status');
    const status = sv?.name;

    const planDates = title ? SPRINT_PLAN[title] : null;
    if (planDates) {
      await setDates(item.id, planDates);
      console.log(`  [plan]  ${title}`);
      stats.planMatched++;
      continue;
    }

    const fallback = STATUS_DATES[status];
    if (fallback) {
      await setDates(item.id, fallback);
      stats.statusFallback++;
      continue;
    }

    stats.skipped++;
  }

  console.log('\n─────────────────────────────────');
  console.log('Done.');
  console.log(`  Sprint plan matches:  ${stats.planMatched}`);
  console.log(`  Status fallback:      ${stats.statusFallback}`);
  console.log(`  Skipped (no match):   ${stats.skipped}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
