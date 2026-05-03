chrome.runtime.onInstalled.addListener(function onInstalled() {
    chrome.storage.local.set({
        ignouExtensionInstalledAt: Date.now(),
    });
});

chrome.tabs.onUpdated.addListener(
    function onTabUpdated(tabId, changeInfo, tab) {
        if (changeInfo.status !== "complete" || !tab.url) return;
        if (!/^https?:\/\/gradecard\.ignou\.ac\.in\//.test(tab.url)) return;
        chrome.action.enable(tabId);
    },
);
