// === Helper Utilities ===

export function $(selector) {
  return document.querySelector(selector);
}

export function $$(selector) {
  return document.querySelectorAll(selector);
}

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

export function showLoader(text = '처리 중...') {
  let overlay = document.querySelector('.loader-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'loader-overlay';
    overlay.innerHTML = `<div class="loader-spinner"></div><div class="loader-text">${text}</div>`;
    document.body.appendChild(overlay);
  }
}

export function hideLoader() {
  const overlay = document.querySelector('.loader-overlay');
  if (overlay) overlay.remove();
}

export function showModal(title, body, actions) {
  const overlay = document.getElementById('modal-overlay');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <h3 class="modal-title">${title}</h3>
      <div class="modal-body">${body}</div>
      <div class="modal-actions" id="modal-actions"></div>
    </div>
  `;
  const actionsEl = overlay.querySelector('#modal-actions');
  actions.forEach(a => {
    const btn = document.createElement('button');
    btn.className = `btn ${a.class || 'btn-secondary'}`;
    btn.textContent = a.text;
    btn.onclick = () => {
      hideModal();
      if (a.onClick) a.onClick();
    };
    actionsEl.appendChild(btn);
  });
}

export function hideModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('hidden');
}

export function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function getSession() {
  const data = sessionStorage.getItem('vocasnap_user');
  return data ? JSON.parse(data) : null;
}

export function setSession(user) {
  sessionStorage.setItem('vocasnap_user', JSON.stringify(user));
}

export function clearSession() {
  sessionStorage.removeItem('vocasnap_user');
  sessionStorage.removeItem('vocasnap_apikey');
}

export function getApiKey() {
  return sessionStorage.getItem('vocasnap_apikey');
}

export function setApiKey(key) {
  sessionStorage.setItem('vocasnap_apikey', key);
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}일 전`;
  return formatDate(dateStr);
}

export function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function spawnConfetti() {
  const colors = ['#6c5ce7', '#a29bfe', '#00cec9', '#fdcb6e', '#ff6b6b', '#74b9ff'];
  for (let i = 0; i < 30; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-particle';
    el.style.left = `${Math.random() * 100}vw`;
    el.style.top = `${60 + Math.random() * 30}vh`;
    el.style.width = `${6 + Math.random() * 6}px`;
    el.style.height = `${6 + Math.random() * 6}px`;
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    el.style.animationDuration = `${0.8 + Math.random() * 0.6}s`;
    el.style.animationDelay = `${Math.random() * 0.3}s`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
  }
}

export function vibrate(ms = 30) {
  if (navigator.vibrate) navigator.vibrate(ms);
}
