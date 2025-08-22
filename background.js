chrome.runtime.onInstalled.addListener(() => {
  console.log('Wiki Çevirici uzantısı yüklendi');
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const url = tab.url;
    // Wikipedia, Fandom ve Wikia siteleri için aktif yap
    if ((url.includes('wikipedia.org/wiki/') || 
         url.includes('fandom.com/wiki/') || 
         url.includes('wikia.com/wiki/'))) {
      chrome.action.setBadgeText({text: '✓', tabId: tabId});
      chrome.action.setBadgeBackgroundColor({color: '#10b981', tabId: tabId});
    } else {
      chrome.action.setBadgeText({text: '', tabId: tabId});
    }
  }
});