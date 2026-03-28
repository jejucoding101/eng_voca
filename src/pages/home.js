// === Home Page ===
import { $, getSession, showToast, formatDate, showModal } from '../utils/helpers.js';
import { router } from '../utils/router.js';
import { ROUTES } from '../utils/constants.js';
import api from '../services/api.js';
import { renderNav } from '../components/navbar.js';

export async function renderHome() {
  const container = $('#page-container');
  const user = getSession();
  renderNav('home');

  container.innerHTML = `
    <div class="home-header">
      <div class="home-greeting">
        <h2>안녕하세요, ${user.nickname}님 👋</h2>
        <p>오늘도 단어 학습을 시작해볼까요?</p>
      </div>
      ${user.role === 'admin' ? `<button class="btn btn-ghost btn-icon" id="admin-btn" title="관리자">👑</button>` : ''}
    </div>

    <div class="home-streak-card">
      <div class="home-streak-fire">🔥</div>
      <div class="home-streak-info">
        <h3>${user.current_streak || 0}일 연속 학습</h3>
        <p>최고 기록: ${user.max_streak || 0}일</p>
      </div>
      <div style="margin-left:auto;">
        <div class="badge badge-gold">Lv.${user.level || 1}</div>
      </div>
    </div>

    <div id="review-alert-area"></div>

    <div class="home-stats-grid" id="stats-grid">
      <div class="stat-card skeleton" style="height:80px"></div>
      <div class="stat-card skeleton" style="height:80px"></div>
      <div class="stat-card skeleton" style="height:80px"></div>
    </div>

    <div class="section-header">
      <h3 class="section-title">📚 내 단어 세트</h3>
      <button class="btn btn-ghost" id="add-set-btn">+ 새 추가</button>
    </div>

    <div id="word-sets-list">
      <div class="skeleton" style="height:90px;margin-bottom:12px"></div>
      <div class="skeleton" style="height:90px;margin-bottom:12px"></div>
    </div>
  `;

  // 이벤트
  $('#add-set-btn').addEventListener('click', () => router.navigate(ROUTES.CAPTURE));
  if ($('#admin-btn')) {
    $('#admin-btn').addEventListener('click', () => router.navigate(ROUTES.ADMIN));
  }

  // 데이터 로드
  loadHomeData(user);
}

async function loadHomeData(user) {
  try {
    const [setsRes, profileRes, reviewRes] = await Promise.all([
      api.getWordSets(user.user_id),
      api.getUserProfile(user.user_id),
      api.getReviewQueue(user.user_id)
    ]);

    // 통계
    if (profileRes.success) {
      const p = profileRes.data;
      $('#stats-grid').innerHTML = `
        <div class="stat-card">
          <div class="stat-value text-accent">${p.totalWords || 0}</div>
          <div class="stat-label">총 단어</div>
        </div>
        <div class="stat-card">
          <div class="stat-value text-success">${p.masteredWords || 0}</div>
          <div class="stat-label">마스터</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--gold)">${p.total_score || 0}</div>
          <div class="stat-label">총 점수</div>
        </div>
      `;

      // 세션 업데이트
      const session = getSession();
      session.current_streak = p.current_streak;
      session.max_streak = p.max_streak;
      session.level = p.level;
      session.total_score = p.total_score;
      sessionStorage.setItem('vocasnap_user', JSON.stringify(session));
    }

    // 복습 알림
    if (reviewRes.success && reviewRes.data.length > 0) {
      $('#review-alert-area').innerHTML = `
        <div class="home-review-alert" id="review-alert">
          <div class="home-review-alert-icon">📅</div>
          <div class="home-review-alert-text">
            복습할 단어가 <strong>${reviewRes.data.length}개</strong> 있어요!
          </div>
          <span style="color:var(--text-muted)">→</span>
        </div>
      `;
      $('#review-alert').addEventListener('click', () => {
        router.navigate(ROUTES.SRS_REVIEW);
      });
    }

    // 단어 세트 목록
    if (setsRes.success) {
      const sets = setsRes.data || [];
      if (sets.length === 0) {
        $('#word-sets-list').innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📷</div>
            <div class="empty-state-text">아직 단어 세트가 없어요.<br>사진을 찍어 단어를 추출해보세요!</div>
            <button class="btn btn-primary" id="empty-add-btn">📸 사진으로 시작하기</button>
          </div>
        `;
        $('#empty-add-btn').addEventListener('click', () => router.navigate(ROUTES.CAPTURE));
      } else {
        $('#word-sets-list').innerHTML = sets.map(s => {
          const progress = s.total_count > 0 ? Math.round((s.mastered_count / s.total_count) * 100) : 0;
          return `
            <div class="word-set-card" data-set-id="${s.set_id}">
              <div class="word-set-header">
                <div class="word-set-name">${s.set_name}</div>
                <button class="btn btn-ghost" style="padding:4px 8px;font-size:16px;" data-delete="${s.set_id}">🗑️</button>
              </div>
              <div class="word-set-meta">
                <span>📖 ${s.total_count || s.word_count}단어</span>
                <span>✅ ${s.mastered_count || 0}개 마스터</span>
                <span>${formatDate(s.created_date)}</span>
              </div>
              <div class="word-set-progress">
                <div class="word-set-progress-label">
                  <span>학습 진행률</span>
                  <span>${progress}%</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-bar-fill" style="width:${progress}%"></div>
                </div>
              </div>
            </div>
          `;
        }).join('');

        // 카드 클릭 → 학습 모드 선택
        document.querySelectorAll('.word-set-card').forEach(card => {
          card.addEventListener('click', (e) => {
            if (e.target.closest('[data-delete]')) return;
            const setId = card.dataset.setId;
            const set = sets.find(s => s.set_id === setId);
            router.navigate(ROUTES.STUDY_SELECT, { set_id: setId, set_name: set?.set_name });
          });
        });

        // 삭제 버튼
        document.querySelectorAll('[data-delete]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const setId = btn.dataset.delete;
            showModal('단어 세트 삭제', '이 단어 세트를 삭제할까요? 학습 기록도 함께 삭제됩니다.', [
              { text: '취소', class: 'btn-secondary' },
              { text: '삭제', class: 'btn-danger', onClick: async () => {
                const res = await api.deleteWordSet(user.user_id, setId);
                if (res.success) {
                  showToast('삭제되었습니다.', 'success');
                  renderHome();
                } else {
                  showToast(res.message, 'error');
                }
              }}
            ]);
          });
        });
      }
    }
  } catch (e) {
    console.error(e);
  }
}
