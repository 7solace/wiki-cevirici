// Background script for WikiRater

// Install event
chrome.runtime.onInstalled.addListener(() => {
    console.log('WikiRater çevirici yüklendi!');
    
    // Set default values
    chrome.storage.local.set({
        translatorActive: true,
        autoTranslate: false
    });
});

// Update icon based on translator state
function updateIcon(active) {
    const iconPath = active ? {
        "16": "icon16.png",
        "48": "icon48.png", 
        "128": "icon128.png"
    } : {
        "16": "icon16_inactive.png",
        "48": "icon48_inactive.png",
        "128": "icon128_inactive.png"
    };
    
    // If you don't have separate inactive icons, you can use text badge
    chrome.action.setBadgeText({
        text: active ? "" : "OFF"
    });
    
    chrome.action.setBadgeBackgroundColor({
        color: active ? "#10b981" : "#ef4444"
    });
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'updateIcon':
            updateIcon(request.active);
            break;
    }
});

// Tab activation handler - update icon based on stored state
chrome.tabs.onActivated.addListener(async () => {
    const result = await chrome.storage.local.get(['translatorActive']);
    updateIcon(result.translatorActive !== false);
});
