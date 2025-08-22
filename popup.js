document.addEventListener("DOMContentLoaded", async () => {
  // Elementleri seç
  const translateBtn = document.getElementById("translateBtn");
  const restoreBtn = document.getElementById("restoreBtn");
  const autoTranslate = document.getElementById("autoTranslate");
  const statusText = document.getElementById("statusText");
  const toggleContainer = document.querySelector(".toggle-container");
  const statusDot = document.querySelector(".status-dot");

  // Storage'dan ilk durumu yükle
  const { translatorActive = true, autoTranslate: autoTrans = false } =
    await chrome.storage.local.get(["translatorActive", "autoTranslate"]);
  setToggleUI(translatorActive);
  autoTranslate.checked = autoTrans;

  // Toggle için (Açık/Kapalı)
  toggleContainer.addEventListener("click", async () => {
    const isActive = statusText.textContent.includes("Kapalı");
    await chrome.storage.local.set({ translatorActive: isActive });
    setToggleUI(isActive);
    chrome.runtime.sendMessage({ action: "updateIcon", active: isActive });
  });

  // Otomatik çeviri checkbox
  autoTranslate.addEventListener("change", async () => {
    await chrome.storage.local.set({ autoTranslate: autoTranslate.checked });
  });

  // Sayfayı çevir butonu
  translateBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.runtime.sendMessage({ action: "translatePage", tabId: tab.id });
    restoreBtn.disabled = false;
  });

  // Orijinali Göster butonu
  restoreBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.runtime.sendMessage({ action: "restorePage", tabId: tab.id });
    restoreBtn.disabled = true;
  });

  // Toggle ve status güncelle
  function setToggleUI(active) {
    if (active) {
      statusText.textContent = "Çevirici Açık";
      statusDot.classList.remove("status-inactive");
      statusDot.classList.add("status-active");
    } else {
      statusText.textContent = "Çevirici Kapalı";
      statusDot.classList.remove("status-active");
      statusDot.classList.add("status-inactive");
    }
  }
});
