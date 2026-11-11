/* Независимый конструктор сценариев. Отдельный файл, чтобы ошибка в других
   разделах панели администратора не отключала формирование занятия. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const ids = ['builderTopic','builderAge','builderGoal','builderMaterials','builderCase','builderQuestions','builderExercise','builderReflection','builderHelp','buildLesson','saveLessonDraft','printLesson','builderStatus','lessonPreview','lessonDraftList'];
  const missing = ids.filter(id => !$(id));
  if (missing.length) {
    const status = $('builderStatus');
    if (status) status.textContent = 'Конструктор не запущен: не найдены элементы интерфейса (' + missing.join(', ') + '). Обновите файлы приложения.';
    return;
  }
  const KEY = 'myryadom-lesson-drafts-v1';
  let currentPlan = null;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const status = message => { $('builderStatus').textContent = message; };
  const read = id => $(id).value.trim();
  function makePlan() {
    const v = {
      topic: read('builderTopic'), age: read('builderAge'), goal: read('builderGoal'),
      materials: read('builderMaterials'), situation: read('builderCase'),
      questions: read('builderQuestions').split(/\n+/).map(x=>x.trim()).filter(Boolean),
      exercise: read('builderExercise'), reflection: read('builderReflection'), help: read('builderHelp')
    };
    const required = [['цель',v.goal],['вымышленную ситуацию',v.situation],['практическое упражнение',v.exercise],['маршрут помощи',v.help]];
    const absent = required.filter(x=>!x[1]).map(x=>x[0]);
    if (absent.length) { status('Заполни обязательные поля: ' + absent.join(', ') + '.'); return null; }
    const age = ({junior:'6–10 лет',middle:'11–14 лет',senior:'15–18 лет'})[v.age] || 'Возраст не указан';
    return {
      id: 'plan-' + Date.now(), title: v.topic, age, goal: v.goal, materials: v.materials,
      questions: v.questions, help: v.help, savedAt: '',
      steps: [
        ['Вход и правила безопасности',5,'Договориться: не называем имён, не обсуждаем реальные случаи, можно не отвечать на личный вопрос.'],
        ['Введение в тему',5,'Обозначить цель занятия и ключевые понятия простым языком, соответствующим возрасту.'],
        ['Вымышленная ситуация',8,v.situation],
        ['Обсуждение',8,v.questions.length ? v.questions.join(' ') : 'Обсудить, что происходит в ситуации и какие безопасные действия возможны.'],
        ['Практическое упражнение',9,v.exercise],
        ['Итог и маршрут помощи',5,[v.reflection,v.help].filter(Boolean).join(' ')]
      ]
    };
  }
  function html(p) {
    return `<article class="lesson-print"><span class="kicker">МЫ РЯДОМ · МЕТОДИЧЕСКИЙ СЦЕНАРИЙ</span><h2>${esc(p.title)}</h2><p><b>Возраст:</b> ${esc(p.age)} · <b>Продолжительность:</b> 40 минут</p><h3>Цель</h3><p>${esc(p.goal)}</p><h3>Материалы</h3><p>${esc(p.materials || 'По выбору педагога')}</p><h3>Ход занятия</h3><ol class="lesson-points">${p.steps.map(x=>`<li><b>${esc(x[0])} — ${x[1]} мин.</b><p>${esc(x[2])}</p></li>`).join('')}</ol><h3>Вопросы для обсуждения</h3><ul class="lesson-points">${(p.questions.length?p.questions:['Какие безопасные действия возможны?']).map(q=>`<li>${esc(q)}</li>`).join('')}</ul><h3>Маршрут помощи</h3><p>${esc(p.help)}</p><p class="source-note"><b>Правило безопасности:</b> не просить детей рассказывать о личном опыте перед классом, не устраивать публичное выяснение и не навязывать примирение. При сообщении о реальной угрозе педагог действует по утверждённому школьному порядку.</p><p class="source-note">Черновой методический шаблон. До проведения согласовать с педагогом-психологом и ответственным сотрудником школы.</p></article>`;
  }
  function render() {
    $('lessonPreview').innerHTML = html(currentPlan);
    $('printLesson').disabled = false;
    status('Сценарий сформирован. Проверь содержание и адаптируй его к своей школе.');
  }
  function drafts() {
    try { const data = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(data) ? data.filter(p=>p && typeof p.id==='string' && Array.isArray(p.steps)) : []; }
    catch (_) { return []; }
  }
  function renderDrafts() {
    const list = drafts();
    $('lessonDraftList').innerHTML = list.length ? list.map(p=>`<article class="admin-item"><div><b>${esc(p.title)}</b><p>${esc(p.age)} · ${esc(p.savedAt || 'Черновик')}</p></div><div class="admin-actions"><button type="button" class="ghost" data-open-draft="${esc(p.id)}">Открыть</button><button type="button" class="ghost" data-remove-draft="${esc(p.id)}">Удалить</button></div></article>`).join('') : '<p class="admin-muted">Сохранённых черновиков пока нет.</p>';
    $('lessonDraftList').querySelectorAll('[data-open-draft]').forEach(b=>b.addEventListener('click',()=>{currentPlan=drafts().find(p=>p.id===b.dataset.openDraft)||null;if(currentPlan)render();}));
    $('lessonDraftList').querySelectorAll('[data-remove-draft]').forEach(b=>b.addEventListener('click',()=>{localStorage.setItem(KEY,JSON.stringify(drafts().filter(p=>p.id!==b.dataset.removeDraft)));renderDrafts();}));
  }
  $('buildLesson').addEventListener('click',()=>{try{currentPlan=makePlan();if(currentPlan)render();}catch(err){console.error('Lesson builder:',err);status('Не удалось сформировать сценарий: '+(err.message||'неизвестная ошибка'));}});
  $('saveLessonDraft').addEventListener('click',()=>{try{if(!currentPlan){currentPlan=makePlan();if(!currentPlan)return;}currentPlan.savedAt=new Date().toLocaleDateString('ru-RU');const list=drafts();list.unshift(currentPlan);localStorage.setItem(KEY,JSON.stringify(list.slice(0,30)));renderDrafts();status('Черновик сохранён на этом устройстве.');}catch(err){status('Не удалось сохранить черновик: '+(err.message||'ошибка хранилища'));}});
  $('printLesson').addEventListener('click',()=>{if(!currentPlan)return;const w=window.open('','_blank');if(!w){status('Разреши всплывающее окно для печати сценария.');return;}w.document.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${esc(currentPlan.title)}</title><style>body{font:16px/1.55 Arial,sans-serif;color:#172b4d;max-width:800px;margin:36px auto;padding:0 24px}h2{font-size:26px}h3{margin-top:22px}.lesson-points li{margin:10px 0}.source-note{font-size:13px;color:#536879;border-top:1px solid #ddd;padding-top:12px}@media print{body{margin:15mm auto}}</style></head><body>${html(currentPlan)}<script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();});
  renderDrafts();
})();
