// === Capture Page — 사진 촬영/업로드 ===
import { $, getSession, getApiKey, showToast, showLoader, hideLoader } from '../utils/helpers.js';
import { router } from '../utils/router.js';
import { ROUTES } from '../utils/constants.js';
import { renderNav } from '../components/navbar.js';
import { extractWordsFromImages } from '../services/gemini.js';
import api from '../services/api.js';

let capturedImages = [];

export function renderCapture() {
  const container = $('#page-container');
  renderNav('capture');
  capturedImages = [];

  container.innerHTML = `
    <div class="capture-header">
      <h2>📷 단어 촬영</h2>
      <p>영어 단어장 페이지를 촬영하세요 (최대 3장)</p>
    </div>

    <input type="file" accept="image/*" capture="environment" class="capture-input-hidden" id="camera-input" />
    <input type="file" accept="image/*" multiple class="capture-input-hidden" id="gallery-input" />

    <div class="image-grid" id="image-grid">
      <button class="image-add-btn" id="add-camera-btn">
        📷
        <span>카메라</span>
      </button>
      <button class="image-add-btn" id="add-gallery-btn">
        🖼️
        <span>갤러리</span>
      </button>
    </div>

    <div class="input-group mt-xl">
      <label>세트 이름</label>
      <input type="text" class="input" id="set-name-input" placeholder="예: DAY 08, Chapter 3" />
    </div>

    <button class="btn btn-primary btn-full btn-lg mt-lg" id="extract-btn" disabled>
      ✨ AI로 단어 추출하기
    </button>

    <div id="extract-result" class="mt-xl"></div>
  `;

  // 카메라
  $('#add-camera-btn').addEventListener('click', () => {
    if (capturedImages.length >= 3) { showToast('최대 3장까지 가능합니다.', 'warning'); return; }
    $('#camera-input').click();
  });

  // 갤러리
  $('#add-gallery-btn').addEventListener('click', () => {
    if (capturedImages.length >= 3) { showToast('최대 3장까지 가능합니다.', 'warning'); return; }
    $('#gallery-input').click();
  });

  $('#camera-input').addEventListener('change', handleImageSelect);
  $('#gallery-input').addEventListener('change', handleImageSelect);
  $('#extract-btn').addEventListener('click', handleExtract);
}

function handleImageSelect(e) {
  const files = Array.from(e.target.files);
  const remaining = 3 - capturedImages.length;
  const toAdd = files.slice(0, remaining);

  toAdd.forEach(file => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      capturedImages.push({ data: ev.target.result, type: file.type, name: file.name });
      updateImageGrid();
    };
    reader.readAsDataURL(file);
  });

  e.target.value = '';
}

function updateImageGrid() {
  const grid = $('#image-grid');

  grid.innerHTML = capturedImages.map((img, i) => `
    <div class="image-preview">
      <img src="${img.data}" alt="Image ${i + 1}" />
      <button class="remove-btn" data-index="${i}">✕</button>
    </div>
  `).join('');

  if (capturedImages.length < 3) {
    grid.innerHTML += `
      <button class="image-add-btn" id="add-more-btn">
        📷
        <span>추가 (${capturedImages.length}/3)</span>
      </button>
    `;
    const addBtn = grid.querySelector('#add-more-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => $('#camera-input').click());
    }
  }

  // 삭제 버튼
  grid.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      capturedImages.splice(parseInt(btn.dataset.index), 1);
      updateImageGrid();
    });
  });

  $('#extract-btn').disabled = capturedImages.length === 0;
}

async function handleExtract() {
  const apiKey = getApiKey();
  if (!apiKey) {
    showToast('Gemini API 키를 먼저 설정해주세요. (설정 메뉴)', 'error');
    router.navigate(ROUTES.SETTINGS);
    return;
  }

  const setName = $('#set-name-input').value.trim() || `단어 세트 ${new Date().toLocaleDateString('ko')}`;

  showLoader('AI가 단어를 추출하고 있어요... 🤖');

  try {
    const words = await extractWordsFromImages(capturedImages, apiKey);

    if (!words || words.length === 0) {
      hideLoader();
      showToast('단어를 찾을 수 없습니다. 다른 사진으로 시도해보세요.', 'warning');
      return;
    }

    // 서버에 저장
    const user = getSession();
    const saveRes = await api.saveWordSet(user.user_id, setName, words);
    hideLoader();

    if (saveRes.success) {
      showToast(`${words.length}개 단어가 추출되었습니다! 🎉`, 'success');
      router.navigate(ROUTES.STUDY_SELECT, { set_id: saveRes.set_id, set_name: setName });
    } else {
      showToast(saveRes.message || '저장 중 오류가 발생했습니다.', 'error');
    }
  } catch (e) {
    hideLoader();
    showToast('추출 실패: ' + e.message, 'error');
    console.error(e);
  }
}
