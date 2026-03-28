// === Quiz Mode ===
import { $, getSession, showToast, shuffleArray, vibrate, spawnConfetti } from '../utils/helpers.js';
import { router } from '../utils/router.js';
import { ROUTES, SCORE_TABLE } from '../utils/constants.js';
import { speak } from '../services/tts.js';
import api from '../services/api.js';

export async function renderQuiz(params = {}) {
  const container = $('#page-container');
  const nav = $('#bottom-nav');
  nav.classList.add('hidden');

  container.innerHTML = `<div class="flex-center" style="height:300px"><div class="loader-spinner"></div></div>`;

  const user = getSession();
  const res = await api.getWords(user.user_id, params.set_id);
  if (!res.success || !res.data || res.data.length < 2) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-text">퀴즈를 위해 최소 2개 단어가 필요합니다.</div><button class="btn btn-secondary" id="back-btn">돌아가기</button></div>`;
    $('#back-btn')?.addEventListener('click', () => { nav.classList.remove('hidden'); router.navigate(ROUTES.STUDY_SELECT, params); });
    return;
  }

  const allWords = res.data;
  const questions = shuffleArray(allWords).slice(0, Math.min(10, allWords.length));
  let currentQ = 0;
  let correct = 0;
  let wrong = 0;
  const results = [];
  const startTime = Date.now();

  function renderQuestion() {
    if (currentQ >= questions.length) { showResult(); return; }

    const q = questions[currentQ];
    const wrongOptions = shuffleArray(allWords.filter(w => w.word_id !== q.word_id)).slice(0, 3).map(w => w.meaning_ko);
    const options = shuffleArray([q.meaning_ko, ...wrongOptions]);

    container.innerHTML = `
      <div>
        <div class="flex-between mb-lg">
          <button class="btn btn-ghost" id="q-back">← 나가기</button>
          <span class="text-muted" style="font-size:var(--fs-sm)">${currentQ + 1}/${questions.length}</span>
        </div>
        <div class="progress-bar mb-xl"><div class="progress-bar-fill" style="width:${(currentQ / questions.length) * 100}%"></div></div>
        <div class="quiz-question">
          <div class="quiz-question-label">이 단어의 뜻은?</div>
          <div class="quiz-question-word">${q.word}</div>
          <button class="btn btn-ghost btn-icon mt-md" id="q-sound" style="margin:8px auto 0">🔊</button>
        </div>
        <div class="quiz-options stagger-children">
          ${options.map((opt, i) => `
            <button class="quiz-option" data-answer="${opt}" id="opt-${i}">${opt}</button>
          `).join('')}
        </div>
      </div>
    `;

    $('#q-back').addEventListener('click', () => { nav.classList.remove('hidden'); router.navigate(ROUTES.STUDY_SELECT, params); });
    $('#q-sound').addEventListener('click', () => speak(q.word));

    document.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => handleAnswer(btn, q));
    });
  }

  function handleAnswer(btn, q) {
    const isCorrect = btn.dataset.answer === q.meaning_ko;
    document.querySelectorAll('.quiz-option').forEach(b => b.style.pointerEvents = 'none');

    if (isCorrect) {
      btn.classList.add('correct');
      correct++;
      vibrate(30);
      results.push({ word_id: q.word_id, correct: true, score: SCORE_TABLE.quiz_correct });
    } else {
      btn.classList.add('wrong');
      wrong++;
      vibrate([50, 30, 50]);
      results.push({ word_id: q.word_id, correct: false, score: SCORE_TABLE.quiz_wrong });
      document.querySelectorAll('.quiz-option').forEach(b => {
        if (b.dataset.answer === q.meaning_ko) b.classList.add('correct');
      });
    }

    setTimeout(() => { currentQ++; renderQuestion(); }, 1200);
  }

  async function showResult() {
    const totalScore = results.reduce((s, r) => s + (r.score > 0 ? r.score : 0), 0);
    const accuracy = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    const isPerfect = correct === questions.length;
    const duration = Math.round((Date.now() - startTime) / 1000);

    if (isPerfect) spawnConfetti();

    container.innerHTML = `
      <div class="quiz-result">
        <div class="quiz-result-icon">${isPerfect ? '🏆' : accuracy >= 70 ? '🎉' : '💪'}</div>
        <div class="quiz-result-score ${isPerfect ? 'text-gradient' : ''}">${accuracy}%</div>
        <div class="quiz-result-text">${correct}/${questions.length} 정답 · ${totalScore}점 획득</div>
        <div class="home-stats-grid mb-xl">
          <div class="stat-card"><div class="stat-value text-success">${correct}</div><div class="stat-label">정답</div></div>
          <div class="stat-card"><div class="stat-value text-error">${wrong}</div><div class="stat-label">오답</div></div>
          <div class="stat-card"><div class="stat-value text-accent">${duration}초</div><div class="stat-label">소요 시간</div></div>
        </div>
        <button class="btn btn-primary btn-full mb-md" id="retry-btn">🔄 다시 도전</button>
        <button class="btn btn-secondary btn-full" id="done-btn">완료</button>
      </div>
    `;

    $('#retry-btn').addEventListener('click', () => renderQuiz(params));
    $('#done-btn').addEventListener('click', () => { nav.classList.remove('hidden'); router.navigate(ROUTES.STUDY_SELECT, params); });

    // 서버에 결과 저장
    try {
      await api.batchUpdateProgress(user.user_id, results);
      await api.saveStudyLog(user.user_id, 'quiz', questions.length, correct, totalScore, duration);
    } catch (e) { console.error(e); }
  }

  renderQuestion();
}
