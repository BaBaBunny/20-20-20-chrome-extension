const alarmName = "restReminder";
const timerDuration = 20;

const timer = document.getElementById("timer");
const button = document.getElementById("button");

chrome.alarms.get(alarmName, (alarm) => {
    if (alarm) {
        startCountdownUI(alarm.scheduledTime);
    }
});

button.addEventListener("click", () => {
    chrome.alarms.create(alarmName, {
        delayInMinutes: timerDuration,
        periodInMinutes: timerDuration
    });

    const targetTime = Date.now() + timerDuration * 60 * 1000;
    startCountdownUI(targetTime);
});

function startCountdownUI(targetTime) {
    button.textContent = "Timer Running...";
    button.disabled = true;

    const intervalID = setInterval(() => {
        const timeLeft = targetTime - Date.now();

        if (timeLeft <= 0) {
            clearInterval(intervalID);
            timer.textContent = "00:00";
            button.textContent = "Start Timer";
            button.disabled = false;
            return;
        }

        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        timer.textContent =
            `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }, 1000);
}