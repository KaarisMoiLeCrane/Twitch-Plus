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

  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'reload'});
  });
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

  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'reload'});
  });
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
