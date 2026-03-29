// === Story Read Page — AI 스토리 읽기 ===
import { $, getSession, showToast, showLoader, hideLoader, getApiKey } from '../utils/helpers.js';
import { router } from '../utils/router.js';
import { ROUTES } from '../utils/constants.js';
import { renderNav } from '../components/navbar.js';
import api from '../services/api.js';
import { speak } from '../services/tts.js';
import { generateStoryFromWords } from '../services/gemini.js';

export async function renderStoryRead(params = {}) {
  const container = $('#page-container');
  renderNav('home');

  const user = getSession();
  const setId = params.set_id;
  const setName = params.set_name || '단어 세트';

  container.innerHTML = `
    <button class="btn btn-ghost mb-md" id="back-btn">← 돌아가기</button>
    <div class="story-header">
      <h2>📖 AI 스토리</h2>
      <p class="text-muted" style="font-size:var(--fs-sm);margin-top:var(--sp-xs)">${setName}</p>
    </div>
    <div id="story-content">
      <div class="skeleton" style="height:200px;margin-top:var(--sp-xl)"></div>
    </div>
  `;

  $('#back-btn').addEventListener('click', () => {
    router.navigate(ROUTES.STUDY_SELECT, { set_id: setId, set_name: setName });
  });

  // 스토리 로드
  try {
    const res = await api.getStory(setId, user.user_id);

    if (res.success && res.data && res.data.sentences && res.data.sentences.length > 0) {
      renderSentences(res.data.sentences, res.data.title, setId, setName, user);
    } else {
      // 스토리가 없으면 생성
      const apiKey = getApiKey();
      if (!apiKey) {
        container.querySelector('#story-content').innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🔑</div>
            <div class="empty-state-text">API 키가 설정되지 않았습니다.<br>관리자에게 문의하세요.</div>
          </div>
        `;
        return;
      }

      await generateAndSaveStory(setId, setName, user, apiKey);
    }
  } catch (e) {
    console.error(e);
    container.querySelector('#story-content').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">😢</div>
        <div class="empty-state-text">스토리를 불러올 수 없습니다.<br>${e.message}</div>
      </div>
    `;
  }
}

async function generateAndSaveStory(setId, setName, user, apiKey) {
  showLoader('AI가 이야기를 만들고 있어요... 📖');

  try {
    // 단어 가져오기
    const wordsRes = await api.getWords(setId, user.user_id);
    if (!wordsRes.success || !wordsRes.data || wordsRes.data.length === 0) {
      hideLoader();
      $('#story-content').innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-text">단어가 없어서 스토리를 만들 수 없습니다.</div>
        </div>
      `;
      return;
    }

    const words = wordsRes.data;
    const sentences = await generateStoryFromWords(words, apiKey);

    // 서버에 저장
    const title = `${setName} 이야기`;
    await api.saveStory(user.user_id, setId, title, sentences);

    hideLoader();
    renderSentences(sentences, title, setId, setName, user);
  } catch (e) {
    hideLoader();
    showToast('스토리 생성 실패: ' + e.message, 'error');
    $('#story-content').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">😢</div>
        <div class="empty-state-text">스토리 생성에 실패했습니다.<br>${e.message}</div>
        <button class="btn btn-primary mt-lg" id="retry-btn">🔄 다시 시도</button>
      </div>
    `;
    const retryBtn = $('#retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        generateAndSaveStory(setId, setName, user, getApiKey());
      });
    }
  }
}

function renderSentences(sentences, title, setId, setName, user) {
  const content = $('#story-content');

  content.innerHTML = `
    <div class="story-title-card">
      <h3>${title || '📖 이야기'}</h3>
      <p class="text-muted" style="font-size:var(--fs-xs)">${sentences.length}개 문장</p>
    </div>

    <div class="story-sentences stagger-children">
      ${sentences.map((s, i) => `
        <div class="story-sentence-card" data-index="${i}">
          <div class="story-sentence-num">${i + 1}</div>
          <div class="story-sentence-body">
            <div class="story-sentence-en">${s.en}</div>
            <div class="story-sentence-ko hidden" id="ko-${i}">${s.ko}</div>
          </div>
          <div class="story-sentence-actions">
            <button class="btn btn-ghost btn-icon story-tts-btn" data-text="${s.en.replace(/"/g, '&quot;')}" title="발음 듣기">🔊</button>
            <button class="btn btn-ghost btn-icon story-toggle-btn" data-index="${i}" title="해석 보기">👁️</button>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="story-bottom-actions">
      <button class="btn btn-secondary btn-full" id="show-all-btn">모든 해석 보기 / 숨기기</button>
      <button class="btn btn-primary btn-full mt-md" id="regenerate-btn">🔄 새 스토리 만들기</button>
    </div>
  `;

  // TTS
  content.querySelectorAll('.story-tts-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      speak(btn.dataset.text);
    });
  });

  // 해석 토글
  content.querySelectorAll('.story-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ko = $(`#ko-${btn.dataset.index}`);
      ko.classList.toggle('hidden');
      btn.textContent = ko.classList.contains('hidden') ? '👁️' : '🙈';
    });
  });

  // 카드 클릭으로도 해석 토글
  content.querySelectorAll('.story-sentence-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.story-tts-btn') || e.target.closest('.story-toggle-btn')) return;
      const i = card.dataset.index;
      const ko = $(`#ko-${i}`);
      ko.classList.toggle('hidden');
    });
  });

  // 모든 해석 토글
  let allVisible = false;
  $('#show-all-btn').addEventListener('click', () => {
    allVisible = !allVisible;
    content.querySelectorAll('[id^="ko-"]').forEach(el => {
      el.classList.toggle('hidden', !allVisible);
    });
    content.querySelectorAll('.story-toggle-btn').forEach(btn => {
      btn.textContent = allVisible ? '🙈' : '👁️';
    });
  });

  // 새 스토리 생성
  $('#regenerate-btn').addEventListener('click', async () => {
    const apiKey = getApiKey();
    if (!apiKey) { showToast('API 키가 필요합니다.', 'error'); return; }
    await generateAndSaveStory(setId, setName, user, apiKey);
  });
}
