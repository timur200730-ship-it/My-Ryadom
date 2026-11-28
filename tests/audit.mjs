import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const ids = [
  'safe-climate',
  'boundaries-consent',
  'recognize-bullying',
  'anger-regulation',
  'support-classmate',
  'cyberbullying-action',
  'words-impact-core',
  'responsibility-recovery',
  'help-route',
  'safe-school-audit'
];
const ages = ['6–10 лет', '11–14 лет', '15–18 лет'];
const expectedDurations = [28, 40, 43];

const canonicalSource = read('../lesson-library-canonical.js');
const context = { window: {} };
vm.runInNewContext(canonicalSource, context, { timeout: 1500 });
const extension = context.window.MYRYADOM_LESSON_EXTENSIONS;
assert.ok(extension, 'Canonical lesson extensions must register on window');

const lessonIds = new Set(extension.lessons.map((lesson) => lesson.id));
for (const id of ['words-impact-core', 'responsibility-recovery', 'safe-school-audit']) {
  assert.ok(lessonIds.has(id), `Missing canonical lesson: ${id}`);
}

assert.equal(Object.keys(extension.agePlans).length, 10, 'There must be age plans for all ten routes');
for (const id of ids) {
  const plans = extension.agePlans[id];
  assert.ok(plans, `Missing age plans for ${id}`);
  assert.deepEqual(Object.keys(plans).sort(), [...ages].sort(), `Wrong age groups in ${id}`);
  assert.deepEqual(ages.map((age) => plans[age].duration), expectedDurations, `Wrong duration in ${id}`);
  assert.ok(ages.every((age) => typeof plans[age].plan === 'string' && plans[age].plan.length > 20), `Missing detailed plan in ${id}`);
}

assert.equal(Object.keys(extension.ageQuizzes).length, 10, 'There must be age quizzes for all ten routes');
for (const id of ids) {
  const groups = extension.ageQuizzes[id];
  assert.ok(groups, `Missing age quizzes for ${id}`);
  assert.deepEqual(Object.keys(groups).sort(), [...ages].sort(), `Wrong quiz age groups in ${id}`);
  for (const age of ages) {
    assert.equal(groups[age].length, 3, `Expected three questions for ${id} / ${age}`);
    for (const [index, q] of groups[age].entries()) {
      assert.ok(Array.isArray(q) && q.length === 4, `Malformed question ${id} / ${age} / ${index + 1}`);
      assert.equal(q[1].length, 3, `Question must have three options: ${id} / ${age}`);
      assert.ok(Number.isInteger(q[2]) && q[2] >= 0 && q[2] < 3, `Invalid answer key: ${id} / ${age}`);
      assert.ok(typeof q[0] === 'string' && q[0].length > 10, 'Question text is missing');
      assert.ok(typeof q[3] === 'string' && q[3].length > 10, 'Answer explanation is missing');
    }
  }
}

assert.deepEqual(Object.keys(extension.helpRouteAgeVariants).sort(), [...ages].sort(), 'Help route must have all three age variants');

const libraryHtml = read('../lesson-library.html');
assert.ok(libraryHtml.indexOf('lesson-library-canonical.js') < libraryHtml.indexOf('lesson-library.js'), 'Canonical data must load before the library controller');
const libraryJs = read('../lesson-library.js');
for (const id of ['safety-respect','boundaries','conflict','emotions','witness-support','online-safety','words-impact','responsibility','help-route','safe-school']) {
  assert.ok(libraryJs.includes(`id:'${id}'`), `Missing student route: ${id}`);
}
assert.ok(libraryJs.includes('|v1.21'), 'Revised route progress keys must be versioned');
assert.ok(!/localStorage\\.removeItem\\((?:progressKey|draftKey)/.test(libraryJs), 'Legacy student progress/drafts must not be silently deleted');
const appJs = read('../app.js');
for (const key of ['myryadom-done-v2','myryadom-student-progress-v2','myryadom-student-drafts-v2','myryadom-student-route-v2']) {
  assert.ok(appJs.includes(key), `Full reset must include ${key}`);
}

const sw = read('../sw.js');
for (const path of ['./lesson-library.html','./lesson-library.js','./lesson-library-canonical.js','./docs/19_ROUTE_MAP_AND_V1_21_BETA_RU.md','./docs/20_METHOD_REVIEW_AGE_QUIZZES_AND_LESSON_1_RU.md','./docs/21_EXPERT_SWARM_CHARTER_RU.md']) {
  assert.ok(sw.includes(path), `Missing offline cache entry: ${path}`);
}
assert.ok(/const CACHE = 'my-ryadom-[^']+'/.test(sw), 'Service Worker cache must be versioned');
assert.ok(!sw.includes('skipWaiting'), 'Do not force an unreviewed Service Worker takeover');

const manifest = JSON.parse(read('../manifest.webmanifest'));
assert.ok(manifest.start_url && manifest.scope, 'PWA manifest must define start_url and scope');

const worksheets = read('../docs/09_STUDENT_WORKSHEETS_RU.md');
const worksheetCount = (worksheets.match(/^## Лист \\d+\\./gm) || []).length;
assert.equal(worksheetCount, 11, 'Worksheet index/count must match the eleven actual worksheets');

const privacyDocs = [read('../README.md'), read('../docs/01_PROJECT_SPEC_RU.md'), read('../docs/04_SOURCES_AND_SAFETY_RU.md')].join('\\n');
assert.ok(/черновик|черновики/i.test(privacyDocs), 'Privacy documentation must disclose local drafts');
assert.ok(/ответы.*локал|локал.*ответы/is.test(privacyDocs), 'Privacy documentation must disclose locally stored answers');
assert.ok(!/локально хранится только список ID|локально хранится только.*ID/i.test(privacyDocs), 'Outdated claim that only completion IDs are stored must be removed');

const methodology = read('../docs/02_METHODOLOGY_RU.md');
assert.ok(!/безопасно сохранить факты|собирать доказательства ребёнк/i.test(methodology), 'Methodology must not assign evidence collection to children');

const index = read('../docs/00_DOCS_INDEX_RU.md');
for (const file of ['19_ROUTE_MAP_AND_V1_21_BETA_RU.md','20_METHOD_REVIEW_AGE_QUIZZES_AND_LESSON_1_RU.md','21_EXPERT_SWARM_CHARTER_RU.md']) {
  assert.ok(index.includes(file), `Document index missing ${file}`);
}

console.log('PASS: ten routes, 30 age plans, 90 questions, PWA cache, privacy and document consistency.');
