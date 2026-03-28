/**
 * VocaSnap - Google Apps Script Backend
 * 
 * [시트 구성]
 * 1. Users: user_id, email, password_hash, nickname, role, gemini_api_key, total_score, current_streak, max_streak, level, last_study_date, joined_date
 * 2. WordSets: set_id, user_id, set_name, created_date, word_count
 * 3. Words: word_id, set_id, user_id, word, pronunciation, part_of_speech, meaning_ko, example_sentence, derivatives
 * 4. Progress: progress_id, user_id, word_id, correct_count, wrong_count, mastery_level, ease_factor, interval_days, next_review_date, last_studied
 * 5. StudyLog: log_id, user_id, study_mode, word_count, correct_count, score_earned, duration_sec, study_date
 */

const SHEET_USERS = 'Users';
const SHEET_WORDSETS = 'WordSets';
const SHEET_WORDS = 'Words';
const SHEET_PROGRESS = 'Progress';
const SHEET_STUDYLOG = 'StudyLog';

const CACHE_TTL = 60;

// ================================================================
// 라우터
// ================================================================
function doGet(e) { return handleRequest(e, 'GET'); }
function doPost(e) { return handleRequest(e, 'POST'); }

function handleRequest(e, method) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  let response = { success: false, message: 'Invalid action' };

  try {
    const action = e.parameter.action;
    let payload = {};
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    if (method === 'GET') {
      switch(action) {
        case 'setup': setupSheets(); response = { success: true, message: 'Sheets initialized' }; break;
        case 'getWordSets': response = getWordSets(e.parameter); break;
        case 'getWords': response = getWords(e.parameter); break;
        case 'getProgress': response = getProgress(e.parameter); break;
        case 'getReviewQueue': response = getReviewQueue(e.parameter); break;
        case 'getStudyStats': response = getStudyStats(e.parameter); break;
        case 'getUserProfile': response = getUserProfile(e.parameter); break;
        case 'getApiKey': response = getApiKeyAction(e.parameter); break;
        case 'adminGetUsers': response = adminGetUsers(e.parameter); break;
      }
    } else if (method === 'POST') {
      switch(action) {
        case 'login': response = login(payload); break;
        case 'adminAddUser': response = adminAddUser(payload); break;
        case 'adminDeleteUser': response = adminDeleteUser(payload); break;
        case 'saveApiKey': response = saveApiKey(payload); break;
        case 'saveWordSet': response = saveWordSet(payload); break;
        case 'deleteWordSet': response = deleteWordSet(payload); break;
        case 'updateProgress': response = updateProgressAction(payload); break;
        case 'batchUpdateProgress': response = batchUpdateProgress(payload); break;
        case 'saveStudyLog': response = saveStudyLogAction(payload); break;
        default: response = { success: false, message: 'Invalid action: ' + action };
      }
    }
  } catch (error) {
    response = { success: false, message: error.toString() };
  }

  output.setContent(JSON.stringify(response));
  return output;
}

// ================================================================
// 유틸리티
// ================================================================
function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = [
    { name: SHEET_USERS, headers: ['user_id','username','password_hash','nickname','role','gemini_api_key','total_score','current_streak','max_streak','level','last_study_date','joined_date'] },
    { name: SHEET_WORDSETS, headers: ['set_id','user_id','set_name','created_date','word_count'] },
    { name: SHEET_WORDS, headers: ['word_id','set_id','user_id','word','pronunciation','part_of_speech','meaning_ko','example_sentence','derivatives'] },
    { name: SHEET_PROGRESS, headers: ['progress_id','user_id','word_id','correct_count','wrong_count','mastery_level','ease_factor','interval_days','next_review_date','last_studied'] },
    { name: SHEET_STUDYLOG, headers: ['log_id','user_id','study_mode','word_count','correct_count','score_earned','duration_sec','study_date'] }
  ];

  sheets.forEach(s => {
    let sheet = ss.getSheetByName(s.name);
    if (!sheet) {
      sheet = ss.insertSheet(s.name);
      sheet.appendRow(s.headers);
    }
  });

  // 최초 관리자 생성 (없으면)
  const usersData = getSheetData(SHEET_USERS);
  if (usersData.length === 0) {
    const sheet = getSheet(SHEET_USERS);
    const adminId = generateId('USR');
    sheet.appendRow([adminId, 'karisuma', hashPassword('7449547'), '관리자', 'admin', '', 0, 0, 0, 1, '', new Date().toISOString()]);
    invalidateCache(SHEET_USERS);
  }
}

