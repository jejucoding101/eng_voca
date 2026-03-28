// === SM-2 Spaced Repetition Algorithm ===

/**
 * SM-2 알고리즘 구현
 * quality: 0-5 (0=다시, 1-2=어려움, 3=보통, 4-5=쉬움)
 * 
 * Returns: { interval, easeFactor, repetition }
 */
export function sm2(quality, repetition = 0, easeFactor = 2.5, interval = 0) {
  let newEF = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEF < 1.3) newEF = 1.3;

  let newInterval;
  let newRepetition;

  if (quality < 3) {
    // 오답 → 처음부터
    newRepetition = 0;
    newInterval = 1;
  } else {
    newRepetition = repetition + 1;
    if (newRepetition === 1) {
      newInterval = 1;
    } else if (newRepetition === 2) {
      newInterval = 3;
    } else {
      newInterval = Math.round(interval * newEF);
    }
  }

  return {
    interval: newInterval,
    easeFactor: Math.round(newEF * 100) / 100,
    repetition: newRepetition
  };
}

/**
 * quality를 사용자 행동에서 결정
 * @param {'again'|'hard'|'good'|'easy'} difficulty 
 */
export function difficultyToQuality(difficulty) {
  switch (difficulty) {
    case 'again': return 0;
    case 'hard': return 2;
    case 'good': return 3;
    case 'easy': return 5;
    default: return 3;
  }
}

/**
 * 다음 복습 날짜 계산
 */
export function getNextReviewDate(intervalDays) {
  const d = new Date();
  d.setDate(d.getDate() + intervalDays);
  return d.toISOString().split('T')[0];
}

/**
 * interval을 사람이 읽기 쉬운 형태로
 */
export function formatInterval(days) {
  if (days === 0) return '오늘';
  if (days === 1) return '1일';
  if (days < 7) return `${days}일`;
  if (days < 30) return `${Math.round(days / 7)}주`;
  if (days < 365) return `${Math.round(days / 30)}개월`;
  return `${Math.round(days / 365)}년`;
}
