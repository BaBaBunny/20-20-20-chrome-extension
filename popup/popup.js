const alarmName = "restReminder";
const timerDuration = 0.1;

const timer = document.getElementById("timer");
const startButton = document.getElementById("startButton");
const resetButton = document.getElementById("resetButton");

let countdownInterval;

const savedTargetTime = localStorage.getItem("targetTime");
if (savedTargetTime) {
    const timeLeft = parseInt(savedTargetTime) - Date.now();
    if (timeLeft > 0) {
        updateTimerDisplay(timeLeft);
        startCountdownUI(parseInt(savedTargetTime));
    } else {
        timer.textContent = "00:00";
        localStorage.removeItem("targetTime");
    }
}

chrome.alarms.get(alarmName, (alarm) => {
    if (alarm) {
        if (!localStorage.getItem("targetTime")) {
            localStorage.setItem("targetTime", alarm.scheduledTime);
            startCountdownUI(alarm.scheduledTime);
        } 
    } else {
        localStorage.removeItem("targetTime");
    }
});

startButton.addEventListener("click", () => {
    chrome.alarms.create(alarmName, {
        delayInMinutes: timerDuration,
        periodInMinutes: timerDuration
    });

    const targetTime = Date.now() + timerDuration * 60 * 1000;
    localStorage.setItem("targetTime", targetTime);
    startCountdownUI(targetTime);
});

resetButton.addEventListener("click", () => {
    chrome.alarms.clear(alarmName);
    clearInterval(countdownInterval);
    localStorage.removeItem("targetTime");

    timer.textContent = "00:06";

    startButton.textContent = "Start Timer";
    startButton.disabled = false;
});

function updateTimerDisplay(timeLeft) {
    if (timeLeft < 0) timeLeft = 0;
    
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    timer.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function startCountdownUI(targetTime) {
    startButton.textContent = "Timer Running...";
    startButton.disabled = true;

    if (countdownInterval) clearInterval(countdownInterval);

    updateTimerDisplay(targetTime - Date.now());

    countdownInterval = setInterval(() => {
        const timeLeft = targetTime - Date.now();

        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            timer.textContent = "00:00";
            startButton.textContent = "Start Timer";
            startButton.disabled = false;
            localStorage.removeItem("targetTime");
            return;
        }

        updateTimerDisplay(timeLeft);
    }, 50);
}