function generateId(prefix) {
  return prefix + '_' + new Date().getTime() + '_' + Math.floor(Math.random() * 10000);
}

function hashPassword(password) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  let txtHash = '';
  for (let i = 0; i < rawHash.length; i++) {
    let hashVal = rawHash[i];
    if (hashVal < 0) hashVal += 256;
    if (hashVal.toString(16).length == 1) txtHash += '0';
    txtHash += hashVal.toString(16);
  }
  return txtHash;
}

function getSheetData(sheetName) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'sheet_' + sheetName;
  const cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch(e) {}
  }
  const sheet = getSheet(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const result = data.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
  try { cache.put(cacheKey, JSON.stringify(result), CACHE_TTL); } catch(e) {}
  return result;
}

function invalidateCache(sheetName) {
  CacheService.getScriptCache().remove('sheet_' + sheetName);
}

function invalidateCaches(names) {
  const cache = CacheService.getScriptCache();
  names.forEach(n => cache.remove('sheet_' + n));
}

// ================================================================
// 인증 (로그인만 — 사용자 추가는 관리자 전용)
// ================================================================
function login(payload) {
  const { username, password } = payload;
  if (!username || !password) return { success: false, message: '아이디와 비밀번호를 입력해주세요.' };

  const data = getSheetData(SHEET_USERS);
  const user = data.find(u => u.username === username);
  if (!user) return { success: false, message: '등록되지 않은 계정입니다. 관리자에게 문의하세요.' };
  if (user.password_hash !== hashPassword(password)) return { success: false, message: '비밀번호가 일치하지 않습니다.' };

  return {
    success: true,
    user: {
      user_id: user.user_id,
      username: user.username,
      nickname: user.nickname,
      role: user.role,
      total_score: user.total_score || 0,
      current_streak: user.current_streak || 0,
      max_streak: user.max_streak || 0,
      level: user.level || 1,
      last_study_date: user.last_study_date,
      has_api_key: !!user.gemini_api_key
    }
  };
}

// ================================================================
// 관리자: 사용자 관리
// ================================================================
function adminAddUser(payload) {
  const { admin_id, username, password, nickname } = payload;
  if (!admin_id || !username || !password || !nickname) return { success: false, message: '필수 정보가 누락되었습니다.' };

  const users = getSheetData(SHEET_USERS);
  const admin = users.find(u => u.user_id === admin_id && u.role === 'admin');
  if (!admin) return { success: false, message: '관리자 권한이 필요합니다.' };

  if (users.find(u => u.username === username)) return { success: false, message: '이미 등록된 아이디입니다.' };

  const sheet = getSheet(SHEET_USERS);
  const userId = generateId('USR');
  sheet.appendRow([userId, username, hashPassword(password), nickname, 'member', '', 0, 0, 0, 1, '', new Date().toISOString()]);
  invalidateCache(SHEET_USERS);

  return { success: true, message: nickname + ' 계정이 생성되었습니다.', user_id: userId };
}

function adminDeleteUser(payload) {
  const { admin_id, user_id } = payload;
  const users = getSheetData(SHEET_USERS);
  const admin = users.find(u => u.user_id === admin_id && u.role === 'admin');
  if (!admin) return { success: false, message: '관리자 권한이 필요합니다.' };

  const target = users.find(u => u.user_id === user_id);
  if (!target) return { success: false, message: '사용자를 찾을 수 없습니다.' };
  if (target.role === 'admin') return { success: false, message: '관리자 계정은 삭제할 수 없습니다.' };

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const sheet = getSheet(SHEET_USERS);
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === user_id) {
        sheet.deleteRow(i + 1);
        invalidateCache(SHEET_USERS);
        return { success: true, message: '사용자가 삭제되었습니다.' };
      }
    }
    return { success: false, message: '사용자를 찾을 수 없습니다.' };
  } finally { lock.releaseLock(); }
}

