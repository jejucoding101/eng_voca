// === Matching Game Mode ===
import { $, getSession, shuffleArray, vibrate, spawnConfetti } from '../utils/helpers.js';
import { router } from '../utils/router.js';
import { ROUTES, SCORE_TABLE } from '../utils/constants.js';
import api from '../services/api.js';

export async function renderMatching(params = {}) {
  const container = $('#page-container');
  const nav = $('#bottom-nav');
  nav.classList.add('hidden');

  container.innerHTML = `<div class="flex-center" style="height:300px"><div class="loader-spinner"></div></div>`;

  const user = getSession();
  const res = await api.getWords(user.user_id, params.set_id);
  if (!res.success || !res.data || res.data.length < 3) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-text">매칭 게임에 최소 3개 단어가 필요합니다.</div><button class="btn btn-secondary" id="back-btn">돌아가기</button></div>`;
    $('#back-btn')?.addEventListener('click', () => { nav.classList.remove('hidden'); router.navigate(ROUTES.STUDY_SELECT, params); });
    return;
  }

  const gameWords = shuffleArray(res.data).slice(0, Math.min(6, res.data.length));
  let selected = null;
  let matchedCount = 0;
  let attempts = 0;
  const matched = new Set();
  const startTime = Date.now();

  function render() {
    const cards = [];
    gameWords.forEach(w => {
      cards.push({ id: w.word_id + '_en', wordId: w.word_id, text: w.word, type: 'en' });
      cards.push({ id: w.word_id + '_ko', wordId: w.word_id, text: w.meaning_ko, type: 'ko' });
    });
    const shuffled = shuffleArray(cards);

    container.innerHTML = `
      <div>
        <div class="flex-between mb-lg">
          <button class="btn btn-ghost" id="m-back">← 나가기</button>
          <span class="text-muted" style="font-size:var(--fs-sm)">매칭: ${matchedCount}/${gameWords.length}</span>
        </div>
        <div class="flex-between mb-lg">
          <span class="tag">시도: ${attempts}회</span>
          <span class="tag" id="timer">⏱ 0초</span>
        </div>
        <div class="matching-grid" id="match-grid">
          ${shuffled.map(c => `
            <button class="match-card ${matched.has(c.wordId) ? 'matched' : ''}" 
                    data-id="${c.id}" data-word-id="${c.wordId}" data-type="${c.type}">
              ${c.text}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    $('#m-back').addEventListener('click', () => { nav.classList.remove('hidden'); router.navigate(ROUTES.STUDY_SELECT, params); });

    // 타이머
    const timerEl = $('#timer');
    const timerInterval = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      if (timerEl) timerEl.textContent = `⏱ ${elapsed}초`;
    }, 1000);

    // 카드 클릭
    document.querySelectorAll('.match-card:not(.matched)').forEach(card => {
      card.addEventListener('click', () => {
        if (card.classList.contains('matched')) return;

        if (selected === null) {
          selected = card;
          card.classList.add('selected');
        } else if (selected === card) {
          selected.classList.remove('selected');
          selected = null;
        } else {
          attempts++;
          const id1 = selected.dataset.wordId;
          const id2 = card.dataset.wordId;
          const type1 = selected.dataset.type;
          const type2 = card.dataset.type;

          if (id1 === id2 && type1 !== type2) {
            // 매칭 성공!
            matched.add(id1);
            matchedCount++;
            vibrate(30);
            selected.classList.remove('selected');
            selected.classList.add('matched');
            card.classList.add('matched');
            selected = null;

            if (matchedCount >= gameWords.length) {
              clearInterval(timerInterval);
              setTimeout(() => showResult(), 500);
            }
          } else {
            // 매칭 실패
            selected.classList.remove('selected');
            card.style.borderColor = 'var(--error)';
            selected.style.borderColor = 'var(--error)';
            vibrate([30, 20, 30]);
            const prevSelected = selected;
            setTimeout(() => {
              prevSelected.style.borderColor = '';
              card.style.borderColor = '';
            }, 500);
            selected = null;
          }
        }
      });
    });
  }

  async function showResult() {
    const duration = Math.round((Date.now() - startTime) / 1000);
    const timeBonus = Math.max(0, 30 - duration) * SCORE_TABLE.matching_time_bonus;
    const totalScore = SCORE_TABLE.matching_complete + timeBonus;
    spawnConfetti();

    container.innerHTML = `
      <div class="quiz-result">
        <div class="quiz-result-icon">🔗</div>
        <div class="quiz-result-score text-gradient">완료!</div>
        <div class="quiz-result-text">${gameWords.length}쌍 매칭 · ${attempts}번 시도 · ${duration}초</div>
        <div class="home-stats-grid mb-xl">
          <div class="stat-card"><div class="stat-value text-accent">${SCORE_TABLE.matching_complete}</div><div class="stat-label">기본 점수</div></div>
          <div class="stat-card"><div class="stat-value text-success">+${timeBonus}</div><div class="stat-label">시간 보너스</div></div>
          <div class="stat-card"><div class="stat-value" style="color:var(--gold)">${totalScore}</div><div class="stat-label">총 점수</div></div>
        </div>
        <button class="btn btn-primary btn-full mb-md" id="retry-btn">🔄 다시 도전</button>
        <button class="btn btn-secondary btn-full" id="done-btn">완료</button>
      </div>
    `;

    $('#retry-btn').addEventListener('click', () => renderMatching(params));
    $('#done-btn').addEventListener('click', () => { nav.classList.remove('hidden'); router.navigate(ROUTES.STUDY_SELECT, params); });

    try {
      const results = gameWords.map(w => ({ word_id: w.word_id, correct: true, score: 3 }));
      await api.batchUpdateProgress(user.user_id, results);
      await api.saveStudyLog(user.user_id, 'matching', gameWords.length, gameWords.length, totalScore, duration);
    } catch (e) { console.error(e); }
  }

  render();
}
