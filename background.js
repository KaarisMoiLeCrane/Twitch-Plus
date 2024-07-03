try {
  importScripts('/popup/chromeExtensionPopupDevTools-BackgroundScript.js');
} catch (e) {
  console.log(e);
}
let enable = false;

chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1]
  });
});

function enableBlocking() {
  if (enable) return;

  chrome.declarativeNetRequest.updateDynamicRules(
    {
      addRules: [
        {
          id: 1,
          priority: 1,
          action: {type: 'block'},
          condition: {
            urlFilter: 'https://assets.twitch.tv/assets/amazon-ivs-wasmworker.min-*.js',
            resourceTypes: ['script']
          }
        }
      ]
    },
    () => {
      enable = true;
    }
  );
}

function disableBlocking() {
  if (!enable) return;

  chrome.declarativeNetRequest.updateDynamicRules(
    {
      removeRuleIds: [1]
    },
    () => {
      enable = false;
    }
  );
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(message);
  if (message.action === 'enableBlocking') {
    enableBlocking();
    sendResponse('Blocking enabled');
  } else if (message.action === 'disableBlocking') {
    disableBlocking();
    sendResponse('Blocking disabled');
  }

  return true;
});