function adminGetUsers(params) {
  const { admin_id } = params;
  const users = getSheetData(SHEET_USERS);
  const admin = users.find(u => u.user_id === admin_id && u.role === 'admin');
  if (!admin) return { success: false, message: '관리자 권한이 필요합니다.' };

  const result = users.map(u => ({
    user_id: u.user_id,
    username: u.username,
    nickname: u.nickname,
    role: u.role,
    total_score: u.total_score || 0,
    level: u.level || 1,
    joined_date: u.joined_date,
    last_study_date: u.last_study_date
  }));
  return { success: true, data: result };
}

// ================================================================
// API 키 관리
// ================================================================
function saveApiKey(payload) {
  const { user_id, api_key } = payload;
  
  // 관리자만 API 키 설정 가능
  const users = getSheetData(SHEET_USERS);
  const requestUser = users.find(u => u.user_id === user_id);
  if (!requestUser || requestUser.role !== 'admin') {
    return { success: false, message: '관리자만 API 키를 설정할 수 있습니다.' };
  }
  
  const sheet = getSheet(SHEET_USERS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const keyCol = headers.indexOf('gemini_api_key') + 1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === user_id) {
      const encrypted = simpleEncrypt(api_key, user_id);
      sheet.getRange(i + 1, keyCol).setValue(encrypted);
      invalidateCache(SHEET_USERS);
      return { success: true, message: 'API 키가 저장되었습니다. 모든 사용자가 이 키를 공유합니다.' };
    }
  }
  return { success: false, message: '사용자를 찾을 수 없습니다.' };
}

function getApiKeyAction(params) {
  // 관리자의 API 키를 모든 사용자가 공유
  const users = getSheetData(SHEET_USERS);
  const admin = users.find(u => u.role === 'admin');
  if (!admin || !admin.gemini_api_key) return { success: true, api_key: '' };
  const decrypted = simpleDecrypt(admin.gemini_api_key, admin.user_id);
  return { success: true, api_key: decrypted };
}

function simpleEncrypt(text, key) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return Utilities.base64Encode(result);
}

function simpleDecrypt(encoded, key) {
  const text = Utilities.newBlob(Utilities.base64Decode(encoded)).getDataAsString();
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

// ================================================================
// 단어 세트 CRUD
// ================================================================
function saveWordSet(payload) {
  const { user_id, set_name, words } = payload;
  if (!user_id || !words || words.length === 0) return { success: false, message: '필수 정보가 누락되었습니다.' };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const setId = generateId('SET');
    const setSheet = getSheet(SHEET_WORDSETS);
    setSheet.appendRow([setId, user_id, set_name || '새 단어 세트', new Date().toISOString(), words.length]);

    const wordSheet = getSheet(SHEET_WORDS);
    const progressSheet = getSheet(SHEET_PROGRESS);
    
    words.forEach(w => {
      const wordId = generateId('WRD');
      const derivatives = Array.isArray(w.derivatives) ? JSON.stringify(w.derivatives) : (w.derivatives || '[]');
      wordSheet.appendRow([wordId, setId, user_id, w.word, w.pronunciation || '', w.part_of_speech || '', w.meaning_ko || '', w.example_sentence || '', derivatives]);
      // 초기 Progress 레코드 생성
      const today = new Date().toISOString().split('T')[0];
      progressSheet.appendRow([generateId('PRG'), user_id, wordId, 0, 0, 0, 2.5, 0, today, '']);
    });

    invalidateCaches([SHEET_WORDSETS, SHEET_WORDS, SHEET_PROGRESS]);
    return { success: true, message: words.length + '개 단어가 저장되었습니다.', set_id: setId };
  } finally { lock.releaseLock(); }
}

