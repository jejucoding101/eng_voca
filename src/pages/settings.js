// === Settings Page ===
import { $, getSession, getApiKey, setApiKey, showToast, clearSession } from '../utils/helpers.js';
import { router } from '../utils/router.js';
import { ROUTES } from '../utils/constants.js';
import { renderNav } from '../components/navbar.js';
import { setGasUrl, getGasUrl } from '../services/api.js';
import { getTtsRate, setTtsRate } from '../services/tts.js';
import api from '../services/api.js';

export function renderSettings() {
  const container = $('#page-container');
  renderNav('settings');

  const user = getSession();
  const currentApiKey = getApiKey();
  const ttsRate = getTtsRate();
  const gasUrl = getGasUrl();

  container.innerHTML = `
    <h2 style="margin-bottom:var(--sp-xl)">⚙️ 설정</h2>

    <div class="settings-group">
      <div class="settings-group-title">Gemini API</div>
      ${user.role === 'admin' ? `
      <div class="settings-item" style="flex-direction:column;align-items:stretch;gap:var(--sp-md)">
        <div class="settings-item-label">
          <h4>API 키 (관리자 전용)</h4>
          <p>${currentApiKey ? '✅ 설정됨 — 모든 사용자 공유' : '⚠️ 미설정'}</p>
        </div>
        <div class="flex gap-sm">
          <input type="password" class="input" id="api-key-input" placeholder="Gemini API 키 입력" value="${currentApiKey || ''}" style="flex:1" />
          <button class="btn btn-primary" id="save-key-btn">저장</button>
        </div>
      </div>
      ` : `
      <div class="settings-item">
        <div class="settings-item-label">
          <h4>API 키</h4>
          <p>${currentApiKey ? '✅ 관리자가 설정한 키 사용 중' : '⚠️ 관리자에게 API 키 설정을 요청하세요'}</p>
        </div>
      </div>
      `}
    </div>

    <div class="settings-group">
      <div class="settings-group-title">TTS 발음</div>
      <div class="settings-item" style="flex-direction:column;align-items:stretch;gap:var(--sp-md)">
        <div class="flex-between">
          <h4 style="font-size:var(--fs-base)">발음 속도</h4>
          <span id="rate-value" style="color:var(--accent-secondary);font-weight:var(--fw-semibold)">${ttsRate}x</span>
        </div>
        <input type="range" id="tts-rate-slider" min="0.5" max="1.5" step="0.1" value="${ttsRate}"
          style="width:100%;accent-color:var(--accent-primary)" />
        <div class="flex-between" style="font-size:var(--fs-xs);color:var(--text-muted)">
          <span>느림</span><span>보통</span><span>빠름</span>
        </div>
      </div>
    </div>

    <div class="settings-group">
      <div class="settings-group-title">계정</div>
      <div class="settings-item">
        <div class="settings-item-label">
          <h4>${user.nickname}</h4>
          <p>${user.username} · ${user.role === 'admin' ? '관리자' : '학습자'}</p>
        </div>
      </div>
      <button class="btn btn-danger btn-full mt-md" id="logout-btn">로그아웃</button>
    </div>
  `;

  // API 키 저장
  // API 키 저장 (관리자만)
  if (user.role === 'admin' && $('#save-key-btn')) {
    $('#save-key-btn').addEventListener('click', async () => {
      const key = $('#api-key-input').value.trim();
      if (!key) { showToast('API 키를 입력해주세요.', 'error'); return; }
      setApiKey(key);
      const res = await api.saveApiKey(user.user_id, key);
      showToast(res.success ? 'API 키가 저장되었습니다.' : res.message, res.success ? 'success' : 'error');
    });
  }

  // TTS 속도
  $('#tts-rate-slider').addEventListener('input', (e) => {
    const rate = parseFloat(e.target.value);
    $('#rate-value').textContent = rate + 'x';
    setTtsRate(rate);
  });

  // 로그아웃
  $('#logout-btn').addEventListener('click', () => {
    clearSession();
    showToast('로그아웃되었습니다.', 'info');
    router.navigate(ROUTES.AUTH);
  });
}
