document.addEventListener("DOMContentLoaded", async () => {
  console.log("WikiRater popup yüklendi");
  
  // Elementleri seç
  const translateBtn = document.getElementById("translateBtn");
  const restoreBtn = document.getElementById("restoreBtn");
  const autoTranslate = document.getElementById("autoTranslate");
  const statusText = document.getElementById("statusText");
  const toggleContainer = document.querySelector(".toggle-container");
  const statusDot = document.querySelector(".status-dot");

  if (!translateBtn) {
    console.error("translateBtn bulunamadı!");
    return;
  }

  // Storage'dan ilk durumu yükle
  const { translatorActive = true, autoTranslate: autoTrans = false } =
    await chrome.storage.local.get(["translatorActive", "autoTranslate"]);
  setToggleUI(translatorActive);
  if (autoTranslate) autoTranslate.checked = autoTrans;

  // Toggle için (Açık/Kapalı)
  if (toggleContainer) {
    toggleContainer.addEventListener("click", async () => {
      const isActive = statusText.textContent.includes("Kapalı");
      await chrome.storage.local.set({ translatorActive: isActive });
      setToggleUI(isActive);
      chrome.runtime.sendMessage({ action: "updateIcon", active: isActive });
    });
  }

  // Otomatik çeviri checkbox
  if (autoTranslate) {
    autoTranslate.addEventListener("change", async () => {
      await chrome.storage.local.set({ autoTranslate: autoTranslate.checked });
    });
  }

  // ⚡ SAYFAYI ÇEVİR BUTONU - DÜZELTİLMİŞ!
  translateBtn.addEventListener("click", async () => {
    console.log("Çevir butonuna basıldı!");
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log("Aktif tab bulundu:", tab.id);
      
      // Content script'e mesaj gönder
      chrome.tabs.sendMessage(tab.id, { action: "translatePage" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Mesaj gönderme hatası:", chrome.runtime.lastError);
          alert("Extension content script yüklenemedi. Sayfayı yenileyin ve tekrar deneyin.");
        } else {
          console.log("Çeviri mesajı gönderildi");
        }
      });
      
      translateBtn.textContent = "Çeviriliyor...";
      translateBtn.disabled = true;
      
      setTimeout(() => {
        translateBtn.textContent = "sayfayı çevir";
        translateBtn.disabled = false;
        if (restoreBtn) restoreBtn.disabled = false;
      }, 3000);
      
    } catch (error) {
      console.error("Çevir butonu hatası:", error);
      alert("Hata: " + error.message);
    }
  });

  // Orijinali Göster butonu
  if (restoreBtn) {
    restoreBtn.addEventListener("click", async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { action: "restorePage" });
      restoreBtn.disabled = true;
    });
  }

  // Toggle ve status güncelle
  function setToggleUI(active) {
    const toggle = document.getElementById("translatorToggle");
    if (active) {
      statusText.textContent = "Çevirici Açık";
      statusDot.classList.remove("status-inactive");
      statusDot.classList.add("status-active");
      if (toggle) toggle.classList.add("active");
    } else {
      statusText.textContent = "Çevirici Kapalı";
      statusDot.classList.remove("status-active");
      statusDot.classList.add("status-inactive");
      if (toggle) toggle.classList.remove("active");
    }
  }
});