function getWordSets(params) {
  const { user_id } = params;
  const sets = getSheetData(SHEET_WORDSETS).filter(s => s.user_id === user_id);
  const progress = getSheetData(SHEET_PROGRESS).filter(p => p.user_id === user_id);
  const words = getSheetData(SHEET_WORDS).filter(w => w.user_id === user_id);

  const result = sets.map(s => {
    const setWords = words.filter(w => w.set_id === s.set_id);
    const setWordIds = setWords.map(w => w.word_id);
    const setProgress = progress.filter(p => setWordIds.includes(p.word_id));
    const mastered = setProgress.filter(p => (p.mastery_level || 0) >= 4).length;
    return {
      ...s,
      mastered_count: mastered,
      total_count: setWords.length
    };
  });
  
  result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  return { success: true, data: result };
}

function getWords(params) {
  const { user_id, set_id } = params;
  let words = getSheetData(SHEET_WORDS).filter(w => w.user_id === user_id);
  if (set_id) words = words.filter(w => w.set_id === set_id);
  
  // derivatives 문자열을 배열로 파싱
  words = words.map(w => ({
    ...w,
    derivatives: (() => {
      try { return JSON.parse(w.derivatives || '[]'); } catch(e) { return []; }
    })()
  }));

  const progress = getSheetData(SHEET_PROGRESS).filter(p => p.user_id === user_id);
  const result = words.map(w => {
    const prog = progress.find(p => p.word_id === w.word_id);
    return { ...w, progress: prog || null };
  });

  return { success: true, data: result };
}

function deleteWordSet(payload) {
  const { user_id, set_id } = payload;
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    // 세트 삭제
    const setSheet = getSheet(SHEET_WORDSETS);
    const setData = setSheet.getDataRange().getValues();
    for (let i = setData.length - 1; i >= 1; i--) {
      if (setData[i][0] === set_id && setData[i][1] === user_id) {
        setSheet.deleteRow(i + 1);
        break;
      }
    }

    // 관련 단어 삭제
    const wordSheet = getSheet(SHEET_WORDS);
    const wordData = wordSheet.getDataRange().getValues();
    const deletedWordIds = [];
    for (let i = wordData.length - 1; i >= 1; i--) {
      if (wordData[i][1] === set_id && wordData[i][2] === user_id) {
        deletedWordIds.push(wordData[i][0]);
        wordSheet.deleteRow(i + 1);
      }
    }

    // 관련 Progress 삭제
    if (deletedWordIds.length > 0) {
      const progSheet = getSheet(SHEET_PROGRESS);
      const progData = progSheet.getDataRange().getValues();
      for (let i = progData.length - 1; i >= 1; i--) {
        if (deletedWordIds.includes(progData[i][2])) {
          progSheet.deleteRow(i + 1);
        }
      }
    }

    invalidateCaches([SHEET_WORDSETS, SHEET_WORDS, SHEET_PROGRESS]);
    return { success: true, message: '단어 세트가 삭제되었습니다.' };
  } finally { lock.releaseLock(); }
}

// ================================================================
// 학습 성취도
// ================================================================
function updateProgressAction(payload) {
  const { user_id, word_id, correct, study_mode } = payload;
  return updateSingleProgress(user_id, word_id, correct, study_mode);
}

