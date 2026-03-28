// === API Communication Layer for ENG_VOCA ===
// Google Apps Script Web App과 통신

// 사용자가 설정에서 변경 가능
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbxvsK-qNNJTgWzyhLCpr1ehhYwwkY3D6MZVngXVVm0IHSbxDbocrkyVw1Pa_4-fW2MJ/exec';
let GAS_URL = localStorage.getItem('vocasnap_gas_url') || DEFAULT_GAS_URL;

export function setGasUrl(url) {
  GAS_URL = url;
  localStorage.setItem('vocasnap_gas_url', url);
}

export function getGasUrl() {
  return GAS_URL;
}

const api = {
  async request(method, action, payload = null) {
    if (!GAS_URL) throw new Error('Apps Script URL이 설정되지 않았습니다.');

    let url = `${GAS_URL}?action=${action}`;
    const options = { method };

    if (method === 'POST') {
      options.body = JSON.stringify(payload);
      options.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
    } else if (method === 'GET' && payload) {
      for (let key in payload) {
        if (payload[key] !== undefined && payload[key] !== null) {
          url += `&${key}=${encodeURIComponent(payload[key])}`;
        }
      }
    }

    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error('네트워크 오류');
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      return { success: false, message: '서버 통신 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' };
    }
  },

  // === 인증 ===
  login(email, password) {
    return this.request('POST', 'login', { email, password });
  },

  // === 관리자: 사용자 관리 ===
  adminAddUser(admin_id, email, password, nickname) {
    return this.request('POST', 'adminAddUser', { admin_id, email, password, nickname });
  },
  adminDeleteUser(admin_id, user_id) {
    return this.request('POST', 'adminDeleteUser', { admin_id, user_id });
  },
  adminGetUsers(admin_id) {
    return this.request('GET', 'adminGetUsers', { admin_id });
  },

  // === API 키 ===
  saveApiKey(user_id, api_key) {
    return this.request('POST', 'saveApiKey', { user_id, api_key });
  },
  getApiKey(user_id) {
    return this.request('GET', 'getApiKey', { user_id });
  },

  // === 단어 세트 ===
  saveWordSet(user_id, set_name, words) {
    return this.request('POST', 'saveWordSet', { user_id, set_name, words });
  },
  getWordSets(user_id) {
    return this.request('GET', 'getWordSets', { user_id });
  },
  getWords(user_id, set_id) {
    return this.request('GET', 'getWords', { user_id, set_id });
  },
  deleteWordSet(user_id, set_id) {
    return this.request('POST', 'deleteWordSet', { user_id, set_id });
  },

  // === 학습 성취도 ===
  getProgress(user_id, set_id) {
    return this.request('GET', 'getProgress', { user_id, set_id });
  },
  updateProgress(user_id, word_id, correct, study_mode) {
    return this.request('POST', 'updateProgress', { user_id, word_id, correct, study_mode });
  },
  batchUpdateProgress(user_id, results) {
    return this.request('POST', 'batchUpdateProgress', { user_id, results });
  },

  // === SRS ===
  getReviewQueue(user_id) {
    return this.request('GET', 'getReviewQueue', { user_id });
  },

  // === 학습 로그 & 통계 ===
  saveStudyLog(user_id, study_mode, word_count, correct_count, score_earned, duration_sec) {
    return this.request('POST', 'saveStudyLog', { user_id, study_mode, word_count, correct_count, score_earned, duration_sec });
  },
  getStudyStats(user_id) {
    return this.request('GET', 'getStudyStats', { user_id });
  },
  getUserProfile(user_id) {
    return this.request('GET', 'getUserProfile', { user_id });
  },

  // === 초기화 ===
  setup() {
    return this.request('GET', 'setup');
  }
};

export default api;
