// === Stats Page ===
import { $, getSession } from '../utils/helpers.js';
import { renderNav } from '../components/navbar.js';
import api from '../services/api.js';

export async function renderStats() {
  const container = $('#page-container');
  renderNav('stats');

  container.innerHTML = `
    <h2 style="margin-bottom:var(--sp-xl)">📊 학습 통계</h2>
    <div id="stats-content">
      <div class="skeleton" style="height:80px;margin-bottom:12px"></div>
      <div class="skeleton" style="height:80px;margin-bottom:12px"></div>
      <div class="skeleton" style="height:200px;margin-bottom:12px"></div>
    </div>
  `;

  const user = getSession();
  const res = await api.getStudyStats(user.user_id);

  if (res.success) {
    const s = res.data;
    const modeNames = { quiz: '객관식', spelling: '받아쓰기', matching: '매칭', speed: '빠른복습', listening: '리스닝', srs: '간격반복', flashcard: '플래시카드' };

    const totalMinutes = Math.round((s.totalTimeSec || 0) / 60);

    $('#stats-content').innerHTML = `
      <div class="home-stats-grid mb-xl">
        <div class="stat-card"><div class="stat-value text-accent">${s.totalWords || 0}</div><div class="stat-label">전체 단어</div></div>
        <div class="stat-card"><div class="stat-value text-success">${s.masteredWords || 0}</div><div class="stat-label">마스터</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--info)">${s.accuracyRate || 0}%</div><div class="stat-label">정답률</div></div>
      </div>

      <div class="home-stats-grid mb-xl">
        <div class="stat-card"><div class="stat-value">${s.totalStudies || 0}</div><div class="stat-label">학습 횟수</div></div>
        <div class="stat-card"><div class="stat-value">${s.totalWordsStudied || 0}</div><div class="stat-label">학습 단어</div></div>
        <div class="stat-card"><div class="stat-value">${totalMinutes}분</div><div class="stat-label">총 학습 시간</div></div>
      </div>

      <h3 class="section-title mb-lg">모드별 통계</h3>
      <div style="display:flex;flex-direction:column;gap:var(--sp-sm)">
        ${Object.entries(s.modeStats || {}).map(([mode, stat]) => {
          const accuracy = stat.total_words > 0 ? Math.round((stat.correct / stat.total_words) * 100) : 0;
          return `
            <div class="card" style="padding:var(--sp-lg)">
              <div class="flex-between mb-sm">
                <span style="font-weight:var(--fw-semibold)">${modeNames[mode] || mode}</span>
                <span class="badge badge-accent">${stat.count}회</span>
              </div>
              <div class="progress-bar">
                <div class="progress-bar-fill" style="width:${accuracy}%;background:${accuracy >= 70 ? 'var(--success)' : 'var(--warning)'}"></div>
              </div>
              <div class="flex-between mt-sm" style="font-size:var(--fs-xs);color:var(--text-secondary)">
                <span>정답 ${stat.correct}/${stat.total_words}</span>
                <span>${accuracy}%</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
}
