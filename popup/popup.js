const alarmName = "restReminder";
const timerDuration = 20;

const timer = document.getElementById("timer");
const startButton = document.getElementById("startButton");
const resetButton = document.getElementById("resetButton");

let countdownInterval;

chrome.alarms.get(alarmName, (alarm) => {
    if (alarm) {
        startCountdownUI(alarm.scheduledTime);
    }
});

startButton.addEventListener("click", () => {
    chrome.alarms.create(alarmName, {
        delayInMinutes: timerDuration,
        periodInMinutes: timerDuration
    });

    const targetTime = Date.now() + timerDuration * 60 * 1000;
    startCountdownUI(targetTime);
});

resetButton.addEventListener("click", () => {
    chrome.alarms.clear(alarmName);
    clearInterval(countdownInterval);

    timer.textContent = "20:00";

    startButton.textContent = "Start Timer";
    startButton.disabled = false;
});

function startCountdownUI(targetTime) {
    startButton.textContent = "Timer Running...";
    startButton.disabled = true;

    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
        const timeLeft = targetTime - Date.now();

        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            timer.textContent = "00:00";
            startButton.textContent = "Start Timer";
            startButton.disabled = false;
            return;
        }

        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        timer.textContent =
            `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }, 1000);
}