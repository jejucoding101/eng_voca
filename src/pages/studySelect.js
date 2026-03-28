// === Study Select Page ===
import { $, getSession } from '../utils/helpers.js';
import { router } from '../utils/router.js';
import { ROUTES, STUDY_MODES } from '../utils/constants.js';
import { renderNav } from '../components/navbar.js';
import api from '../services/api.js';

export async function renderStudySelect(params = {}) {
  const container = $('#page-container');
  renderNav('home');

  const setId = params.set_id;
  const setName = params.set_name || '단어 세트';

  container.innerHTML = `
    <div class="study-select-header">
      <button class="btn btn-ghost" id="back-btn" style="margin-bottom:var(--sp-md)">← 돌아가기</button>
      <h2>${setName}</h2>
      <p class="text-muted" style="font-size:var(--fs-sm);margin-top:var(--sp-sm)">학습 모드를 선택하세요</p>
    </div>

    <button class="btn btn-secondary btn-full mb-xl" id="view-words-btn">
      📖 단어 목록 보기
    </button>

    <div class="study-select-grid stagger-children">
      ${STUDY_MODES.map(mode => `
        <div class="study-mode-card" data-mode="${mode.route}" data-id="${mode.id}">
          <div class="study-mode-icon" style="background:${mode.color}22;color:${mode.color}">${mode.icon}</div>
          <div class="study-mode-info">
            <div class="study-mode-name">${mode.name}</div>
            <div class="study-mode-desc">${mode.desc}</div>
          </div>
          <span style="color:var(--text-muted)">→</span>
        </div>
      `).join('')}
    </div>
  `;

  $('#back-btn').addEventListener('click', () => router.navigate(ROUTES.HOME));
  $('#view-words-btn').addEventListener('click', () => router.navigate(ROUTES.WORD_LIST, { set_id: setId, set_name: setName }));

  document.querySelectorAll('.study-mode-card').forEach(card => {
    card.addEventListener('click', () => {
      router.navigate(card.dataset.mode, { set_id: setId, set_name: setName });
    });
  });
}
