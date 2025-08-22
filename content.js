// API Configuration
const API_BASE_URL = 'https://turkish-wiki.preview.emergentagent.com/api';

// Translation state
let isTranslatorActive = true;
let isPageTranslated = false;
let originalContent = null;

// Get translator state from storage
chrome.storage.local.get(['translatorActive'], (result) => {
  isTranslatorActive = result.translatorActive !== false;
  updatePageIcon();
});

// Listen for state changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.translatorActive) {
    isTranslatorActive = changes.translatorActive.newValue;
    updatePageIcon();
    
    if (!isTranslatorActive && isPageTranslated) {
      restoreOriginalContent();
    }
  }
});

// Update page icon based on state
function updatePageIcon() {
  chrome.runtime.sendMessage({
    action: 'updateIcon',
    active: isTranslatorActive
  });
}

// Translation function with batching
async function translateText(text) {
  try {
    // Skip very short or non-English text
    if (text.length < 3 || !/[a-zA-Z]/.test(text)) {
      return text;
    }

    const response = await fetch(`${API_BASE_URL}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: text.trim() })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.translated_text;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Return original if translation fails
  }
}

// Split text into smaller chunks for API limits
function splitTextIntoChunks(text, maxLength = 400) {
  const sentences = text.split(/([.!?]+\s+)/);
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Get all text nodes in the page
function getTextNodes(element) {
  const textNodes = [];
  
  function traverse(node) {
    // Skip script, style, and other non-visible elements
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      if (['script', 'style', 'noscript', 'iframe', 'object'].includes(tagName)) {
        return;
      }
      
      for (let child of node.childNodes) {
        traverse(child);
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text.length > 0 && /[a-zA-Z]/.test(text)) {
        textNodes.push(node);
      }
    }
  }
  
  traverse(element);
  return textNodes;
}

// Save original content before translation
function saveOriginalContent() {
  if (!originalContent) {
    originalContent = document.body.innerHTML;
  }
}

// Restore original content
function restoreOriginalContent() {
  if (originalContent) {
    document.body.innerHTML = originalContent;
    isPageTranslated = false;
    
    // Show notification
    showNotification('Sayfa orijinal haline döndürüldü', 'info');
  }
}

// Show notification
function showNotification(message, type = 'success') {
  // Remove existing notifications
  const existing = document.querySelectorAll('.translator-notification');
  existing.forEach(el => el.remove());

  const notification = document.createElement('div');
  notification.className = 'translator-notification';
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : type === 'info' ? '#3b82f6' : '#ef4444'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-family: 'Segoe UI', sans-serif;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease-out;
    ">
      ${message}
    </div>
  `;
  
  // Add animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(notification);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => notification.remove(), 300);
    }
  }, 3000);
}

// Translate entire page
async function translatePage() {
  if (!isTranslatorActive) {
    showNotification('Çeviri kapalı Popup\'tan açabilirsiniz.', 'info');
    return;
  }

  if (isPageTranslated) {
    restoreOriginalContent();
    return;
  }

  showNotification('sayfa çeviriliyor bekleyin.', 'info');
  saveOriginalContent();

  try {
    const textNodes = getTextNodes(document.body);
    let processedNodes = 0;
    const totalNodes = textNodes.length;
    
    // Process nodes in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < textNodes.length; i += batchSize) {
      const batch = textNodes.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (node) => {
        const originalText = node.textContent;
        
        if (originalText.length > 400) {
          // Split long text into chunks
          const chunks = splitTextIntoChunks(originalText);
          const translatedChunks = [];
          
          for (const chunk of chunks) {
            const translated = await translateText(chunk);
            translatedChunks.push(translated);
            
            // Small delay between chunks
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          node.textContent = translatedChunks.join(' ');
        } else {
          const translated = await translateText(originalText);
          node.textContent = translated;
        }
        
        processedNodes++;
      }));
      
      // Progress update and delay between batches
      if (i % 10 === 0) {
        const progress = Math.round((processedNodes / totalNodes) * 100);
        showNotification(`Çeviri ilerliyor: %${progress}`, 'info');
      }
      
      // Delay between batches to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    isPageTranslated = true;
    showNotification('başarıyla çevirildi', 'success');
    
  } catch (error) {
    console.error('Page translation error:', error);
    showNotification('Çeviri sırasında hata oluştu', 'error');
    restoreOriginalContent();
  }
}

// Keyboard shortcuts - GÜNCELLENMIŞ KISAYOLLAR
document.addEventListener('keydown', async function(e) {
  // Ctrl+Alt+T for full page translation
  if (e.ctrlKey && e.altKey && e.key === 't') {
    e.preventDefault();
    await translatePage();
  }
  
  // Ctrl+Alt+R to restore original
  if (e.ctrlKey && e.altKey && e.key === 'r') {
    e.preventDefault();
    restoreOriginalContent();
  }
});

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'translatePage':
      translatePage();
      break;
    case 'restorePage':
      restoreOriginalContent();
      break;
    case 'getStatus':
      sendResponse({
        active: isTranslatorActive,
        translated: isPageTranslated
      });
      break;
  }
});

// Auto-translate on page load if enabled
chrome.storage.local.get(['autoTranslate'], (result) => {
  if (result.autoTranslate && isTranslatorActive) {
    // Wait for page to fully load
    setTimeout(() => {
      if (document.readyState === 'complete') {
        translatePage();
      } else {
        window.addEventListener('load', () => {
          setTimeout(translatePage, 1000);
        });
      }
    }, 2000);
  }
});

console.log('WikiRater kuruldu Ctrl+Alt+T ile çevir \nCtrl+Alt+R ile orijinali göster');
