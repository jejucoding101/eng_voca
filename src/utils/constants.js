// === Constants ===
export const ROUTES = {
  AUTH: 'auth',
  HOME: 'home',
  CAPTURE: 'capture',
  WORD_LIST: 'words',
  STUDY_SELECT: 'study',
  FLASHCARD: 'flashcard',
  QUIZ: 'quiz',
  SPELLING: 'spelling',
  MATCHING: 'matching',
  SPEED_REVIEW: 'speed',
  LISTENING: 'listening',
  SRS_REVIEW: 'srs',
  STATS: 'stats',
  PROFILE: 'profile',
  SETTINGS: 'settings',
  ADMIN: 'admin'
};

export const STUDY_MODES = [
  { id: 'flashcard', name: '플래시카드', icon: '🎴', desc: '카드를 뒤집어 단어와 뜻 확인', color: '#6c5ce7', route: ROUTES.FLASHCARD },
  { id: 'quiz', name: '객관식 퀴즈', icon: '📝', desc: '4지선다로 정답 맞추기', color: '#00cec9', route: ROUTES.QUIZ },
  { id: 'spelling', name: '받아쓰기', icon: '✍️', desc: '뜻을 보고 영단어 직접 입력', color: '#fdcb6e', route: ROUTES.SPELLING },
  { id: 'matching', name: '매칭 게임', icon: '🔗', desc: '단어와 뜻을 빠르게 짝 맞추기', color: '#e17055', route: ROUTES.MATCHING },
  { id: 'speed', name: '빠른 복습', icon: '⚡', desc: '알아/모르겠어 빠르게 분류', color: '#74b9ff', route: ROUTES.SPEED_REVIEW },
  { id: 'listening', name: '리스닝 퀴즈', icon: '👂', desc: '발음을 듣고 뜻 맞추기', color: '#a29bfe', route: ROUTES.LISTENING },
  { id: 'srs', name: '간격 반복', icon: '📅', desc: '망각곡선 기반 최적 복습', color: '#55a3f0', route: ROUTES.SRS_REVIEW },
];

export const BADGES = [
  { id: 'first_study', name: '첫 학습', icon: '🌱', desc: '첫 번째 학습 완료', condition: s => s.totalStudies >= 1 },
  { id: 'word_50', name: '단어 수집가', icon: '📚', desc: '50단어 추출', condition: s => s.totalWords >= 50 },
  { id: 'word_100', name: '단어 마스터', icon: '📖', desc: '100단어 추출', condition: s => s.totalWords >= 100 },
  { id: 'streak_3', name: '3일 연속', icon: '🔥', desc: '3일 연속 학습', condition: s => s.maxStreak >= 3 },
  { id: 'streak_7', name: '주간 학습자', icon: '⭐', desc: '7일 연속 학습', condition: s => s.maxStreak >= 7 },
  { id: 'streak_30', name: '월간 정복자', icon: '🏆', desc: '30일 연속 학습', condition: s => s.maxStreak >= 30 },
  { id: 'perfect_quiz', name: '퀴즈 만점', icon: '💯', desc: '퀴즈에서 전문 정답', condition: s => s.perfectQuizzes >= 1 },
  { id: 'speed_master', name: '스피드 킹', icon: '⚡', desc: '빠른 복습 50단어', condition: s => s.speedReviewed >= 50 },
  { id: 'level_10', name: '고수', icon: '👑', desc: '레벨 10 달성', condition: s => s.level >= 10 },
];

export const SCORE_TABLE = {
  quiz_correct: 10,
  quiz_wrong: -2,
  spelling_correct: 15,
  spelling_wrong: -3,
  matching_complete: 20,
  matching_time_bonus: 5,
  speed_correct: 5,
  listening_correct: 12,
  srs_review: 8,
  streak_bonus_multiplier: 0.1, // per day streak
  level_threshold: 100 // points per level
};
