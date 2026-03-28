// === TTS Service (Web Speech API) ===

let voices = [];
let preferredVoice = null;

function loadVoices() {
  voices = speechSynthesis.getVoices();
  // 영어 음성 우선순위: en-US > en-GB > en
  preferredVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) ||
                   voices.find(v => v.lang === 'en-US') ||
                   voices.find(v => v.lang === 'en-GB') ||
                   voices.find(v => v.lang.startsWith('en'));
}

if (typeof speechSynthesis !== 'undefined') {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

export function speak(text, rate = 0.9) {
  if (!text || typeof speechSynthesis === 'undefined') return;

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  utterance.pitch = 1;
  utterance.volume = 1;

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  return new Promise((resolve) => {
    utterance.onend = resolve;
    utterance.onerror = resolve;
    speechSynthesis.speak(utterance);
  });
}

export function speakSlow(text) {
  return speak(text, 0.6);
}

export function stopSpeaking() {
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.cancel();
  }
}

export function isSpeaking() {
  return typeof speechSynthesis !== 'undefined' && speechSynthesis.speaking;
}

export function getTtsRate() {
  return parseFloat(localStorage.getItem('vocasnap_tts_rate') || '0.9');
}

export function setTtsRate(rate) {
  localStorage.setItem('vocasnap_tts_rate', String(rate));
}
