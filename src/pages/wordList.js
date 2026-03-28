// === Word List Page ===
import { $, getSession, showToast } from '../utils/helpers.js';
import { router } from '../utils/router.js';
import { ROUTES } from '../utils/constants.js';
import { renderNav } from '../components/navbar.js';
import { speak } from '../services/tts.js';
import api from '../services/api.js';

export async function renderWordList(params = {}) {
  const container = $('#page-container');
  renderNav('home');

  container.innerHTML = `
    <button class="btn btn-ghost" id="back-btn" style="margin-bottom:var(--sp-md)">← 돌아가기</button>
    <h2 style="margin-bottom:var(--sp-xl)">${params.set_name || '단어 목록'}</h2>
    <div id="words-container">
      <div class="skeleton" style="height:60px;margin-bottom:8px"></div>
      <div class="skeleton" style="height:60px;margin-bottom:8px"></div>
      <div class="skeleton" style="height:60px;margin-bottom:8px"></div>
    </div>
  `;

  $('#back-btn').addEventListener('click', () => {
    router.navigate(ROUTES.STUDY_SELECT, { set_id: params.set_id, set_name: params.set_name });
  });

  const user = getSession();
  const res = await api.getWords(user.user_id, params.set_id);

  if (res.success && res.data) {
    const words = res.data;
    $('#words-container').innerHTML = words.length > 0 ? `
      <p class="text-muted mb-lg" style="font-size:var(--fs-sm)">${words.length}개 단어</p>
      <div class="stagger-children" style="display:flex;flex-direction:column;gap:var(--sp-sm)">
        ${words.map((w, i) => {
          const mastery = w.progress?.mastery_level || 0;
          const masteryColors = ['var(--text-muted)', 'var(--error)', 'var(--warning)', 'var(--warning)', 'var(--success)', 'var(--gold)'];
          return `
            <div class="word-item">
              <div style="width:24px;text-align:center;color:${masteryColors[mastery]};font-size:var(--fs-xs)">${'●'.repeat(Math.max(1, mastery))}</div>
              <div class="word-text">
                <div class="word-english">${w.word}</div>
                <div class="word-korean">${w.meaning_ko}</div>
                ${w.pronunciation ? `<div class="word-pronunciation">${w.pronunciation}</div>` : ''}
              </div>
              <button class="btn btn-ghost btn-icon" data-speak="${w.word}" style="font-size:18px">🔊</button>
            </div>
          `;
        }).join('')}
      </div>
    ` : '<div class="empty-state"><div class="empty-state-text">단어가 없습니다.</div></div>';

    document.querySelectorAll('[data-speak]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        speak(btn.dataset.speak);
      });
    });
  }
}
