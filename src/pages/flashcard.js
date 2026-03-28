// === Flashcard Mode ===
import { $, getSession, showToast, vibrate } from '../utils/helpers.js';
import { router } from '../utils/router.js';
import { ROUTES } from '../utils/constants.js';
import { renderNav } from '../components/navbar.js';
import { speak } from '../services/tts.js';
import api from '../services/api.js';

export async function renderFlashcard(params = {}) {
  const container = $('#page-container');
  const nav = $('#bottom-nav');
  nav.classList.add('hidden');

  container.innerHTML = `<div class="flashcard-page"><div class="flex-center" style="height:300px"><div class="loader-spinner"></div></div></div>`;

  const user = getSession();
  const res = await api.getWords(user.user_id, params.set_id);
  if (!res.success || !res.data || res.data.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-text">단어가 없습니다.</div><button class="btn btn-secondary" id="back-btn">돌아가기</button></div>`;
    $('#back-btn').addEventListener('click', () => router.navigate(ROUTES.STUDY_SELECT, params));
    return;
  }

  const words = res.data;
  let currentIndex = 0;
  let isFlipped = false;

  function render() {
    const word = words[currentIndex];
    container.innerHTML = `
      <div class="flashcard-page">
        <div class="flex-between mb-lg">
          <button class="btn btn-ghost" id="fc-back">← 나가기</button>
          <span style="color:var(--text-secondary);font-size:var(--fs-sm)">${params.set_name || ''}</span>
        </div>
        <div class="flashcard-progress">
          <div class="progress-bar" style="flex:1"><div class="progress-bar-fill" style="width:${((currentIndex + 1) / words.length) * 100}%"></div></div>
          <span class="flashcard-progress-text">${currentIndex + 1}/${words.length}</span>
        </div>
        <div class="flashcard-container flip-card ${isFlipped ? 'flipped' : ''}" id="flashcard">
          <div class="flip-card-inner">
            <div class="flip-card-front flashcard-card">
              <div class="flashcard-word">${word.word}</div>
              ${word.pronunciation ? `<div class="flashcard-pronunciation">${word.pronunciation}</div>` : ''}
              ${word.part_of_speech ? `<div class="flashcard-pos">${word.part_of_speech}</div>` : ''}
              <p style="color:var(--text-muted);font-size:var(--fs-sm);margin-top:var(--sp-xl)">탭하여 뜻 확인</p>
            </div>
            <div class="flip-card-back flashcard-card">
              <div class="flashcard-meaning">${word.meaning_ko}</div>
              ${word.example_sentence ? `<div class="flashcard-example">"${word.example_sentence}"</div>` : ''}
              ${word.derivatives && word.derivatives.length ? `<div class="flashcard-derivatives">파생어: ${word.derivatives.join(', ')}</div>` : ''}
            </div>
          </div>
        </div>
        <div class="flashcard-controls">
          <button class="flashcard-nav-btn" id="fc-prev" ${currentIndex === 0 ? 'disabled style="opacity:0.3"' : ''}>◀</button>
          <button class="flashcard-sound-btn" id="fc-sound">🔊</button>
          <button class="flashcard-nav-btn" id="fc-next" ${currentIndex === words.length - 1 ? 'disabled style="opacity:0.3"' : ''}>▶</button>
        </div>
      </div>
    `;

    $('#fc-back').addEventListener('click', () => { nav.classList.remove('hidden'); router.navigate(ROUTES.STUDY_SELECT, params); });
    $('#flashcard').addEventListener('click', () => { isFlipped = !isFlipped; vibrate(15); render(); });
    $('#fc-sound').addEventListener('click', (e) => { e.stopPropagation(); speak(word.word); });
    $('#fc-prev').addEventListener('click', () => { if (currentIndex > 0) { currentIndex--; isFlipped = false; render(); } });
    $('#fc-next').addEventListener('click', () => { if (currentIndex < words.length - 1) { currentIndex++; isFlipped = false; render(); } });

    // 스와이프
    let startX = 0;
    const card = $('#flashcard');
    card.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    card.addEventListener('touchend', (e) => {
      const diff = e.changedTouches[0].clientX - startX;
      if (Math.abs(diff) > 60) {
        if (diff < 0 && currentIndex < words.length - 1) { currentIndex++; isFlipped = false; render(); }
        else if (diff > 0 && currentIndex > 0) { currentIndex--; isFlipped = false; render(); }
      }
    }, { passive: true });
  }

  render();
}
