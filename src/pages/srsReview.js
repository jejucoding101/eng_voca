// === SRS Review Mode ===
import { $, getSession, vibrate, showToast } from '../utils/helpers.js';
import { router } from '../utils/router.js';
import { ROUTES, SCORE_TABLE } from '../utils/constants.js';
import { speak } from '../services/tts.js';
import { formatInterval } from '../services/srs.js';
import api from '../services/api.js';

export async function renderSrsReview() {
  const container = $('#page-container');
  const nav = $('#bottom-nav');
  nav.classList.add('hidden');

  container.innerHTML = `<div class="flex-center" style="height:300px"><div class="loader-spinner"></div></div>`;

  const user = getSession();
  const res = await api.getReviewQueue(user.user_id);

  if (!res.success || !res.data || res.data.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="min-height:80vh">
        <div class="empty-state-icon">✅</div>
        <div class="empty-state-text">복습할 단어가 없어요!<br>나중에 다시 확인해보세요.</div>
        <button class="btn btn-secondary" id="back-btn">홈으로</button>
      </div>
    `;
    $('#back-btn').addEventListener('click', () => { nav.classList.remove('hidden'); router.navigate(ROUTES.HOME); });
    return;
  }

  const words = res.data;
  let currentIndex = 0;
  let isFlipped = false;
  let reviewed = 0;
  const startTime = Date.now();

  function render() {
    if (currentIndex >= words.length) { showResult(); return; }

    const w = words[currentIndex];
    const prog = w.progress || {};

    container.innerHTML = `
      <div>
        <div class="flex-between mb-lg">
          <button class="btn btn-ghost" id="srs-back">← 나가기</button>
          <span class="text-muted" style="font-size:var(--fs-sm)">${currentIndex + 1}/${words.length} 복습 대기</span>
        </div>
        <div class="progress-bar mb-xl"><div class="progress-bar-fill" style="width:${(currentIndex / words.length) * 100}%"></div></div>

        <div class="srs-card-container">
          <div class="flip-card ${isFlipped ? 'flipped' : ''}" id="srs-card" style="min-height:280px">
            <div class="flip-card-inner">
              <div class="flip-card-front flashcard-card">
                <div style="font-size:var(--fs-3xl);font-weight:var(--fw-extrabold);margin-bottom:var(--sp-md)">${w.word}</div>
                ${w.pronunciation ? `<div style="color:var(--text-secondary);font-style:italic">${w.pronunciation}</div>` : ''}
                <button class="btn btn-ghost btn-icon mt-lg" id="srs-sound" style="font-size:1.3rem">🔊</button>
                <p style="color:var(--text-muted);font-size:var(--fs-sm);margin-top:var(--sp-xl)">탭하여 뜻 확인</p>
              </div>
              <div class="flip-card-back flashcard-card">
                <div style="font-size:var(--fs-xl);font-weight:var(--fw-bold);margin-bottom:var(--sp-lg)">${w.meaning_ko}</div>
                ${w.example_sentence ? `<div style="color:var(--text-secondary);font-size:var(--fs-sm);font-style:italic">"${w.example_sentence}"</div>` : ''}
                <div style="margin-top:var(--sp-lg);font-size:var(--fs-xs);color:var(--text-muted)">
                  정답 ${prog.correct_count || 0}회 · 오답 ${prog.wrong_count || 0}회 · 간격 ${formatInterval(prog.interval_days || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>

        ${isFlipped ? `
          <div style="margin-top:var(--sp-lg)">
            <p class="text-center text-muted mb-md" style="font-size:var(--fs-sm)">얼마나 잘 알고 있나요?</p>
            <div class="srs-difficulty-btns">
              <button class="srs-difficulty-btn again" data-difficulty="again">
                다시
                <span>&lt;1일</span>
              </button>
              <button class="srs-difficulty-btn hard" data-difficulty="hard">
                어려움
                <span>${formatInterval(Math.max(1, Math.round((prog.interval_days || 1) * 0.5)))}</span>
              </button>
              <button class="srs-difficulty-btn good" data-difficulty="good">
                보통
                <span>${formatInterval(Math.max(1, Math.round((prog.interval_days || 1) * (prog.ease_factor || 2.5))))}</span>
              </button>
              <button class="srs-difficulty-btn easy" data-difficulty="easy">
                쉬움
                <span>${formatInterval(Math.max(1, Math.round((prog.interval_days || 1) * (prog.ease_factor || 2.5) * 1.5)))}</span>
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    $('#srs-back').addEventListener('click', () => { nav.classList.remove('hidden'); router.navigate(ROUTES.HOME); });
    $('#srs-card').addEventListener('click', () => { isFlipped = !isFlipped; vibrate(15); render(); });
    if ($('#srs-sound')) $('#srs-sound').addEventListener('click', (e) => { e.stopPropagation(); speak(w.word); });

    document.querySelectorAll('.srs-difficulty-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const difficulty = btn.dataset.difficulty;
        const isCorrect = difficulty !== 'again';
        reviewed++;

        try {
          await api.updateProgress(user.user_id, w.word_id, isCorrect, 'srs');
        } catch(e) { console.error(e); }

        currentIndex++;
        isFlipped = false;
        render();
      });
    });
  }

  async function showResult() {
    const duration = Math.round((Date.now() - startTime) / 1000);
    const totalScore = reviewed * SCORE_TABLE.srs_review;

    container.innerHTML = `
      <div class="quiz-result">
        <div class="quiz-result-icon">📅</div>
        <div class="quiz-result-score text-gradient">${reviewed}</div>
        <div class="quiz-result-text">단어 복습 완료 · ${totalScore}점 획득</div>
        <button class="btn btn-primary btn-full" id="done-btn">홈으로</button>
      </div>
    `;

    $('#done-btn').addEventListener('click', () => { nav.classList.remove('hidden'); router.navigate(ROUTES.HOME); });

    try {
      await api.saveStudyLog(user.user_id, 'srs', reviewed, reviewed, totalScore, duration);
    } catch(e) { console.error(e); }
  }

  render();
}
