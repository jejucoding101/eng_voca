// === Admin Page (관리자 전용: 사용자 추가/삭제) ===
import { $, getSession, showToast, showModal } from '../utils/helpers.js';
import { router } from '../utils/router.js';
import { ROUTES } from '../utils/constants.js';
import { renderNav } from '../components/navbar.js';
import api from '../services/api.js';

export async function renderAdmin() {
  const container = $('#page-container');
  renderNav('home');

  const user = getSession();
  if (user.role !== 'admin') {
    showToast('관리자 권한이 필요합니다.', 'error');
    router.navigate(ROUTES.HOME);
    return;
  }

  container.innerHTML = `
    <button class="btn btn-ghost mb-md" id="back-btn">← 돌아가기</button>
    <h2 style="margin-bottom:var(--sp-xl)">👑 사용자 관리</h2>

    <div class="card mb-xl" id="add-user-form">
      <h3 style="font-size:var(--fs-md);margin-bottom:var(--sp-lg)">새 사용자 추가</h3>
      <div class="input-group">
        <label>닉네임</label>
        <input type="text" class="input" id="new-nickname" placeholder="닉네임" />
      </div>
      <div class="input-group">
        <label>이메일</label>
        <input type="email" class="input" id="new-email" placeholder="이메일" />
      </div>
      <div class="input-group">
        <label>초기 비밀번호</label>
        <input type="text" class="input" id="new-password" placeholder="비밀번호" value="1234" />
      </div>
      <button class="btn btn-primary btn-full" id="add-user-btn">➕ 사용자 추가</button>
    </div>

    <h3 class="section-title mb-lg">등록된 사용자</h3>
    <div id="users-list">
      <div class="skeleton" style="height:60px;margin-bottom:8px"></div>
      <div class="skeleton" style="height:60px;margin-bottom:8px"></div>
    </div>
  `;

  $('#back-btn').addEventListener('click', () => router.navigate(ROUTES.HOME));

  $('#add-user-btn').addEventListener('click', async () => {
    const nickname = $('#new-nickname').value.trim();
    const email = $('#new-email').value.trim();
    const password = $('#new-password').value;

    if (!nickname || !email || !password) {
      showToast('모든 필드를 입력해주세요.', 'error');
      return;
    }

    const btn = $('#add-user-btn');
    btn.disabled = true;
    btn.textContent = '추가 중...';

    const res = await api.adminAddUser(user.user_id, email, password, nickname);
    showToast(res.message, res.success ? 'success' : 'error');

    if (res.success) {
      $('#new-nickname').value = '';
      $('#new-email').value = '';
      $('#new-password').value = '1234';
      loadUsers(user);
    }

    btn.disabled = false;
    btn.textContent = '➕ 사용자 추가';
  });

  loadUsers(user);
}

async function loadUsers(admin) {
  const res = await api.adminGetUsers(admin.user_id);
  if (res.success) {
    const users = res.data || [];
    $('#users-list').innerHTML = users.map(u => `
      <div class="admin-user-card">
        <div class="admin-user-info">
          <h4>${u.nickname} ${u.role === 'admin' ? '<span class="badge badge-gold">관리자</span>' : ''}</h4>
          <p>${u.email} · Lv.${u.level || 1} · 가입: ${u.joined_date ? new Date(u.joined_date).toLocaleDateString('ko') : '-'}</p>
        </div>
        ${u.role !== 'admin' ? `<button class="btn btn-ghost" data-delete-user="${u.user_id}" data-name="${u.nickname}" style="color:var(--error);font-size:18px">🗑️</button>` : ''}
      </div>
    `).join('');

    document.querySelectorAll('[data-delete-user]').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.dataset.deleteUser;
        const name = btn.dataset.name;
        showModal('사용자 삭제', `<strong>${name}</strong> 계정을 삭제할까요?`, [
          { text: '취소', class: 'btn-secondary' },
          { text: '삭제', class: 'btn-danger', onClick: async () => {
            const res = await api.adminDeleteUser(admin.user_id, userId);
            showToast(res.message, res.success ? 'success' : 'error');
            if (res.success) loadUsers(admin);
          }}
        ]);
      });
    });
  }
}
