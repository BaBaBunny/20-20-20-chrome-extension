const OFFSCREEN_PATH = "audio/offscreen.html"
const WORK_TIME_MIN = 2;
const REST_TIME_MIN = 1 / 60 * 20; //20 seconds

let creating; // A global promise to avoid concurrency issues

async function createOffscreenDocument(path) {
  // Check all windows controlled by the service worker to see if one
  // of them is the offscreen document with the given path
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_PATH)]
  });

  if (existingContexts.length > 0) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'notification sound for timer',
  });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
    await createOffscreenDocument();
    if (alarm.name === "workTimer") {
      chrome.runtime.sendMessage({
        action: "play_audio",
        source: chrome.runtime.getURL("assets/ding.mp3")
      });

      chrome.notifications.create({
        type: "basic",
        iconUrl: "assets/icon.png",
        title: "Time to rest your eyes!",
        message: "Look at something 20 feet away for 20 seconds.",
        priority: 2
      });

      chrome.alarms.create("restTimer", {delayInMinutes: REST_TIME_MIN});
    }

    else if (alarm.name === "restTimer") {
      chrome.runtime.sendMessage({
          action: "play_audio",
          source: chrome.runtime.getURL("assets/ding.mp3")
      });

      chrome.notifications.create({
          type: "basic",
          iconUrl: "assets/icon.png",
          title: "Break Over",
          message: "Good work. Back to work now!",
          priority: 2
      });

      chrome.alarms.create("workTimer", {delayInMinutes: WORK_TIME_MIN});
  }
});