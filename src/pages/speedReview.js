// === Speed Review Mode ===
import { $, getSession, shuffleArray, vibrate } from '../utils/helpers.js';
import { router } from '../utils/router.js';
import { ROUTES, SCORE_TABLE } from '../utils/constants.js';
import { speak } from '../services/tts.js';
import api from '../services/api.js';

export async function renderSpeedReview(params = {}) {
  const container = $('#page-container');
  const nav = $('#bottom-nav');
  nav.classList.add('hidden');

  container.innerHTML = `<div class="flex-center" style="height:300px"><div class="loader-spinner"></div></div>`;

  const user = getSession();
  const res = await api.getWords(user.user_id, params.set_id);
  if (!res.success || !res.data || res.data.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-text">단어가 없습니다.</div><button class="btn btn-secondary" id="back-btn">돌아가기</button></div>`;
    $('#back-btn')?.addEventListener('click', () => { nav.classList.remove('hidden'); router.navigate(ROUTES.STUDY_SELECT, params); });
    return;
  }

  let words = shuffleArray(res.data);
  let currentIndex = 0;
  let known = 0;
  let unknown = 0;
  const unknownWords = [];
  const results = [];
  const startTime = Date.now();

  function render() {
    if (currentIndex >= words.length) { showResult(); return; }

    const w = words[currentIndex];
    container.innerHTML = `
      <div>
        <div class="flex-between mb-lg">
          <button class="btn btn-ghost" id="sr-back">← 나가기</button>
          <span class="text-muted" style="font-size:var(--fs-sm)">${currentIndex + 1}/${words.length}</span>
        </div>
        <div class="progress-bar mb-xl"><div class="progress-bar-fill" style="width:${(currentIndex / words.length) * 100}%"></div></div>
        <div class="speed-card-container">
          <div class="speed-card swipe-card" id="speed-card">
            <div style="font-size:var(--fs-3xl);font-weight:var(--fw-extrabold);margin-bottom:var(--sp-lg)">${w.word}</div>
            ${w.pronunciation ? `<div style="color:var(--text-secondary);font-style:italic;margin-bottom:var(--sp-sm)">${w.pronunciation}</div>` : ''}
            <div style="color:var(--text-secondary);font-size:var(--fs-base);margin-top:var(--sp-lg)">${w.meaning_ko}</div>
          </div>
        </div>
        <div class="speed-controls">
          <button class="speed-btn speed-btn-wrong" id="sr-wrong">✗</button>
          <button class="btn btn-ghost btn-icon" id="sr-sound" style="font-size:1.2rem">🔊</button>
          <button class="speed-btn speed-btn-correct" id="sr-correct">✓</button>
        </div>
        <div class="flex-center gap-lg mt-lg">
          <span class="text-error" style="font-size:var(--fs-sm)">모르겠어요</span>
          <span style="flex:1"></span>
          <span class="text-success" style="font-size:var(--fs-sm)">알아요</span>
        </div>
      </div>
    `;

    $('#sr-back').addEventListener('click', () => { nav.classList.remove('hidden'); router.navigate(ROUTES.STUDY_SELECT, params); });
    $('#sr-sound').addEventListener('click', () => speak(w.word));

    $('#sr-correct').addEventListener('click', () => {
      vibrate(15);
      known++;
      results.push({ word_id: w.word_id, correct: true, score: SCORE_TABLE.speed_correct });
      const card = $('#speed-card');
      card.classList.add('swipe-right');
      setTimeout(() => { currentIndex++; render(); }, 300);
    });

    $('#sr-wrong').addEventListener('click', () => {
      vibrate([30, 20, 30]);
      unknown++;
      unknownWords.push(w);
      results.push({ word_id: w.word_id, correct: false, score: 0 });
      const card = $('#speed-card');
      card.classList.add('swipe-left');
      setTimeout(() => { currentIndex++; render(); }, 300);
    });

    // 스와이프 제스처
    let startX = 0, moveX = 0;
    const card = $('#speed-card');
    card.addEventListener('touchstart', e => { startX = e.touches[0].clientX; card.classList.add('swiping'); }, { passive: true });
    card.addEventListener('touchmove', e => {
      moveX = e.touches[0].clientX - startX;
      card.style.transform = `translateX(${moveX}px) rotate(${moveX * 0.05}deg)`;
      card.style.opacity = 1 - Math.abs(moveX) / 400;
    }, { passive: true });
    card.addEventListener('touchend', () => {
      card.classList.remove('swiping');
      if (Math.abs(moveX) > 80) {
        if (moveX > 0) { $('#sr-correct').click(); }
        else { $('#sr-wrong').click(); }
      } else {
        card.style.transform = '';
        card.style.opacity = '';
      }
      moveX = 0;
    }, { passive: true });
  }

  async function showResult() {
    const duration = Math.round((Date.now() - startTime) / 1000);
    const totalScore = results.filter(r => r.correct).length * SCORE_TABLE.speed_correct;

    container.innerHTML = `
      <div class="quiz-result">
        <div class="quiz-result-icon">⚡</div>
        <div class="quiz-result-score">${known}/${words.length}</div>
        <div class="quiz-result-text">알고있는 단어 · ${totalScore}점 · ${duration}초</div>
        <div class="home-stats-grid mb-xl">
          <div class="stat-card"><div class="stat-value text-success">${known}</div><div class="stat-label">알아요</div></div>
          <div class="stat-card"><div class="stat-value text-error">${unknown}</div><div class="stat-label">모르겠어요</div></div>
        </div>
        ${unknownWords.length > 0 ? `
          <div class="card mb-xl" style="text-align:left">
            <h4 class="mb-md">복습이 필요한 단어</h4>
            ${unknownWords.map(w => `<div class="word-item mb-sm"><div class="word-text"><span class="word-english">${w.word}</span> — <span class="word-korean">${w.meaning_ko}</span></div></div>`).join('')}
          </div>
        ` : ''}
        <button class="btn btn-primary btn-full mb-md" id="retry-btn">🔄 다시 도전</button>
        <button class="btn btn-secondary btn-full" id="done-btn">완료</button>
      </div>
    `;

    $('#retry-btn').addEventListener('click', () => renderSpeedReview(params));
    $('#done-btn').addEventListener('click', () => { nav.classList.remove('hidden'); router.navigate(ROUTES.STUDY_SELECT, params); });

    try {
      await api.batchUpdateProgress(user.user_id, results);
      await api.saveStudyLog(user.user_id, 'speed', words.length, known, totalScore, duration);
    } catch(e) { console.error(e); }
  }

  render();
}
