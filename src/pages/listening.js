// === Listening Quiz Mode ===
import { $, getSession, shuffleArray, vibrate, spawnConfetti } from '../utils/helpers.js';
import { router } from '../utils/router.js';
import { ROUTES, SCORE_TABLE } from '../utils/constants.js';
import { speak } from '../services/tts.js';
import api from '../services/api.js';

export async function renderListening(params = {}) {
  const container = $('#page-container');
  const nav = $('#bottom-nav');
  nav.classList.add('hidden');

  container.innerHTML = `<div class="flex-center" style="height:300px"><div class="loader-spinner"></div></div>`;

  const user = getSession();
  const res = await api.getWords(user.user_id, params.set_id);
  if (!res.success || !res.data || res.data.length < 2) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-text">리스닝 퀴즈에 최소 2개 단어가 필요합니다.</div><button class="btn btn-secondary" id="back-btn">돌아가기</button></div>`;
    $('#back-btn')?.addEventListener('click', () => { nav.classList.remove('hidden'); router.navigate(ROUTES.STUDY_SELECT, params); });
    return;
  }

  const allWords = res.data;
  const questions = shuffleArray(allWords).slice(0, Math.min(10, allWords.length));
  let currentQ = 0;
  let correct = 0;
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
          <button class="btn btn-ghost" id="l-back">← 나가기</button>
          <span class="text-muted" style="font-size:var(--fs-sm)">${currentQ + 1}/${questions.length}</span>
        </div>
        <div class="progress-bar mb-xl"><div class="progress-bar-fill" style="width:${(currentQ / questions.length) * 100}%"></div></div>
        
        <div class="listening-speaker" id="play-btn">🔊</div>
        <p class="text-center text-muted mb-xl" style="font-size:var(--fs-sm)">발음을 듣고 뜻을 선택하세요</p>
        
        <div class="quiz-options stagger-children">
          ${options.map((opt, i) => `
            <button class="quiz-option" data-answer="${opt}" id="lopt-${i}">${opt}</button>
          `).join('')}
        </div>
        <button class="btn btn-ghost btn-full mt-lg" id="replay-btn">🔄 다시 듣기</button>
      </div>
    `;

    $('#l-back').addEventListener('click', () => { nav.classList.remove('hidden'); router.navigate(ROUTES.STUDY_SELECT, params); });
    
    const playBtn = $('#play-btn');
    playBtn.addEventListener('click', () => {
      playBtn.classList.add('playing');
      speak(q.word).then(() => playBtn.classList.remove('playing'));
    });

    $('#replay-btn').addEventListener('click', () => {
      playBtn.classList.add('playing');
      speak(q.word).then(() => playBtn.classList.remove('playing'));
    });

    // 자동 재생
    setTimeout(() => {
      playBtn.classList.add('playing');
      speak(q.word).then(() => playBtn.classList.remove('playing'));
    }, 500);

    document.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const isCorrect = btn.dataset.answer === q.meaning_ko;
        document.querySelectorAll('.quiz-option').forEach(b => b.style.pointerEvents = 'none');

        if (isCorrect) {
          btn.classList.add('correct');
          correct++;
          vibrate(30);
          results.push({ word_id: q.word_id, correct: true, score: SCORE_TABLE.listening_correct });
        } else {
          btn.classList.add('wrong');
          vibrate([50, 30, 50]);
          results.push({ word_id: q.word_id, correct: false, score: 0 });
          document.querySelectorAll('.quiz-option').forEach(b => {
            if (b.dataset.answer === q.meaning_ko) b.classList.add('correct');
          });
        }

        setTimeout(() => { currentQ++; renderQuestion(); }, 1200);
      });
    });
  }

  async function showResult() {
    const duration = Math.round((Date.now() - startTime) / 1000);
    const totalScore = results.filter(r => r.correct).length * SCORE_TABLE.listening_correct;
    const accuracy = Math.round((correct / questions.length) * 100);
    if (accuracy === 100) spawnConfetti();

    container.innerHTML = `
      <div class="quiz-result">
        <div class="quiz-result-icon">👂</div>
        <div class="quiz-result-score">${accuracy}%</div>
        <div class="quiz-result-text">${correct}/${questions.length} 정답 · ${totalScore}점 획득</div>
        <button class="btn btn-primary btn-full mb-md" id="retry-btn">🔄 다시 도전</button>
        <button class="btn btn-secondary btn-full" id="done-btn">완료</button>
      </div>
    `;

    $('#retry-btn').addEventListener('click', () => renderListening(params));
    $('#done-btn').addEventListener('click', () => { nav.classList.remove('hidden'); router.navigate(ROUTES.STUDY_SELECT, params); });

    try {
      await api.batchUpdateProgress(user.user_id, results);
      await api.saveStudyLog(user.user_id, 'listening', questions.length, correct, totalScore, duration);
    } catch(e) { console.error(e); }
  }

  renderQuestion();
}
