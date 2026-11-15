const OFFSCREEN_PATH = "audio/offscreen.html"
const REST_TIME_MIN = (1 / 60) * 20; //20 seconds
export const WORK_TIME_MIN = 20; //in minutes

async function playReminderSound() {
  const { volume = 1 } = await chrome.storage.sync.get({ volume: 1 });
  chrome.runtime.sendMessage({
    action: "play_audio",
    source: chrome.runtime.getURL("assets/ding.mp3"),
    volume
  });
}

//refreshes everything on startups
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.clear();
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("workTimer", { delayInMinutes: WORK_TIME_MIN });
});

async function createOffscreenDocument(path) {
  // Check all windows controlled by the service worker to see if one of them is the offscreen document with the given path
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
  const data = await chrome.storage.local.get(["isResting", "lockedTabId", "lockedWindowId"]);

  if (!data.isResting) return;

  injectScript(showRestScreen, activeInfo.tabId);

  if (data.lockedTabId && activeInfo.tabId !== data.lockedTabId) {
    forceTabFocus(data.lockedTabId, data.lockedWindowId);
  }
});

// helper to bypass mouse clicking for tabs switching
function forceTabFocus(tabId, windowId, retries = 5) {
  chrome.tabs.update(tabId, {active: true}).catch(() => {
    if (retries > 0) {
    setTimeout(() => forceTabFocus(tabId, windowId, retries - 1), 100);
    }
  });

  if (windowId) {
    chrome.windows.update(windowId, {focused: true}).catch(() => {});
  }
}

// adds back the look away lock screen when page is refreshed or tab is restored (from commands: ctrl+R or ctrl+shift+T)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // triggers both when loading starts (DOM ready) and when complete
  if (changeInfo.status == "loading" || changeInfo.status == "complete") {
    const data = await chrome.storage.local.get(["isResting"]);
    if (data.isResting && tab.active) {
      injectScript(showRestScreen, tabId);
    }
  }
});

// handles window switching like alt-tab or multiple monitors
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;

  const data = await chrome.storage.local.get(["isResting", "lockedTabId", "lockedWindowId"]);

  if (data.isResting && data.lockedWindowId && windowId !== data.lockedWindowId) {
    forceTabFocus(data.lockedTabId, data.lockedWindowId);
  }
});

// handles the locked tabs/windows and closing tabs
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const data = await chrome.storage.local.get("isResting", "lockedTabId");

  if (data.isResting && tabId == data.isLockedTabId) {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    
    if (tabs.length > 0) {
      const newTab = tabs[0]

      await chrome.storage.local.set({
        lockedTabId: newTab.id,
        lockedWindowId: newTab.windowId
      });

      injectScript(showRestScreen, newTab.id);
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
      await playReminderSound();

      //notification popup
      chrome.notifications.create({
        type: "basic",
        iconUrl: "assets/eye128.png",
        title: "Time to rest your eyes!",
        message: "Look at something 20 feet away for 20 seconds.",
        priority: 2
      });

      //handles the locking for current tab & window
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      if (tabs.length > 0) {
        const tab = tabs[0];

        await chrome.storage.local.set({
          isResting: true,
          lockedTabId: tab.id,
          lockedWindowId: tab.windowId
        });

        injectScript(showRestScreen, tab.id);
      } else {
        await chrome.storage.local.set({isResting: true});
      }

      chrome.alarms.create("restTimer", {delayInMinutes: REST_TIME_MIN});
    }

    //ends rest
    else if (alarm.name === "restTimer") {
      await playReminderSound();

      chrome.notifications.create({
          type: "basic",
          iconUrl: "assets/eye128.png",
          title: "Break Over",
          message: "Good rest. Back to work now!",
          priority: 2
      });

      await clearRestScreenFromAllTabs();
      await chrome.storage.local.clear();

      chrome.alarms.create("workTimer", {delayInMinutes: WORK_TIME_MIN});
  }
});

// helper function to clean up overlay from other tabs that got locked during the break
async function clearRestScreenFromAllTabs() {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id && tab.url && !tab.url.startsWith("chrome://")) {
      injectScript(removeRestScreen, tab.id);
    }
  }
}

//INJECTION
async function injectScript(func, tabId) {
  let targetTabId = tabId;

  if (targetTabId === undefined) {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    targetTabId = tabs[0]?.id;
  }

  if (targetTabId === undefined) {
    console.warn("Unable to inject the break overlay: no target tab found.");
    return;
  }

  try {
    await chrome.scripting.insertCSS({
      target: {tabId: targetTabId},
      files: ["overlay.css"]
    });

    await chrome.scripting.executeScript({
      target: {tabId: targetTabId},
      func
    });
  } catch (error) {
    console.error(`Unable to inject the break overlay into tab ${targetTabId}:`, error);
  }
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "reset_timer") {
    chrome.alarms.clearAll();
    injectScript(removeRestScreen);
    
    chrome.storage.local.clear();
  }
});