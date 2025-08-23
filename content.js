console.log('Content script yüklendi');

let originalContents = new Map();
let isTranslated = false;
let isTranslating = false;
let translationBox = null;

// --- MESAJ DİNLEYİCİ ---
// Popup'tan gelen komutları dinler.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translatePage") {
    visualTranslate().then(() => {
      sendResponse({success: true});
    }).catch(error => {
      sendResponse({success: false, error: error.message});
    });
    return true; // Asenkron yanıt için önemli
  } else if (request.action === "restorePage") {
    // Orijinal sayfayı geri yükleme işlemi
    originalContents.forEach((originalText, element) => {
      element.textContent = originalText;
      element.classList.remove('wiki-translated');
    });
    originalContents.clear();
    isTranslated = false;
    showNotification("✅ Orijinal döndürüldü");
    sendResponse({success: true});
  } else if (request.action === "checkContentScript") {
    sendResponse({status: "loaded"});
  }
  // sendResponse'u eşzamansız kullanmak için true döndür
  return true; 
});


// --- ÇEVİRİ İSTEĞİ ---
// Background script'e çeviri için güvenli bir şekilde istek gönderir.
function translateText(text) {
  return new Promise((resolve) => {
    if (!text || !text.trim()) {
      return resolve(text);
    }
    chrome.runtime.sendMessage({ action: "translate", text: text }, (response) => {
      // "Context invalidated" hatasını burada yakalarız.
      if (chrome.runtime.lastError) {
        console.warn("Mesajlaşma hatası (context invalidated olabilir):",
          chrome.runtime.lastError.message);
        // Hata durumunda orijinal metni geri döndürerek akışın devam etmesini sağla.
        return resolve(text); 
      }
      
      if (response && response.success) {
        resolve(response.translatedText);
      } else {
        // API'den veya background'dan gelen diğer hatalar
        console.error("Çeviri API hatası:", response ? response.error : "Bilinmeyen hata");
        resolve(text); // Hata durumunda orijinal metinle devam et
      }
    });
  });
}

// --- BİLDİRİM FONKSİYONU ---
function showNotification(message, type = 'info', duration = 3000) {
  // Bildirim container'ını oluştur veya varsa al
  let notificationContainer = document.getElementById('wiki-notification-container');
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'wiki-notification-container';
    notificationContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      min-width: 200px;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.3s ease;
      pointer-events: none;
    `;
    document.body.appendChild(notificationContainer);
  }

  // Mevcut bildirimleri temizle
  const existingNotifications = notificationContainer.querySelectorAll('.wiki-notification');
  existingNotifications.forEach(el => el.remove());

  // Yeni bildirimi oluştur
  const notification = document.createElement('div');
  notification.className = 'wiki-notification';
  notification.textContent = message;
  notification.style.cssText = `
    background-color: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    margin-bottom: 8px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    animation: fadeInOut 0.3s ease forwards;
  `;

  // Animasyon tanımla
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translateY(-20px); }
      10% { opacity: 1; transform: translateY(0); }
      90% { opacity: 1; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(-20px); }
    }
  `;
  document.head.appendChild(style);

  notificationContainer.appendChild(notification);

  // Belirtilen süre sonra bildirimi kaldır
  setTimeout(() => {
    notification.remove();
  }, duration);
}

// --- ÇEVİRİ KUTUSU OLUŞTURMA ---
function createTranslationBox(text, referenceElement) {
  const box = document.createElement('div');
  box.classList.add('wiki-translation-box');
  box.innerHTML = `<p>${text}</p>`;
  
  const rect = referenceElement.getBoundingClientRect();
  box.style.position = 'absolute';
  box.style.left = `${rect.right + 10}px`;
  box.style.top = `${rect.top + window.scrollY}px`;
  box.style.width = '300px';
  
  document.body.appendChild(box);
  return box;
}

// --- ÇEVİRİ KUTUSU TEMİZLEME ---
function removeTranslationBoxes() {
  document.querySelectorAll('.wiki-translation-box').forEach(box => box.remove());
  translationBoxes.clear();
}

// --- METİN BULMA FONKSİYONU ---
function getAllTextElements() {
    const elements = [];
    const mainContent = document.querySelector('.mw-parser-output');
    if (!mainContent) return elements;

    mainContent.querySelectorAll('p, h1, h2, h3, h4, h5, h6').forEach(el => {
      if (!el.closest('.infobox, .navbox, .thumbcaption, .mw-editsection')) {
        elements.push(el);
      }
    });

    return elements;
}

// --- ANA ÇEVİRİ FONKSİYONU ---
async function visualTranslate() {
  if (isTranslating) {
    alert("Zaten çeviri yapılıyor...");
    return;
  }

  if (isTranslated) {
    removeTranslationBoxes();
    isTranslated = false;
    return;
  }

  isTranslating = true;
  removeTranslationBoxes();

  try {
    const elements = getAllTextElements();
    
    if (elements.length === 0) {
      alert("Çevrilecek metin yok!");
      isTranslating = false;
      return;
    }
    
    console.log(`🚀 ${elements.length} metin bulundu - Çeviri başlıyor!`);
    
    for (let el of elements) {
      const text = el.textContent.trim();
      if (text.length > 0) {
        try {
          const translation = await chrome.runtime.sendMessage({action: "translate", text: text});
          const box = createTranslationBox(translation, el);
          translationBoxes.set(el, box);
        } catch (error) {
          console.error('Metin çeviri hatası:', error);
        }
      }
    }
    
    isTranslated = true;
    isTranslating = false;
    
    console.log('Çeviri tamamlandı!');
    
  } catch (error) {
    console.error('❌ Ana çeviri hatası:', error);
    alert("Çeviri sırasında bir hata oluştu!");
    isTranslating = false;
  }
}

// --- SAYFA YÜKLENDİĞİNDE OTOMATİK ÇEVİRİ KONTROLÜ ---
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['translatorActive', 'autoTranslate'], (result) => {
      const { translatorActive = true, autoTranslate = false } = result;
      if (translatorActive && autoTranslate && !isTranslated) {
        console.log("Otomatik çeviri başlatılıyor...");
        setTimeout(() => {
          visualTranslate();
        }, 2000); // 2 saniye bekle
      }
    });
  });
} else {
  chrome.storage.local.get(['translatorActive', 'autoTranslate'], (result) => {
    const { translatorActive = true, autoTranslate = false } = result;
    if (translatorActive && autoTranslate && !isTranslated) {
      console.log("Otomatik çeviri başlatılıyor...");
      setTimeout(() => {
        visualTranslate();
      }, 2000); // 2 saniye bekle
    }
  });
}

// --- SCROLL OLAYI ---
window.addEventListener('scroll', () => {
  if (isTranslated) {
    translationBoxes.forEach((box, el) => {
      const rect = el.getBoundingClientRect();
      box.style.top = `${rect.top + window.scrollY}px`;
    });
  }
});

const translationBoxes = new Map();

console.log("WikiRater content script hazır");
