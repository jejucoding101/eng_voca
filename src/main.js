// === VocaSnap — Main Entry Point ===
import { router } from './utils/router.js';
import { ROUTES } from './utils/constants.js';
import { getSession } from './utils/helpers.js';

// Pages
import { renderAuth } from './pages/auth.js';
import { renderHome } from './pages/home.js';
import { renderCapture } from './pages/capture.js';
import { renderWordList } from './pages/wordList.js';
import { renderStudySelect } from './pages/studySelect.js';
import { renderFlashcard } from './pages/flashcard.js';
import { renderQuiz } from './pages/quiz.js';
import { renderSpelling } from './pages/spelling.js';
import { renderMatching } from './pages/matching.js';
import { renderSpeedReview } from './pages/speedReview.js';
import { renderListening } from './pages/listening.js';
import { renderSrsReview } from './pages/srsReview.js';
import { renderStats } from './pages/stats.js';
import { renderProfile } from './pages/profile.js';
import { renderSettings } from './pages/settings.js';
import { renderAdmin } from './pages/admin.js';
import { renderStoryRead } from './pages/storyRead.js';

// Auth guard
router.beforeEach((route) => {
  const user = getSession();
  const publicRoutes = [ROUTES.AUTH];

  if (!user && !publicRoutes.includes(route)) {
    router.navigate(ROUTES.AUTH);
    return false;
  }

  if (user && route === ROUTES.AUTH) {
    router.navigate(ROUTES.HOME);
    return false;
  }

  return true;
});

// Route registration
router
  .on(ROUTES.AUTH, () => renderAuth())
  .on(ROUTES.HOME, () => renderHome())
  .on(ROUTES.CAPTURE, () => renderCapture())
  .on(ROUTES.WORD_LIST, (p) => renderWordList(p))
  .on(ROUTES.STUDY_SELECT, (p) => renderStudySelect(p))
  .on(ROUTES.FLASHCARD, (p) => renderFlashcard(p))
  .on(ROUTES.QUIZ, (p) => renderQuiz(p))
  .on(ROUTES.SPELLING, (p) => renderSpelling(p))
  .on(ROUTES.MATCHING, (p) => renderMatching(p))
  .on(ROUTES.SPEED_REVIEW, (p) => renderSpeedReview(p))
  .on(ROUTES.LISTENING, (p) => renderListening(p))
  .on(ROUTES.SRS_REVIEW, () => renderSrsReview())
  .on(ROUTES.STATS, () => renderStats())
  .on(ROUTES.PROFILE, () => renderProfile())
  .on(ROUTES.SETTINGS, () => renderSettings())
  .on(ROUTES.ADMIN, () => renderAdmin())
  .on(ROUTES.STORY_READ, (p) => renderStoryRead(p));

// Start
router.start();
