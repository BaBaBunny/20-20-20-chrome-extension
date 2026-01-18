chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "restReminder") {
        chrome.notifications.create({
            type: "basic",
            iconUrl: "icon.png",
            title: "Time to rest your eyes!",
            message: "Look at something 20 feet away for 20 seconds.",
            priority: 2
        });
    }
});