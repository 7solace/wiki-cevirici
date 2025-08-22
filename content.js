class WikipediaTranslator {
  constructor() {
    this.isTranslated = false;
    this.originalContent = new Map();
    this.translationCache = new Map();
    this.init();
  }

  init() {
    if (this.isWikiPage()) {
      this.createTranslationBanner();
      this.setupEventListeners();
    }
  }

  isWikiPage() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    // Wikipedia siteleri
    if (hostname.includes('wikipedia.org') && pathname.startsWith('/wiki/')) {
      return true;
    }
    
    // Fandom siteleri 
    if ((hostname.includes('fandom.com') || hostname.includes('wikia.com')) && pathname.startsWith('/wiki/')) {
      return true;
    }
    
    return false;
  }

  createTranslationBanner() {
    const banner = document.createElement('div');
    banner.id = 'wiki-translator-banner';
    banner.innerHTML = `
      <div class="translator-content">
        <div class="translator-info">
          <span class="translator-icon"></span>
          <span class="translator-text">Türkçe/'ye çevirelim mi?</span>
        </div>
        <div class="translator-actions">
          <button id="translate-btn" class="translate-button">
            <span class="btn-text">Türkçe'ye Çevir</span>
            <span class="btn-loading" style="display: none;">Çevriliyor...</span>
          </button>
          <button id="close-banner" class="close-button">×</button>
        </div>
      </div>
    `;
    document.body.insertBefore(banner, document.body.firstChild);
    document.body.style.paddingTop = '60px';
  }

  setupEventListeners() {
    const translateBtn = document.getElementById('translate-btn');
    if (translateBtn) {
      translateBtn.addEventListener('click', () => this.handleTranslation());
    }

    const closeBtn = document.getElementById('close-banner');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeBanner());
    }

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'z' && this.isTranslated) {
        this.revertTranslation();
      }
    });
  }

  async handleTranslation() {
    const button = document.getElementById('translate-btn');
    if (!button) return;

    if (this.isTranslated) {
      this.revertTranslation();
    } else {
      await this.translatePage();
    }
  }

  async translatePage() {
    const button = document.getElementById('translate-btn');
    const btnText = button.querySelector('.btn-text');
    const btnLoading = button.querySelector('.btn-loading');

    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    button.disabled = true;

    try {
      await this.translateElements();
      
      btnText.textContent = 'Orijinale Dön';
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
      button.disabled = false;
      this.isTranslated = true;

      const bannerText = document.querySelector('.translator-text');
      if (bannerText) {
        bannerText.textContent = 'Sayfa Türkçe\'ye çevrildi. Ctrl+Z ile orijinale dönebilirsiniz.';
      }

    } catch (error) {
      console.error('Çeviri hatası:', error);
      btnText.textContent = 'Çeviri Hatası';
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
      button.disabled = false;
      
      setTimeout(() => {
        btnText.textContent = 'Türkçe\'ye Çevir';
      }, 2000);
    }
  }

  async translateElements() {
    // Wikipedia ve Fandom için farklı selectors
    let selectors = [];
    
    if (window.location.hostname.includes('wikipedia.org')) {
      // Wikipedia selectors
      selectors = [
        '#mw-content-text h1', '#mw-content-text h2', '#mw-content-text h3',
        '#mw-content-text p', '#mw-content-text li', '#mw-content-text td',
        '.mw-parser-output > p', '.mw-parser-output > h2'
      ];
    } else if (window.location.hostname.includes('fandom.com') || window.location.hostname.includes('wikia.com')) {
      // Fandom selectors
      selectors = [
        '.page-content h1', '.page-content h2', '.page-content h3',
        '.page-content p', '.page-content li', '.page-content td',
        '.mw-parser-output p', '.mw-parser-output h2',
        '.portable-infobox .pi-data-value',
        '.WikiaArticle p', '.WikiaArticle h2',
        '[data-source] .pi-data-value'
      ];
    }

    const elements = [];
    selectors.forEach(selector => {
      const found = document.querySelectorAll(selector);
      elements.push(...found);
    });

    const uniqueElements = [...new Set(elements)];
    
    const batchSize = 10;
    for (let i = 0; i < uniqueElements.length; i += batchSize) {
      const batch = uniqueElements.slice(i, i + batchSize);
      await Promise.all(batch.map(element => this.translateElement(element)));
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  async translateElement(element) {
    if (!element || !element.textContent.trim()) return;
    if (element.textContent.trim().length < 3) return; // Çok kısa metinleri atla

    const originalText = element.textContent.trim();
    
    if (this.translationCache.has(originalText)) {
      const translation = this.translationCache.get(originalText);
      this.originalContent.set(element, originalText);
      element.textContent = translation;
      return;
    }

    try {
      const translation = await this.translateText(originalText);
      
      if (translation && translation !== originalText) {
        this.originalContent.set(element, originalText);
        this.translationCache.set(originalText, translation);
        element.textContent = translation;
      }
    } catch (error) {
      console.error('Element çeviri hatası:', error);
    }
  }

  async translateText(text) {
    // Genişletilmiş çeviri sözlüğü
    const mockTranslations = {
      'Wikipedia': 'Vikipedi', 'The': 'Bu', 'Article': 'Makale',
      'History': 'Tarih', 'Geography': 'Coğrafya', 'Culture': 'Kültür',
      'Science': 'Bilim', 'Technology': 'Teknoloji', 'Politics': 'Siyaset',
      'Economics': 'Ekonomi', 'Literature': 'Edebiyat', 'Art': 'Sanat',
      // Anime/Manga terimler
      'Jujutsu': 'Jujutsu', 'Kaisen': 'Kaisen', 'Satoru': 'Satoru',
      'Gojo': 'Gojo', 'Character': 'Karakter', 'Anime': 'Anime',
      'Manga': 'Manga', 'Series': 'Seri', 'Episode': 'Bölüm',
      'Chapter': 'Bölüm', 'Profile': 'Profil', 'Synopsis': 'Özet',
      'Gallery': 'Galeri', 'Image': 'Resim', 'Abilities': 'Yetenekler',
      'Powers': 'Güçler', 'Techniques': 'Teknikler'
    };

    if (mockTranslations[text]) {
      return mockTranslations[text];
    }

    return await this.callTranslationAPI(text);
  }

  async callTranslationAPI(text) {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (text.length < 3) return text;
    
    const commonWords = {
      'and': 've', 'the': '', 'of': 'nin', 'in': 'de', 'to': 'e',
      'is': 'dir', 'was': 'idi', 'are': 'dır', 'were': 'idiler',
      'He': 'O', 'She': 'O', 'This': 'Bu', 'That': 'O', 'his': 'onun',
      'her': 'onun', 'one': 'bir', 'main': 'ana', 'special': 'özel'
    };

    let translated = text;
    Object.entries(commonWords).forEach(([en, tr]) => {
      const regex = new RegExp(`\\b${en}\\b`, 'gi');
      translated = translated.replace(regex, tr);
    });

    return translated !== text ? `[ÇEVİRİ] ${translated}` : `[ÇEVİRİ] ${text}`;
  }

  revertTranslation() {
    this.originalContent.forEach((originalText, element) => {
      if (element && element.isConnected) {
        element.textContent = originalText;
      }
    });

    this.originalContent.clear();
    this.isTranslated = false;

    const button = document.getElementById('translate-btn');
    if (button) {
      const btnText = button.querySelector('.btn-text');
      if (btnText) {
        btnText.textContent = 'Türkçe\'ye Çevir';
      }
    }

    const bannerText = document.querySelector('.translator-text');
    if (bannerText) {
      bannerText.textContent = ' Türkçe\'ye çevirmek ister misiniz?';
    }
  }

  closeBanner() {
    const banner = document.getElementById('wiki-translator-banner');
    if (banner) {
      banner.remove();
      document.body.style.paddingTop = '0';
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new WikipediaTranslator();
  });
} else {
  new WikipediaTranslator();
}