function updateSingleProgress(user_id, word_id, correct, study_mode) {
  const sheet = getSheet(SHEET_PROGRESS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === user_id && data[i][2] === word_id) {
      const row = i + 1;
      let correctCount = (data[i][3] || 0);
      let wrongCount = (data[i][4] || 0);
      let masteryLevel = (data[i][5] || 0);
      let easeFactor = (data[i][6] || 2.5);
      let intervalDays = (data[i][7] || 0);

      if (correct) {
        correctCount++;
        // SM-2 기반 업데이트
        const quality = correct ? 4 : 1;
        let newEF = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        if (newEF < 1.3) newEF = 1.3;
        
        if (quality < 3) {
          intervalDays = 1;
        } else {
          if (intervalDays === 0) intervalDays = 1;
          else if (intervalDays === 1) intervalDays = 3;
          else intervalDays = Math.round(intervalDays * newEF);
        }
        easeFactor = Math.round(newEF * 100) / 100;
        masteryLevel = Math.min(5, masteryLevel + 1);
      } else {
        wrongCount++;
        intervalDays = 1;
        masteryLevel = Math.max(0, masteryLevel - 1);
      }

      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + intervalDays);
      const nextReviewStr = nextReview.toISOString().split('T')[0];
      const now = new Date().toISOString();

      sheet.getRange(row, 4, 1, 7).setValues([[correctCount, wrongCount, masteryLevel, easeFactor, intervalDays, nextReviewStr, now]]);
      invalidateCache(SHEET_PROGRESS);
      return { success: true };
    }
  }
  return { success: false, message: 'Progress record not found' };
}

function batchUpdateProgress(payload) {
  const { user_id, results } = payload;
  if (!results || results.length === 0) return { success: true };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    let totalScore = 0;
    results.forEach(r => {
      updateSingleProgress(user_id, r.word_id, r.correct, r.study_mode);
      if (r.score) totalScore += r.score;
    });

    // 점수 업데이트
    if (totalScore > 0) {
      updateUserScore(user_id, totalScore);
    }
    
    return { success: true, message: results.length + '개 결과 업데이트됨' };
  } finally { lock.releaseLock(); }
}

function updateUserScore(user_id, scoreToAdd) {
  const sheet = getSheet(SHEET_USERS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === user_id) {
      const row = i + 1;
      const totalScore = (data[i][headers.indexOf('total_score')] || 0) + scoreToAdd;
      const level = Math.floor(totalScore / 100) + 1;
      
      // 스트릭 업데이트
      const today = new Date().toISOString().split('T')[0];
      const lastStudy = data[i][headers.indexOf('last_study_date')] || '';
      let currentStreak = data[i][headers.indexOf('current_streak')] || 0;
      let maxStreak = data[i][headers.indexOf('max_streak')] || 0;
      
      if (lastStudy) {
        const lastDate = new Date(lastStudy);
        const todayDate = new Date(today);
        lastDate.setHours(0,0,0,0);
        todayDate.setHours(0,0,0,0);
        const diff = Math.floor((todayDate - lastDate) / 86400000);
        if (diff === 1) {
          currentStreak++;
        } else if (diff > 1) {
          currentStreak = 1;
        }
        // diff === 0 이면 유지
      } else {
        currentStreak = 1;
      }
      if (currentStreak > maxStreak) maxStreak = currentStreak;

      const scoreCol = headers.indexOf('total_score') + 1;
      const streakCol = headers.indexOf('current_streak') + 1;
      const maxStreakCol = headers.indexOf('max_streak') + 1;
      const levelCol = headers.indexOf('level') + 1;
      const lastStudyCol = headers.indexOf('last_study_date') + 1;

      sheet.getRange(row, scoreCol).setValue(totalScore);
      sheet.getRange(row, streakCol).setValue(currentStreak);
      sheet.getRange(row, maxStreakCol).setValue(maxStreak);
      sheet.getRange(row, levelCol).setValue(level);
      sheet.getRange(row, lastStudyCol).setValue(today);

      invalidateCache(SHEET_USERS);
      return;
    }
  }
}

// ================================================================
// SRS 복습 큐
// ================================================================
function getReviewQueue(params) {
  const { user_id } = params;
  const today = new Date().toISOString().split('T')[0];
  const progress = getSheetData(SHEET_PROGRESS).filter(p => p.user_id === user_id && p.next_review_date && p.next_review_date <= today);
  
  if (progress.length === 0) return { success: true, data: [] };

  const words = getSheetData(SHEET_WORDS).filter(w => w.user_id === user_id);
  const result = progress.map(p => {
    const word = words.find(w => w.word_id === p.word_id);
    if (!word) return null;
    return {
      ...word,
      derivatives: (() => { try { return JSON.parse(word.derivatives || '[]'); } catch(e) { return []; } })(),
      progress: p
    };
  }).filter(Boolean);

  return { success: true, data: result };
}

