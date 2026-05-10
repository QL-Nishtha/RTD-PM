#!/usr/bin/env node
/**
 * sync-trello-to-github.js
 *
 * Syncs active Trello cards to GitHub Issues + Project v2.
 * - Creates missing GitHub issues for active Trello cards
 * - Adds all active issues to the GitHub Project
 * - Sets correct Status bucket (matching Trello list)
 * - Sets assignees from Trello member mapping
 *
 * Usage:
 *   GITHUB_TOKEN=xxx node scripts/sync-trello-to-github.js
 *   or place token in .env as GITHUB_TOKEN=xxx
 */

const https = require('https');
const fs   = require('fs');
const path = require('path');

// ── Load token ────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
      const [k, ...v] = line.split('=');
      if (k && v.length && !process.env[k.trim()]) {
        process.env[k.trim()] = v.join('=').trim();
      }
    });
  }
}
loadEnv();

const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) { console.error('GITHUB_TOKEN not set'); process.exit(1); }

// ── Config ────────────────────────────────────────────────────────────────────
const OWNER        = 'Quokka-Labs-LLP';
const REPO         = 'rtd-pm';
const PROJECT_ID   = 'PVT_kwDOCBcfsM4BWwWe';
const STATUS_FIELD = 'PVTSSF_lADOCBcfsM4BWwWezhSB_sw';
const TRELLO_JSON  = path.join(__dirname, '..', 'oiwHoSCf - run-the-day-tech-issues (2).json');

// Trello list name → GitHub project status option ID
const STATUS_IDS = {
  'Backlog':                   'f75ad846',
  'Selected for development':  '61e4505c',
  'Blocked':                   '13605b2d',
  'In Development':            '47fc9ee4',
  'Code Review':               '1662bddc',
  'In Testing':                'df73e18b',
  'Testing Approved':          '0cd2c896',
  'Completed':                 '98236657',
};

const ACTIVE_LISTS = new Set(Object.keys(STATUS_IDS).filter(k => k !== 'Completed'));

// Trello username → GitHub login
const MEMBER_MAP = {
  'ankitasaxena2':   'QL-Ankita-Saxena',
  'anupamayank2':    'ql-anupam-ayank',
  'nikhilrajbhar1':  'QL-Nikhil-rajbhar',
  'nishthaanand7':   'QL-Nishtha',
  'palijugran1':     'QL-Pali-Jugran',
  'riyachaudhary15': 'QL-Riya-Chaudhary',
  'rohitranjan4':    'QL-Rohit-Ranjan',
  'sunnychoudhary18':'QL-Sunny-Choudhary',
};

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function restRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path:     urlPath,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept':        'application/vnd.github+json',
        'User-Agent':    'trello-github-sync',
        'Content-Type':  'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(buf), headers: res.headers }); }
        catch { resolve({ status: res.statusCode, data: buf, headers: res.headers }); }
      });
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
      hostname: 'api.github.com',
      path:     '/graphql',
      method:   'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type':  'application/json',
        'User-Agent':    'trello-github-sync',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── GitHub data fetchers ──────────────────────────────────────────────────────

// Returns Map<title, { number, nodeId, state }>
async function fetchAllIssues() {
  const map = new Map();
  let page = 1;
  while (true) {
    const res = await restRequest('GET', `/repos/${OWNER}/${REPO}/issues?state=all&per_page=100&page=${page}`);
    if (!Array.isArray(res.data) || res.data.length === 0) break;
    res.data.forEach(i => map.set(i.title, { number: i.number, nodeId: i.node_id, state: i.state }));
    if (res.data.length < 100) break;
    page++;
    await sleep(400);
  }
  return map;
}

// Returns Map<issueNodeId, { itemId, currentStatus }>
async function fetchProjectItems() {
  const map = new Map();
  let cursor = null;

  const QUERY = `
    query($projectId: ID!, $cursor: String) {
      node(id: $projectId) {
        ... on ProjectV2 {
          items(first: 100, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            nodes {
              id
              fieldValues(first: 15) {
                nodes {
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    field { ... on ProjectV2SingleSelectField { name } }
                  }
                }
              }
              content {
                ... on Issue { id number title }
              }
            }
          }
        }
      }
    }
  `;

  while (true) {
    const res = await graphql(QUERY, { projectId: PROJECT_ID, cursor });
    const items = res?.data?.node?.items;
    if (!items) { console.error('  ✗ Could not fetch project items:', JSON.stringify(res)); break; }

    items.nodes.forEach(item => {
      const issueId = item.content?.id;
      if (!issueId) return;
      const statusVal = item.fieldValues.nodes.find(f => f.field?.name === 'Status');
      map.set(issueId, { itemId: item.id, currentStatus: statusVal?.name });
    });

    if (!items.pageInfo.hasNextPage) break;
    cursor = items.pageInfo.endCursor;
    await sleep(400);
  }
  return map;
}

// ── Issue operations ──────────────────────────────────────────────────────────

async function createIssue(title, body, assignees) {
  const res = await restRequest('POST', `/repos/${OWNER}/${REPO}/issues`, { title, body, assignees });
  if (res.status === 201) {
    return { number: res.data.number, nodeId: res.data.node_id };
  }
  // 422 usually means assignee not a collaborator — retry without assignees
  if (res.status === 422 && assignees.length) {
    const fallback = await restRequest('POST', `/repos/${OWNER}/${REPO}/issues`, { title, body, assignees: [] });
    if (fallback.status === 201) {
      console.log(`    ⚠ Created without assignees (permission issue)`);
      return { number: fallback.data.number, nodeId: fallback.data.node_id };
    }
  }
  console.error(`    ✗ Create failed (${res.status}):`, JSON.stringify(res.data).substring(0, 200));
  return null;
}

