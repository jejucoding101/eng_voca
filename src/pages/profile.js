// === Profile Page ===
import { $, getSession, formatDate } from '../utils/helpers.js';
import { renderNav } from '../components/navbar.js';
import { BADGES } from '../utils/constants.js';
import { getLevel, getLevelProgress, getPointsToNextLevel } from '../services/gamification.js';
import api from '../services/api.js';

export async function renderProfile() {
  const container = $('#page-container');
  renderNav('profile');

  container.innerHTML = `
    <div id="profile-content">
      <div class="profile-header">
        <div class="profile-avatar skeleton"></div>
        <div class="skeleton" style="height:24px;width:120px;margin:12px auto"></div>
      </div>
      <div class="skeleton" style="height:200px"></div>
    </div>
  `;

  const user = getSession();
  const res = await api.getUserProfile(user.user_id);

  if (res.success) {
    const p = res.data;
    const level = getLevel(p.total_score || 0);
    const progress = getLevelProgress(p.total_score || 0);
    const toNext = getPointsToNextLevel(p.total_score || 0);

    const badgeStatus = BADGES.map(b => ({
      ...b,
      earned: b.condition({
        totalStudies: p.totalStudies || 0,
        totalWords: p.totalWords || 0,
        maxStreak: p.max_streak || 0,
        perfectQuizzes: p.perfectQuizzes || 0,
        speedReviewed: p.speedReviewed || 0,
        level: level
      })
    }));

    const earnedCount = badgeStatus.filter(b => b.earned).length;

    const circumference = 2 * Math.PI * 42;
    const offset = circumference - (progress * circumference);

    container.innerHTML = `
      <div class="profile-header">
        <div class="profile-avatar">🎓</div>
        <div class="profile-name">${p.nickname}</div>
        <div class="profile-level">Level ${level}</div>
      </div>

      <div class="flex-center mb-xl">
        <div class="circular-progress">
          <svg width="100" height="100">
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#6c5ce7" />
                <stop offset="100%" style="stop-color:#a29bfe" />
              </linearGradient>
            </defs>
            <circle class="progress-bg" cx="50" cy="50" r="42"/>
            <circle class="progress-fill" cx="50" cy="50" r="42" 
              stroke-dasharray="${circumference}" 
              stroke-dashoffset="${offset}" />
          </svg>
          <div class="progress-text">
            <span style="font-size:var(--fs-lg)">${Math.round(progress * 100)}%</span>
            <span style="font-size:var(--fs-xs);color:var(--text-secondary)">Lv.${level + 1}까지</span>
          </div>
        </div>
      </div>

      <p class="text-center text-muted mb-xl" style="font-size:var(--fs-sm)">
        다음 레벨까지 <strong class="text-accent">${toNext}점</strong> 남았어요
      </p>

      <div class="home-stats-grid mb-xl">
        <div class="stat-card"><div class="stat-value" style="color:var(--gold)">${p.total_score || 0}</div><div class="stat-label">총 점수</div></div>
        <div class="stat-card"><div class="stat-value text-error">🔥 ${p.current_streak || 0}</div><div class="stat-label">연속 학습</div></div>
        <div class="stat-card"><div class="stat-value text-accent">${p.totalWords || 0}</div><div class="stat-label">학습 단어</div></div>
      </div>

      <div class="section-header">
        <h3 class="section-title">🏅 배지</h3>
        <span class="text-muted" style="font-size:var(--fs-sm)">${earnedCount}/${BADGES.length}</span>
      </div>

      <div class="badge-grid stagger-children">
        ${badgeStatus.map(b => `
          <div class="badge-item ${b.earned ? '' : 'locked'}">
            <div class="badge-item-icon">${b.icon}</div>
            <div class="badge-item-name">${b.name}</div>
          </div>
        `).join('')}
      </div>

      <div class="card mt-xl" style="padding:var(--sp-lg)">
        <div class="flex-between">
          <span style="font-size:var(--fs-sm);color:var(--text-secondary)">가입일</span>
          <span style="font-size:var(--fs-sm)">${formatDate(p.joined_date)}</span>
        </div>
      </div>
    `;
  }
}