// ================================================================
// 학습 로그 & 통계
// ================================================================
function saveStudyLogAction(payload) {
  const { user_id, study_mode, word_count, correct_count, score_earned, duration_sec } = payload;
  
  const sheet = getSheet(SHEET_STUDYLOG);
  sheet.appendRow([generateId('LOG'), user_id, study_mode, word_count || 0, correct_count || 0, score_earned || 0, duration_sec || 0, new Date().toISOString()]);
  invalidateCache(SHEET_STUDYLOG);

  // 점수 업데이트
  if (score_earned && score_earned > 0) {
    updateUserScore(user_id, score_earned);
  }
  
  return { success: true };
}

function getStudyStats(params) {
  const { user_id } = params;
  const logs = getSheetData(SHEET_STUDYLOG).filter(l => l.user_id === user_id);
  const progress = getSheetData(SHEET_PROGRESS).filter(p => p.user_id === user_id);
  const words = getSheetData(SHEET_WORDS).filter(w => w.user_id === user_id);

  const totalStudies = logs.length;
  const totalWordsStudied = logs.reduce((sum, l) => sum + (l.word_count || 0), 0);
  const totalCorrect = logs.reduce((sum, l) => sum + (l.correct_count || 0), 0);
  const totalTime = logs.reduce((sum, l) => sum + (l.duration_sec || 0), 0);
  const mastered = progress.filter(p => (p.mastery_level || 0) >= 4).length;

  // 모드별 통계
  const modeStats = {};
  logs.forEach(l => {
    if (!modeStats[l.study_mode]) {
      modeStats[l.study_mode] = { count: 0, correct: 0, total_words: 0 };
    }
    modeStats[l.study_mode].count++;
    modeStats[l.study_mode].correct += (l.correct_count || 0);
    modeStats[l.study_mode].total_words += (l.word_count || 0);
  });

  return {
    success: true,
    data: {
      totalStudies,
      totalWords: words.length,
      totalWordsStudied,
      totalCorrect,
      totalTimeSec: totalTime,
      masteredWords: mastered,
      accuracyRate: totalWordsStudied > 0 ? Math.round((totalCorrect / totalWordsStudied) * 100) : 0,
      modeStats
    }
  };
}

function getUserProfile(params) {
  const { user_id } = params;
  const users = getSheetData(SHEET_USERS);
  const user = users.find(u => u.user_id === user_id);
  if (!user) return { success: false, message: '사용자를 찾을 수 없습니다.' };

  const words = getSheetData(SHEET_WORDS).filter(w => w.user_id === user_id);
  const progress = getSheetData(SHEET_PROGRESS).filter(p => p.user_id === user_id);
  const logs = getSheetData(SHEET_STUDYLOG).filter(l => l.user_id === user_id);

  const mastered = progress.filter(p => (p.mastery_level || 0) >= 4).length;
  const perfectQuizzes = logs.filter(l => l.study_mode === 'quiz' && l.word_count > 0 && l.correct_count === l.word_count).length;
  const speedReviewed = logs.filter(l => l.study_mode === 'speed').reduce((s, l) => s + (l.word_count || 0), 0);

  return {
    success: true,
    data: {
      nickname: user.nickname,
      role: user.role,
      total_score: user.total_score || 0,
      current_streak: user.current_streak || 0,
      max_streak: user.max_streak || 0,
      level: user.level || 1,
      last_study_date: user.last_study_date,
      joined_date: user.joined_date,
      totalWords: words.length,
      masteredWords: mastered,
      totalStudies: logs.length,
      perfectQuizzes,
      speedReviewed,
      // 오늘 복습 필요 수
      reviewDueToday: (() => {
        const today = new Date().toISOString().split('T')[0];
        return progress.filter(p => p.next_review_date && p.next_review_date <= today).length;
      })()
    }
  };
}
