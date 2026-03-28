// === Gemini API Service ===
// 프론트엔드에서 직접 Gemini API를 호출하여 이미지에서 단어 추출

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const EXTRACTION_PROMPT = `당신은 영어 단어장 이미지 분석 전문가입니다.
이 이미지는 영어 단어 학습 교재의 페이지 사진입니다.
이미지에서 학습 대상으로 의도된 영어 단어들만 추출해주세요.

각 단어에 대해 다음 정보를 JSON 형식으로 반환하세요:
- word: 영단어 (소문자)
- pronunciation: 발음기호 (이미지에 있으면 그대로, 없으면 표준 IPA)
- part_of_speech: 품사 (n. / v. / adj. / adv. / conj. 등)
- meaning_ko: 한국어 뜻 (간결하게)
- example_sentence: 영어 예문 1개
- derivatives: 파생어/관련어 배열 (있으면)

중요 규칙:
1. 학습 대상 단어만 추출 (관사, 전치사 등 기본 단어는 제외)
2. 이미지에 보이는 정보를 우선 사용
3. 이미지에 없는 정보는 일반 사전 정보로 보완
4. 반드시 유효한 JSON 배열로 반환

응답 형식 (JSON 배열만 반환, 다른 텍스트 없이):
[
  {
    "word": "expect",
    "pronunciation": "[ikspékt]",
    "part_of_speech": "v.",
    "meaning_ko": "기대하다, 예상하다",
    "example_sentence": "The team expects to make the playoffs this year.",
    "derivatives": ["expectation", "expected"]
  }
]`;

export async function extractWordsFromImages(images, apiKey) {
  if (!apiKey) throw new Error('Gemini API 키가 필요합니다.');
  if (!images || images.length === 0) throw new Error('이미지가 필요합니다.');

  const parts = [{ text: EXTRACTION_PROMPT }];

  for (const img of images) {
    const base64 = img.data.split(',')[1];
    parts.push({
      inline_data: {
        mime_type: img.type || 'image/jpeg',
        data: base64
      }
    });
  }

  const response = await fetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `API 오류: ${response.status}`);
  }

  const data = await response.json();

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('API 응답에서 텍스트를 찾을 수 없습니다.');

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const words = JSON.parse(cleaned);
    if (!Array.isArray(words)) throw new Error('배열이 아닙니다');
    return words.map(w => ({
      word: (w.word || '').toLowerCase().trim(),
      pronunciation: w.pronunciation || '',
      part_of_speech: w.part_of_speech || '',
      meaning_ko: w.meaning_ko || '',
      example_sentence: w.example_sentence || '',
      derivatives: Array.isArray(w.derivatives) ? w.derivatives : []
    })).filter(w => w.word.length > 0);
  } catch (e) {
    console.error('Parse error:', text);
    throw new Error('추출 결과 파싱 실패: ' + e.message);
  }
}
