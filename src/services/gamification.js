// === Gamification Engine ===
import { SCORE_TABLE, BADGES } from '../utils/constants.js';

export function calculateScore(action, streakDays = 0) {
  const base = SCORE_TABLE[action] || 0;
  const multiplier = 1 + (streakDays * SCORE_TABLE.streak_bonus_multiplier);
  return Math.round(base * multiplier);
}

export function getLevel(totalScore) {
  return Math.floor(totalScore / SCORE_TABLE.level_threshold) + 1;
}

export function getLevelProgress(totalScore) {
  return (totalScore % SCORE_TABLE.level_threshold) / SCORE_TABLE.level_threshold;
}

export function getPointsToNextLevel(totalScore) {
  return SCORE_TABLE.level_threshold - (totalScore % SCORE_TABLE.level_threshold);
}

export function checkBadges(stats) {
  return BADGES.map(b => ({
    ...b,
    earned: b.condition(stats)
  }));
}

export function getStreakStatus(lastStudyDate) {
  if (!lastStudyDate) return { active: false, days: 0 };
  const last = new Date(lastStudyDate);
  const now = new Date();
  last.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((now - last) / 86400000);
  return {
    active: diffDays <= 1,
    isToday: diffDays === 0,
    daysSinceLast: diffDays
  };
}
