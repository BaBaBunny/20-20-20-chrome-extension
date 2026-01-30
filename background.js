const OFFSCREEN_PATH = "audio/offscreen.html"
const REST_TIME_MIN = 1 / 60 * 20; //20 seconds
const WORK_TIME_MIN = 0.1; //20 minutes

//refreshes everything on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.clear();
});

async function createOffscreenDocument(path) {
  // Check all windows controlled by the service worker to see if one
  // of them is the offscreen document with the given path
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_PATH)]
  });

  if (existingContexts.length > 0)
    return;

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'notification sound for timer',
  });
}

// handles tab switching on same window
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const data = await chrome.storage.local.get(["lockedTabId", "lockedWindowId"]);

  if (data.lockedTabId && activeInfo.tabId !== data.lockedTabId) {
    chrome.tabs.update(data.lockedTabId, {active: true}).catch(() => {});

    if(data.lockedWindowId) {
      chrome.windows.update(data.lockedWindowId, {focused: true}).catch(() => {});
    }
  }
});

// handles window switching like alt-tab or multiple monitors
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE)
    return;

  const data = await chrome.storage.local.get(["lockedTabId", "lockedWindowId"]);

  if (data.lockedWindowId !== null && windowId !== data.lockedWindowId) {
    chrome.windows.update(data.lockedWindowId, {focused: true}).catch(() => {});
    chrome.tabs.update(data.lockedTabId, {active: true}).catch(() => {});
  }
});

// disables the locked tabs/windows
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const data = await chrome.storage.local.get("lockedTabId");

  if (tabId === data.lockedTabId) {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    
    if (tabs.length > 0) {
      const newTab = tabs[0]

      await chrome.storage.local.set({
        lockedTabId: newTab.id,
        lockedWindowId: newTab.windowId
      });

      injectScript(showRestScreen);
    } else {
      await chrome.storage.local.clear();
    }
  }
});

// timer handlings
chrome.alarms.onAlarm.addListener(async (alarm) => {
    await createOffscreenDocument();

    if (alarm.name === "workTimer") {
      //plays ding sound
      chrome.runtime.sendMessage({
        action: "play_audio",
        source: chrome.runtime.getURL("assets/ding.mp3")
      });

      //notification popup
      chrome.notifications.create({
        type: "basic",
        iconUrl: "assets/icon.png",
        title: "Time to rest your eyes!",
        message: "Look at something 20 feet away for 20 seconds.",
        priority: 2
      });

      //handles the locking for current tab & window
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      if (tabs.length > 0) {
        const tab = tabs[0];

        await chrome.storage.local.set({
          lockedTabId: tab.id,
          lockedWindowId: tab.windowId
        });

        injectScript(showRestScreen);
      }

      chrome.alarms.create("restTimer", {delayInMinutes: REST_TIME_MIN});
    }

    //ends rest
    else if (alarm.name === "restTimer") {
      chrome.runtime.sendMessage({
          action: "play_audio",
          source: chrome.runtime.getURL("assets/ding.mp3")
      }).catch(() => {});

      chrome.notifications.create({
          type: "basic",
          iconUrl: "assets/icon.png",
          title: "Break Over",
          message: "Good work. Back to work now!",
          priority: 2
      });

      injectScript(removeRestScreen);

      await chrome.storage.local.clear();

      chrome.alarms.create("workTimer", {delayInMinutes: WORK_TIME_MIN});
  }
});


//INJECTION
function injectScript(func) {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (!tabs || tabs.length === 0)
      return;

    const currentTab = tabs[0];

    //checks to see if we are on chrome pages as we cannot inject scripts there
    if (!currentTab.url || currentTab.url.startsWith("chrome://"))
      return;

    chrome.scripting.insertCSS({
      target: {tabId: currentTab.id},
      files: ["overlay.css"]
    }).catch(() => {});

    chrome.scripting.executeScript({
      target: {tabId: currentTab.id},
      func: func
    }).catch(() => {});
  });
}


//INJECTION functions
function showRestScreen() {
  if (document.getElementById("eyeRestOverlay"))
    return;

  const overlay = document.createElement("div");
  overlay.id = "eyeRestOverlay";

  const title = document.createElement("h1");
  title.innerText = "Look Away";

  const subtitle = document.createElement("p");
  subtitle.innerText = "Your screen is paused for 20 seconds. Look away!";

  overlay.appendChild(title);
  overlay.appendChild(subtitle);
  document.body.appendChild(overlay);

  document.body.classList.add("eyeRestActive");
  document.body.style.setProperty("overflow", "hidden", "important");
}

function removeRestScreen() {
  const overlay = document.getElementById("eyeRestOverlay");
  if (overlay) {
    overlay.remove();
    document.body.classList.remove("eyeRestActive");
    document.body.style.removeProperty("overflow");
  }
}