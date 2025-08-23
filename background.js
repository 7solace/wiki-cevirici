console.log("🚀 WikiRater background yüklendi!");

// api anahtarı
const DEEPL_API_KEY = '94924efc-e35e-40c9-9e1b-dd2d82a274c3:fx'; // DeepL API anahtarınızı buraya ekleyin
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate'; // Ücretsiz sürüm için API URL'si

// DeepL API çağrısı
async function translateTextWithDeepL(text) {
  if (!text || !text.trim()) {
    return text;
  }
  
  if (!DEEPL_API_KEY || DEEPL_API_KEY === "YOUR_DEEPL_API_KEY") {
    console.error("DeepL API anahtarı girilmemiş. Lütfen background.js dosyasına anahtarınızı ekleyin.");
    // Hata durumunda kullanıcıyı bilgilendirmek için bir mesaj döndürebiliriz.
    return "HATA: DeepL API Anahtarı Eksik";
  }

  try {
    const response = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        target_lang: 'TR',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('DeepL API Hatası:', response.status, errorData.message);
      return `API Hatası: ${errorData.message}`;
    }

    const data = await response.json();
    if (data.translations && data.translations.length > 0) {
      return data.translations[0].text;
    }
    return text;
  } catch (error) {
    console.error('Background DeepL çeviri hatası:', error);
    return text;
  }
}

// Google Translate API kullanarak metin çevirisi
async function translateText(text) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tr&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return data[0][0][0];
    }
    return text;
  } catch (error) {
    console.error('Background çeviri hatası:', error);
    return text;
  }
}

async function translateBatch(texts) {
  try {
    const response = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'text': texts,
        'target_lang': 'TR',
        'source_lang': 'EN',
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data && data.translations) {
      return data.translations.map(t => t.text);
    }
    return texts;
  } catch (error) {
    console.error('DeepL API toplu çeviri hatası:', error);
    return texts;
  }
}

// Content script ve popup mesajlarını dinle
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate") {
    translateText(request.text).then(sendResponse);
    return true; // Asenkron yanıt için önemli
  } else if (request.action === "translateBatch") {
    translateBatch(request.texts).then(sendResponse);
    return true; // Asenkron yanıt için önemli
  }
  
  // Diğer mesajlar için ( ikon güncelleme)
  if (request.action === "updateIcon") {
    const path = request.active ? "icons/icon128.png" : "icons/icon128_disabled.png";
    chrome.action.setIcon({ path: path });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension yüklendi');
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url.includes('wikipedia.org')) {
    chrome.tabs.executeScript(tabId, { file: 'content.js' }, () => {
      if (chrome.runtime.lastError) {
        console.error('Content script yükleme hatası:', chrome.runtime.lastError);
      } else {
        console.log('Content script başarıyla yüklendi');
      }
    });
  }
});
