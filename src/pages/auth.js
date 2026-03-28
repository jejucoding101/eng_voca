// === Auth Page ===
import { $, showToast, setSession, setApiKey } from '../utils/helpers.js';
import { router } from '../utils/router.js';
import { ROUTES } from '../utils/constants.js';
import api, { getGasUrl, setGasUrl } from '../services/api.js';

export function renderAuth() {
  const container = $('#page-container');
  const nav = $('#bottom-nav');
  nav.classList.add('hidden');

  const savedUrl = getGasUrl();

  container.innerHTML = `
    <div class="auth-page">
      <div class="auth-logo">
        <div class="auth-logo-icon">📸</div>
        <h1 class="text-gradient">VocaSnap</h1>
        <p>사진으로 시작하는 스마트 단어 학습</p>
      </div>

      ${!savedUrl ? `
      <div class="card mb-xl" id="setup-section">
        <h3 style="font-size: var(--fs-md); margin-bottom: var(--sp-md);">⚙️ 초기 설정</h3>
        <p style="font-size: var(--fs-xs); color: var(--text-secondary); margin-bottom: var(--sp-lg);">
          Google Apps Script 웹앱 URL을 입력해주세요.
        </p>
        <div class="input-group">
          <label>Apps Script URL</label>
          <input type="url" class="input" id="gas-url-input" placeholder="https://script.google.com/macros/s/..." />
        </div>
        <button class="btn btn-secondary btn-full" id="save-url-btn">URL 저장</button>
      </div>
      ` : ''}

      <div class="auth-form" id="login-form">
        <div class="input-group">
          <label>이메일</label>
          <input type="email" class="input" id="login-email" placeholder="이메일을 입력하세요" autocomplete="email" />
        </div>
        <div class="input-group">
          <label>비밀번호</label>
          <input type="password" class="input" id="login-password" placeholder="비밀번호를 입력하세요" autocomplete="current-password" />
        </div>
        <button class="btn btn-primary btn-full btn-lg" id="login-btn" ${!savedUrl ? 'disabled' : ''}>
          로그인
        </button>
      </div>

      <p class="text-center text-muted" style="font-size: var(--fs-xs); margin-top: var(--sp-xl);">
        계정이 없으신가요? 관리자에게 문의하세요.
      </p>
    </div>
  `;

  // URL 저장
  const saveUrlBtn = $('#save-url-btn');
  if (saveUrlBtn) {
    saveUrlBtn.addEventListener('click', () => {
      const url = $('#gas-url-input').value.trim();
      if (!url || !url.startsWith('https://script.google.com/')) {
        showToast('올바른 Apps Script URL을 입력해주세요.', 'error');
        return;
      }
      setGasUrl(url);
      showToast('URL이 저장되었습니다.', 'success');
      $('#login-btn').disabled = false;
      $('#setup-section').style.display = 'none';
    });
  }

  // 로그인
  $('#login-btn').addEventListener('click', handleLogin);
  $('#login-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
}

async function handleLogin() {
  const email = $('#login-email').value.trim();
  const password = $('#login-password').value;

  if (!email || !password) {
    showToast('이메일과 비밀번호를 입력해주세요.', 'error');
    return;
  }

  const btn = $('#login-btn');
  btn.disabled = true;
  btn.textContent = '로그인 중...';

  try {
    const res = await api.login(email, password);
    if (res.success) {
      setSession(res.user);

      // API 키 가져오기
      if (res.user.has_api_key) {
        const keyRes = await api.getApiKey(res.user.user_id);
        if (keyRes.success && keyRes.api_key) {
          setApiKey(keyRes.api_key);
        }
      }

      showToast(`${res.user.nickname}님, 환영합니다! 🎉`, 'success');
      router.navigate(ROUTES.HOME);
    } else {
      showToast(res.message, 'error');
    }
  } catch (e) {
    showToast('로그인 중 오류가 발생했습니다.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '로그인';
  }
}
