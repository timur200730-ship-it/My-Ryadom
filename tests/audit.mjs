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
assert.ok(libraryJs.includes("new URLSearchParams(window.location.search).get('mode')==='student'"), 'Student deep link must open student mode');
assert.ok(!/localStorage\.removeItem\((?:progressKey|draftKey)/.test(libraryJs), 'Legacy student progress/drafts must not be silently deleted');
const appJs = read('../app.js');
assert.ok(appJs.includes('черновики ученического маршрута'), 'Reset confirmation must specify student route drafts');
for (const key of ['myryadom-done-v2','myryadom-student-progress-v2','myryadom-student-drafts-v2','myryadom-student-route-v2','myryadom-student-progress-v1']) {
  assert.ok(appJs.includes(key), `Full reset must include ${key}`);
}

const sw = read('../sw.js');
for (const path of ['./lesson-library.html','./lesson-library.js','./lesson-library-canonical.js','./docs/19_ROUTE_MAP_AND_V1_21_BETA_RU.md','./docs/20_METHOD_REVIEW_AGE_QUIZZES_AND_LESSON_1_RU.md','./docs/21_EXPERT_SWARM_CHARTER_RU.md','./docs/22_NORMATIVE_REVIEW_2026_11_RU.md']) {
  assert.ok(sw.includes(path), `Missing offline cache entry: ${path}`);
}
assert.ok(/const CACHE = 'my-ryadom-[^']+'/.test(sw), 'Service Worker cache must be versioned');
assert.ok(!sw.includes('skipWaiting'), 'Do not force an unreviewed Service Worker takeover');

const manifest = JSON.parse(read('../manifest.webmanifest'));
assert.ok(manifest.start_url && manifest.scope, 'PWA manifest must define start_url and scope');

const worksheets = read('../docs/09_STUDENT_WORKSHEETS_RU.md');
const worksheetCount = (worksheets.match(/^## Лист \d+\./gm) || []).length;
assert.equal(worksheetCount, 11, 'Worksheet index/count must match the eleven actual worksheets');

const privacyDocs = [read('../README.md'), read('../docs/01_PROJECT_SPEC_RU.md'), read('../docs/04_SOURCES_AND_SAFETY_RU.md')].join('\n');
assert.ok(/черновик|черновики/i.test(privacyDocs), 'Privacy documentation must disclose local drafts');
assert.ok(/ответы.*локал|локал.*ответы/is.test(privacyDocs), 'Privacy documentation must disclose locally stored answers');
assert.ok(/календарь школы/i.test(privacyDocs), 'Privacy documentation must disclose locally stored admin calendar');
assert.ok(/черновики сценариев педагога/i.test(privacyDocs), 'Privacy documentation must disclose teacher scenario drafts');
assert.ok(!/локально хранится только список ID|локально хранится только.*ID/i.test(privacyDocs), 'Outdated claim that only completion IDs are stored must be removed');

const methodology = read('../docs/02_METHODOLOGY_RU.md');
assert.ok(!/безопасно сохранить факты|собирать доказательства ребёнк/i.test(methodology), 'Methodology must not assign evidence collection to children');

const index = read('../docs/00_DOCS_INDEX_RU.md');
for (const file of ['19_ROUTE_MAP_AND_V1_21_BETA_RU.md','20_METHOD_REVIEW_AGE_QUIZZES_AND_LESSON_1_RU.md','21_EXPERT_SWARM_CHARTER_RU.md','22_NORMATIVE_REVIEW_2026_11_RU.md']) {
  assert.ok(index.includes(file), `Document index missing ${file}`);
}
const normative = read('../docs/22_NORMATIVE_REVIEW_2026_11_RU.md');
assert.ok(normative.includes('№ 414') && normative.includes('19.08.2026') && normative.includes('№ 265-ФЗ'), 'Normative review must record 2026 updates');


const legacyTopicsMatch = appJs.match(/let topics=(\[[\s\S]*?\n\]);\n\/\/ Дополнительные учебные темы/);
assert.ok(legacyTopicsMatch, 'Could not extract the twelve legacy topics for answer-key audit');
const legacyTopics = vm.runInNewContext(legacyTopicsMatch[1], {}, { timeout: 1500 });
assert.equal(legacyTopics.length, 12, 'There must be twelve legacy topics');
const expectedLegacyKeys = [
  [1, 1, 2], // Безопасная школа
  [1, 1, 1], // Конфликт или травля?
  [1, 1, 2], // Формы агрессии
  [1, 1, 1], // Мои эмоции
  [1, 1, 1], // Личные границы
  [1, 0, 1], // Сила группы
  [1, 0, 1], // Я свидетель
  [1, 1, 1], // Цифровая безопасность
  [1, 1, 1], // Если обижают меня
  [1, 1, 1], // Если я причинил вред
  [1, 1, 1], // Взрослый рядом
  [1, 1, 2]  // Наш безопасный класс
];
let legacyQuestionCount = 0;
for (const [topicIndex, topic] of legacyTopics.entries()) {
  assert.equal(topic.quiz.length, 3, `Expected three age questions in legacy topic ${topicIndex + 1}`);
  assert.equal(topic.options.length, 3, `Expected three age option groups in legacy topic ${topicIndex + 1}`);
  const actualKeys = Array.isArray(topic.correct) ? topic.correct : [topic.correct, topic.correct, topic.correct];
  assert.deepEqual(Array.from(actualKeys), expectedLegacyKeys[topicIndex], `Wrong answer keys in legacy topic: ${topic.title}`);
  for (let ageIndex = 0; ageIndex < 3; ageIndex++) {
    assert.equal(topic.options[ageIndex].length, 3, `Expected three options: ${topic.title} / age ${ageIndex}`);
    assert.ok(Number.isInteger(actualKeys[ageIndex]) && actualKeys[ageIndex] >= 0 && actualKeys[ageIndex] < topic.options[ageIndex].length, `Answer key out of range: ${topic.title} / age ${ageIndex}`);
    legacyQuestionCount++;
  }
}
assert.equal(legacyQuestionCount, 36, 'All 36 legacy age-specific questions must be checked');
assert.ok(appJs.includes('Array.isArray(t.correct)?t.correct[level]:t.correct'), 'Quiz handler must select an age-specific key while preserving numeric legacy keys');
const resolveLegacyCorrect = (correct, level) => Array.isArray(correct) ? correct[level] : correct;
assert.equal(resolveLegacyCorrect([1, 0, 2], 1), 0, 'Age-specific key selection must use the active age index');
assert.equal(resolveLegacyCorrect(1, 2), 1, 'Numeric keys for additional admin topics must remain supported');


const escapedCardTemplate = '<b>${escHtml(t.title)}</b><p>${escHtml(t.desc)}</p>';
assert.equal(appJs.split(escapedCardTemplate).length - 1, 2, 'Both topic card templates must escape custom titles and descriptions');
assert.ok(!appJs.includes('<b>${t.title}</b><p>${t.desc}</p>'), 'No topic card may interpolate custom title/description without HTML escaping');
const helperStart = appJs.indexOf('function loadProgress(){');
const helperEnd = appJs.indexOf('\nlet age=', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'Safe progress storage helpers must be present');
const helperSource = appJs.slice(helperStart, helperEnd);
const storageContext = { stored: 'not-json', localStorage: { getItem() { return storageContext.stored; }, setItem(key, value) { storageContext.written = [key, value]; } }, console: { warn() {} } };
vm.runInNewContext(`${helperSource};globalThis.loadProgress=loadProgress;globalThis.saveProgress=saveProgress;`, storageContext, { timeout: 1500 });
assert.deepEqual(Array.from(storageContext.loadProgress()), [], 'Malformed progress JSON must not crash app startup');
assert.equal(storageContext.stored, 'not-json', 'Malformed progress must not be silently deleted');
storageContext.stored = JSON.stringify(['junior-1', 42, null, 'middle-2']);
assert.deepEqual(Array.from(storageContext.loadProgress()), ['junior-1', 'middle-2'], 'Progress loader must retain only string keys');
storageContext.stored = JSON.stringify({ unexpected: true });
assert.deepEqual(Array.from(storageContext.loadProgress()), [], 'Non-array progress data must be ignored safely');
assert.equal(storageContext.saveProgress(['junior-1']), true, 'Progress should save when localStorage is available');
assert.equal(storageContext.written[0], 'myryadom-done-v2', 'Progress must use the existing storage key');
storageContext.localStorage.setItem = () => { throw new Error('storage unavailable'); };
assert.equal(storageContext.saveProgress(['junior-1']), false, 'Storage write errors must be caught and reported');
assert.ok(appJs.includes('progressSaveStatus') && appJs.includes('Тема отмечена только до закрытия страницы'), 'User must be told when progress cannot persist');



const baseMaterialsMatch = libraryJs.match(/const lessons = (\[[\s\S]*?\n  \]);\n  \/\/ Полная возрастная адаптация/);
assert.ok(baseMaterialsMatch, 'Could not extract base library materials');
const baseMaterials = vm.runInNewContext(baseMaterialsMatch[1], {}, { timeout: 1500 });
const canonicalMaterialsMatch = canonicalSource.match(/const lessons = (\[[\s\S]*?\n  \]);\n\n  const agePlans/);
assert.ok(canonicalMaterialsMatch, 'Could not extract canonical extension materials');
const canonicalMaterials = vm.runInNewContext(canonicalMaterialsMatch[1], {}, { timeout: 1500 });
const allMaterialIds = [...baseMaterials, ...canonicalMaterials].map(item => item.id);
assert.equal(baseMaterials.length, 11, 'The library must retain eleven base materials');
assert.equal(canonicalMaterials.length, 3, 'The library must retain three canonical extensions');
assert.equal(allMaterialIds.length, 14, 'The library must contain fourteen materials in total');
assert.equal(new Set(allMaterialIds).size, 14, 'Material IDs must be unique across base and canonical files');
const tracksMatch = libraryJs.match(/const studentTracks=(\[[\s\S]*?\n  \]);\n  const studentLessons/);
assert.ok(tracksMatch, 'Could not extract the ten student route mappings');
const studentTracks = vm.runInNewContext(tracksMatch[1], {}, { timeout: 1500 });
assert.equal(studentTracks.length, 10, 'There must be exactly ten student routes');
assert.equal(new Set(studentTracks.map(track => track.id)).size, 10, 'Student route IDs must be unique');
assert.equal(new Set(studentTracks.map(track => track.lessonId)).size, 10, 'Each student route must point to a distinct lesson');
for (const track of studentTracks) {
  assert.ok(allMaterialIds.includes(track.lessonId), `Route ${track.id} points to missing material ${track.lessonId}`);
}
const expectedRouteMap = {
  'safety-respect':'safe-climate',
  boundaries:'boundaries-consent',
  conflict:'recognize-bullying',
  emotions:'anger-regulation',
  'witness-support':'support-classmate',
  'online-safety':'cyberbullying-action',
  'words-impact':'words-impact-core',
  responsibility:'responsibility-recovery',
  'help-route':'help-route',
  'safe-school':'safe-school-audit'
};
for (const [routeId, lessonId] of Object.entries(expectedRouteMap)) {
  assert.equal(studentTracks.find(track => track.id === routeId)?.lessonId, lessonId, `Unexpected canonical mapping for route ${routeId}`);
}
const archiveIds = ['witness', 'digital', 'respectful-class'];
for (const id of archiveIds) assert.ok(allMaterialIds.includes(id), `Archived material must remain available: ${id}`);
assert.ok(allMaterialIds.includes('group-pressure'), 'The supplementary group-pressure material must remain available');
assert.ok(libraryJs.includes("new Set(['group-pressure'])") && libraryJs.includes("new Set(['witness','digital','respectful-class'])"), 'Supplementary and archived materials must be explicitly classified');
assert.ok(libraryJs.includes('Статус: ${esc(materialStatus(x.id))}') && libraryJs.includes('Статус материала:</b> ${esc(materialStatus(l.id))}'), 'Material status must appear in both list cards and lesson detail');
assert.equal((libraryJs.match(/if\(new URLSearchParams\(window\.location\.search\)\.get\('mode'\)==='student'\)showStudentMode\(\);/g)||[]).length, 1, 'Student deep link must activate student mode exactly once');
assert.ok(!libraryJs.includes("window.location.search.includes('mode=student')"), 'Legacy second student-mode trigger must be removed');
const migrationMatch = libraryJs.match(/const migrate=(\{[^;]+\});/);
assert.ok(migrationMatch, 'Legacy progress migration map must be present');
assert.ok(!Object.hasOwn(vm.runInNewContext(`(${migrationMatch[1]})`, {}, { timeout: 1500 }), 'group-pressure'), 'Supplementary material must not be migrated as completion of a main student route');
const migration = vm.runInNewContext(`(${migrationMatch[1]})`, {}, { timeout: 1500 });
for (const [oldId, routeId] of Object.entries({
  'safe-climate':'safety-respect',
  'boundaries-consent':'boundaries',
  'recognize-bullying':'conflict',
  'support-classmate':'witness-support',
  'witness':'witness-support',
  'cyberbullying-action':'online-safety',
  'digital':'online-safety',
  'anger-regulation':'emotions',
  'respectful-class':'safe-school',
  'words-impact-core':'words-impact',
  'responsibility-recovery':'responsibility',
  'help-route':'help-route',
  'safe-school-audit':'safe-school'
})) assert.equal(migration[oldId], routeId, `Legacy progress for ${oldId} must map to ${routeId}`);
assert.ok(!migration['recognize-bullying']?.includes?.('safety-respect'), 'Old bullying progress must not be assigned to the safety-and-respect route');
const routeDoc = read('../docs/19_ROUTE_MAP_AND_V1_21_BETA_RU.md');
assert.ok(routeDoc.includes('Инвентаризация всех 14 материалов библиотеки'), 'Route map must document all fourteen materials and their status');
for (const status of ['Основной маршрут', 'Дополнительный материал', 'Архивная редакция']) {
  assert.ok(routeDoc.includes(status), `Route map must distinguish material status: ${status}`);
}

console.log('PASS: ten routes, 30 age plans, 90 canonical questions, 36 legacy age questions, safe custom-topic rendering, resilient local progress, library mapping and status, single student-mode activation, safe custom-topic rendering, resilient local progress, PWA cache, privacy and document consistency.');
