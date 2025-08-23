document.addEventListener("DOMContentLoaded", async () => {
  console.log("WikiRater popup yüklendi");
  
  const translateBtn = document.getElementById("translateBtn");
  const restoreBtn = document.getElementById("restoreBtn");
  const autoTranslate = document.getElementById("autoTranslate");
  const statusText = document.getElementById("statusText");
  const toggleContainer = document.querySelector(".toggle-container");
  const statusDot = document.querySelector(".status-dot");
  const progressText = document.createElement("div");
  progressText.id = "progressText";
  progressText.style.textAlign = "center";
  progressText.style.marginBottom = "10px";
  translateBtn.parentNode.insertBefore(progressText, translateBtn);

  if (!translateBtn) {
    console.error("translateBtn bulunamadı!");
    return;
  }

  const { translatorActive = true, autoTranslate: autoTrans = false } =
    await chrome.storage.local.get(["translatorActive", "autoTranslate"]);
  setToggleUI(translatorActive);
  if (autoTranslate) autoTranslate.checked = autoTrans;

  if (toggleContainer) {
    toggleContainer.addEventListener("click", async () => {
      const isActive = statusText.textContent.includes("Kapalı");
      await chrome.storage.local.set({ translatorActive: isActive });
      setToggleUI(isActive);
      chrome.runtime.sendMessage({ action: "updateIcon", active: isActive });
    });
  }

  if (autoTranslate) {
    autoTranslate.addEventListener("change", async () => {
      await chrome.storage.local.set({ autoTranslate: autoTranslate.checked });
    });
  }

  translateBtn.addEventListener("click", async () => {
    console.log("Çevir butonuna basıldı!");
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log("Aktif tab bulundu:", tab.id);
      
      chrome.tabs.sendMessage(tab.id, { action: "checkContentScript" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Content script yüklenemedi:", chrome.runtime.lastError);
          alert("Extension content script yüklenemedi. Sayfayı yenileyin ve tekrar deneyin.");
        } else {
          chrome.tabs.sendMessage(tab.id, { action: "translatePage" });
        }
      });
      
    } catch (error) {
      console.error("Çevir butonu hatası:", error);
      alert("Hata: " + error.message);
    }
  });

  if (restoreBtn) {
    restoreBtn.addEventListener("click", async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { action: "restorePage" });
      restoreBtn.disabled = true;
    });
  }

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

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateProgress") {
      progressText.textContent = request.progress;
      if (request.progress.includes("Tamamlandı") || request.progress.includes("Hata")) {
        translateBtn.textContent = "Sayfayı Çevir";
        translateBtn.disabled = false;
        if (restoreBtn) restoreBtn.disabled = false;
      }
    }
  });
});
