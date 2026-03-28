// === Bottom Navigation ===
import { $ } from '../utils/helpers.js';
import { router } from '../utils/router.js';
import { ROUTES } from '../utils/constants.js';

export function renderNav(activeTab = 'home') {
  const nav = $('#bottom-nav');
  nav.classList.remove('hidden');

  const tabs = [
    { id: 'home', icon: '🏠', label: '홈', route: ROUTES.HOME },
    { id: 'capture', icon: '📸', label: '촬영', route: ROUTES.CAPTURE },
    { id: 'stats', icon: '📊', label: '통계', route: ROUTES.STATS },
    { id: 'profile', icon: '👤', label: '프로필', route: ROUTES.PROFILE },
    { id: 'settings', icon: '⚙️', label: '설정', route: ROUTES.SETTINGS }
  ];

  nav.innerHTML = tabs.map(t => `
    <button class="nav-item ${activeTab === t.id ? 'active' : ''}" data-route="${t.route}">
      ${t.icon}
      <span>${t.label}</span>
    </button>
  `).join('');

  nav.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      router.navigate(item.dataset.route);
    });
  });
}
