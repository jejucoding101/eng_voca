// === Spelling Mode ===
import { $, getSession, shuffleArray, vibrate, spawnConfetti, levenshtein } from '../utils/helpers.js';
import { router } from '../utils/router.js';
import { ROUTES, SCORE_TABLE } from '../utils/constants.js';
import { speak } from '../services/tts.js';
import api from '../services/api.js';

export async function renderSpelling(params = {}) {
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

  const words = shuffleArray(res.data).slice(0, Math.min(10, res.data.length));
  let currentIndex = 0;
  let correct = 0;
  let showHint = false;
  const results = [];
  const startTime = Date.now();

  function render() {
    if (currentIndex >= words.length) { showResult(); return; }

    const w = words[currentIndex];
    const blanks = w.word.split('').map((c, i) => {
      if (showHint && i === 0) return `<div class="spelling-blank filled">${c}</div>`;
      return `<div class="spelling-blank">_</div>`;
    }).join('');

    container.innerHTML = `
      <div>
        <div class="flex-between mb-lg">
          <button class="btn btn-ghost" id="sp-back">← 나가기</button>
          <span class="text-muted" style="font-size:var(--fs-sm)">${currentIndex + 1}/${words.length}</span>
        </div>
        <div class="progress-bar mb-xl"><div class="progress-bar-fill" style="width:${(currentIndex / words.length) * 100}%"></div></div>
        <div class="spelling-hint">
          <button class="btn btn-ghost btn-icon mb-md" id="sp-sound" style="font-size:1.5rem;margin:0 auto">🔊</button>
          <div class="spelling-meaning">${w.meaning_ko}</div>
          ${w.part_of_speech ? `<div class="tag">${w.part_of_speech}</div>` : ''}
        </div>
        <div class="spelling-blanks">${blanks}</div>
        <div class="input-group">
          <input type="text" class="input" id="spell-input" placeholder="영단어를 입력하세요" autocomplete="off" autocapitalize="none" style="text-align:center;font-size:var(--fs-lg);letter-spacing:2px" />
        </div>
        <div class="flex gap-md">
          <button class="btn btn-secondary" id="hint-btn" style="flex:1">💡 힌트</button>
          <button class="btn btn-primary" id="check-btn" style="flex:2">확인</button>
        </div>
        <div id="spell-feedback" class="mt-lg text-center" style="min-height:40px"></div>
      </div>
    `;

    $('#sp-back').addEventListener('click', () => { nav.classList.remove('hidden'); router.navigate(ROUTES.STUDY_SELECT, params); });
    $('#sp-sound').addEventListener('click', () => speak(w.word));
    $('#hint-btn').addEventListener('click', () => { showHint = true; render(); speak(w.word); });
    $('#check-btn').addEventListener('click', checkAnswer);
    $('#spell-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') checkAnswer(); });
    $('#spell-input').focus();

    function checkAnswer() {
      const input = $('#spell-input').value.trim().toLowerCase();
      if (!input) return;

      const answer = w.word.toLowerCase();
      const distance = levenshtein(input, answer);
      const isCorrect = distance <= 1;

      const blanks = document.querySelectorAll('.spelling-blank');
      answer.split('').forEach((c, i) => {
        if (blanks[i]) {
          blanks[i].textContent = c;
          blanks[i].classList.add(input[i] === c ? 'correct' : 'wrong');
        }
      });

      if (isCorrect) {
        correct++;
        vibrate(30);
        results.push({ word_id: w.word_id, correct: true, score: SCORE_TABLE.spelling_correct });
        $('#spell-feedback').innerHTML = `<span class="text-success">✅ 정답! ${distance === 1 ? '(거의 맞았어요)' : ''}</span>`;
      } else {
        vibrate([50, 30, 50]);
        results.push({ word_id: w.word_id, correct: false, score: SCORE_TABLE.spelling_wrong });
        $('#spell-feedback').innerHTML = `<span class="text-error">❌ 정답: <strong>${w.word}</strong></span>`;
      }

      $('#check-btn').disabled = true;
      setTimeout(() => { currentIndex++; showHint = false; render(); }, 1800);
    }
  }

  async function showResult() {
    const totalScore = results.reduce((s, r) => s + (r.score > 0 ? r.score : 0), 0);
    const accuracy = Math.round((correct / words.length) * 100);
    const duration = Math.round((Date.now() - startTime) / 1000);
    if (accuracy === 100) spawnConfetti();

    container.innerHTML = `
      <div class="quiz-result">
        <div class="quiz-result-icon">${accuracy === 100 ? '🏆' : accuracy >= 70 ? '✍️' : '💪'}</div>
        <div class="quiz-result-score">${accuracy}%</div>
        <div class="quiz-result-text">${correct}/${words.length} 정답 · ${totalScore}점 획득</div>
        <button class="btn btn-primary btn-full mb-md" id="retry-btn">🔄 다시 도전</button>
        <button class="btn btn-secondary btn-full" id="done-btn">완료</button>
      </div>
    `;
    $('#retry-btn').addEventListener('click', () => renderSpelling(params));
    $('#done-btn').addEventListener('click', () => { nav.classList.remove('hidden'); router.navigate(ROUTES.STUDY_SELECT, params); });

    try {
      await api.batchUpdateProgress(user.user_id, results);
      await api.saveStudyLog(user.user_id, 'spelling', words.length, correct, totalScore, duration);
    } catch (e) { console.error(e); }
  }

  render();
}