async function updateAssignees(issueNumber, assignees) {
  if (!assignees.length) return;
  const res = await restRequest('PATCH', `/repos/${OWNER}/${REPO}/issues/${issueNumber}`, { assignees });
  if (res.status !== 200) {
    console.log(`    ⚠ Assignee update failed for #${issueNumber} (${res.status})`);
  }
}

async function addToProject(nodeId) {
  const MUTATION = `
    mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
        item { id }
      }
    }
  `;
  const res = await graphql(MUTATION, { projectId: PROJECT_ID, contentId: nodeId });
  const itemId = res?.data?.addProjectV2ItemById?.item?.id;
  if (!itemId) console.error(`    ✗ addToProject failed:`, JSON.stringify(res?.errors || res).substring(0, 200));
  return itemId || null;
}

async function setStatus(itemId, statusOptionId) {
  const MUTATION = `
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId:    $itemId
        fieldId:   $fieldId
        value:     $value
      }) { projectV2Item { id } }
    }
  `;
  const res = await graphql(MUTATION, {
    projectId: PROJECT_ID,
    itemId,
    fieldId: STATUS_FIELD,
    value: { singleSelectOptionId: statusOptionId },
  });
  if (res?.errors) console.error(`    ✗ setStatus failed:`, JSON.stringify(res.errors).substring(0, 200));
}

// ── Body builder ──────────────────────────────────────────────────────────────
function buildBody(card, listName, labelNames) {
  const desc = (card.desc || '').trim();
  const labels = labelNames.length ? labelNames.join(', ') : '—';
  return [
    desc ? desc + '\n\n---\n' : '',
    `**Trello List:** ${listName}`,
    `**Labels:** ${labels}`,
    `**Trello ID:** #${card.idShort}`,
    `**Trello URL:** ${card.shortUrl}`,
  ].join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📂 Loading Trello data...');
  const trello   = JSON.parse(fs.readFileSync(TRELLO_JSON, 'utf8'));
  const listMap  = Object.fromEntries(trello.lists.map(l => [l.id, l.name]));
  const labelMap = Object.fromEntries(trello.labels.map(l => [l.id, l.name]));
  const memberUsernameMap = Object.fromEntries(trello.members.map(m => [m.id, m.username]));

  const activeCards = trello.cards.filter(c => !c.closed && ACTIVE_LISTS.has(listMap[c.idList]));
  console.log(`✓ Active Trello cards: ${activeCards.length}`);

  console.log('\n📥 Fetching all GitHub issues...');
  const ghIssues = await fetchAllIssues();
  console.log(`✓ GitHub issues found: ${ghIssues.size}`);

  console.log('\n📥 Fetching GitHub Project items...');
  const projItems = await fetchProjectItems();
  console.log(`✓ Project items found: ${projItems.size}`);

  const stats = { created: 0, updated: 0, alreadyCorrect: 0, failed: 0 };

  console.log('\n🔄 Syncing cards...\n');

  for (let i = 0; i < activeCards.length; i++) {
    const card     = activeCards[i];
    const listName = listMap[card.idList];
    const statusId = STATUS_IDS[listName];
    const labels   = card.idLabels.map(id => labelMap[id]).filter(Boolean);
    const assignees = card.idMembers
      .map(id => MEMBER_MAP[memberUsernameMap[id]])
      .filter(Boolean);

    const shortTitle = card.name.substring(0, 70);
    process.stdout.write(`[${String(i+1).padStart(3)}/${activeCards.length}] ${listName.padEnd(26)} ${shortTitle}\n`);

    let issue = ghIssues.get(card.name);

    if (!issue) {
      // Create new GitHub issue
      const body = buildBody(card, listName, labels);
      await sleep(600);
      issue = await createIssue(card.name, body, assignees);
      if (!issue) { stats.failed++; continue; }
      stats.created++;
      console.log(`    ✓ Created #${issue.number}`);
    } else {
      // Update assignees on existing issue
      await sleep(300);
      await updateAssignees(issue.number, assignees);
    }

    // Ensure issue is in the project
    let entry = projItems.get(issue.nodeId);
    if (!entry) {
      await sleep(400);
      const itemId = await addToProject(issue.nodeId);
      if (!itemId) { stats.failed++; continue; }
      entry = { itemId, currentStatus: null };
      projItems.set(issue.nodeId, entry);
    }

    // Set correct status
    if (entry.currentStatus !== listName) {
      await sleep(400);
      await setStatus(entry.itemId, statusId);
      console.log(`    ✓ Status: "${entry.currentStatus || 'none'}" → "${listName}"`);
      stats.updated++;
    } else {
      stats.alreadyCorrect++;
    }

    await sleep(200);
  }

  console.log('\n─────────────────────────────────');
  console.log(`✅ Sync complete`);
  console.log(`   Created:         ${stats.created}`);
  console.log(`   Status updated:  ${stats.updated}`);
  console.log(`   Already correct: ${stats.alreadyCorrect}`);
  console.log(`   Failed:          ${stats.failed}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
