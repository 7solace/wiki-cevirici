console.log("🚀 WikiRater VİZUEL çeviri yüklendi!");

// GEMİNİ API KEY - BURAYA YAZ!
const GEMINI_API_KEY = "AIzaSyDxkdY9les2qp-cILuO3HI2MVa6UCGUdC4"; // ⬅️ BURAYA API KEY'İNİ YAZ

let isTranslated = false;
let originalTexts = new Map(); // Orijinal metinleri sakla

// Notification göster
function showNotif(msg, type = 'info') {
  const notif = document.createElement('div');
  notif.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 999999;
    background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white; padding: 15px 25px; border-radius: 10px;
    font: bold 16px Arial; box-shadow: 0 5px 15px rgba(0,0,0,0.3);
  `;
  notif.textContent = msg;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

// Tek metin çevir
async function translateSingle(text) {
  if (!text || text.length < 3 || !/[a-zA-Z]/.test(text)) return text;
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Translate to Turkish only, no explanations: "${text}"`
          }]
        }]
      })
    });

    const data = await response.json();
    const translated = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return translated || text;
    
  } catch (error) {
    console.error('Çeviri hatası:', error);
    return text;
  }
}

// ⚡ VİZUEL ÇEVİRİ - GÖRÜNÜR OLACAK!
async function visualTranslate() {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes("YOUR-API-KEY")) {
    showNotif("❌ API Key ekle!", 'error');
    return;
  }

  if (isTranslated) {
    // GERİ DÖNDÜR
    originalTexts.forEach((originalText, element) => {
      element.textContent = originalText;
    });
    originalTexts.clear();
    isTranslated = false;
    showNotif("✅ Orijinal metinler geri döndürüldü");
    return;
  }

  showNotif("🚀 Görünür çeviri başlıyor...");
  
  try {
    // Text elementleri bul - P, DIV, SPAN, H1-H6, LI
    const selectors = 'p, div, span, h1, h2, h3, h4, h5, h6, li, td, th, a, strong, em, b, i';
    const elements = document.querySelectorAll(selectors);
    
    const textElements = [];
    elements.forEach(el => {
      // Sadece direkt text içeren elementler
      if (el.childNodes.length === 1 && el.firstChild.nodeType === Node.TEXT_NODE) {
        const text = el.textContent.trim();
        if (text.length > 2 && /[a-zA-Z]/.test(text) && !text.includes('©') && !text.includes('®')) {
          textElements.push(el);
        }
      }
    });
    
    console.log(`${textElements.length} element bulundu`);
    
    if (textElements.length === 0) {
      showNotif("❌ Çevrilecek element bulunamadı!", 'error');
      return;
    }
    
    // Paralel çeviri - VİZUEL güncellemeler
    const batchSize = 8;
    let completed = 0;
    
    for (let i = 0; i < textElements.length; i += batchSize) {
      const batch = textElements.slice(i, i + batchSize);
      
      const promises = batch.map(async (element) => {
        const originalText = element.textContent.trim();
        
        // Orijinal metni sakla
        originalTexts.set(element, originalText);
        
        // Çevir
        const translatedText = await translateSingle(originalText);
        
        // VİZUEL güncelleme - HEMEN görünür!
        if (translatedText !== originalText) {
          element.textContent = translatedText;
          
          // Renkli highlight - çevirildiğini göster
          element.style.backgroundColor = '#ffffcc';
          element.style.transition = 'background-color 0.5s';
          
          setTimeout(() => {
            element.style.backgroundColor = '';
          }, 1000);
        }
        
        completed++;
        console.log(`✅ Çevrildi: ${originalText.substring(0, 30)}... → ${translatedText.substring(0, 30)}...`);
      });
      
      await Promise.all(promises);
      
      // Progress
      const progress = Math.round((completed / textElements.length) * 100);
      showNotif(`⚡ %${progress} tamamlandı`);
      
      // Kısa bekleme
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    isTranslated = true;
    showNotif(`🎉 ${textElements.length} element çevrildi!`, 'success');
    
  } catch (error) {
    console.error('Hata:', error);
    showNotif("❌ Hata: " + error.message, 'error');
  }
}

// Popup'tan mesaj al
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translatePage') {
    visualTranslate();
    sendResponse({success: true});
  } else if (request.action === 'restorePage') {
    if (isTranslated) {
      originalTexts.forEach((originalText, element) => {
        element.textContent = originalText;
      });
      originalTexts.clear();
      isTranslated = false;
      showNotif("✅ Orijinal geri döndürüldü");
    }
    sendResponse({success: true});
  }
});

// Kısayol
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.altKey && e.key === 't') {
    e.preventDefault();
    visualTranslate();
  }
});

showNotif("💡 VİZUEL çeviri hazır!");
