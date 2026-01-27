const alarmName = "restReminder";
const timerDuration = 0.01;

const timer = document.getElementById("timer");
const startButton = document.getElementById("startButton");
const resetButton = document.getElementById("resetButton");
const pauseButton = document.getElementById("pauseButton");

let countdownInterval;
let paused = false;

checkTimerState();

startButton.addEventListener("click", () => {
    startTimer(timerDuration * 60 * 10000);
});

pauseButton.addEventListener("click", () => {
    const paused = pauseButton.textContent === "Resume";
    if (!paused) {
        const targetTime = parseInt(localStorage.getItem("targetTime"));
        const timeLeft = targetTime - Date.now();

        chrome.alarms.clear(alarmName);
        clearInterval(countdownInterval);

        localStorage.setItem("pausedTimeLeft", timeLeft);
        localStorage.removeItem("targetTiem");

        pauseButton.textContent = "Resume";
        startButton.disabled = true;
    } else {
        const timeLeft = parseInt(localStorage.getItem("pausedTimeLeft"));
        startTimer(timeLeft);
        localStorage.removeItem("pausedTimeLeft");
        pauseButton.textContent = "Pause";
    }
});

resetButton.addEventListener("click", () => {
    chrome.alarms.clear(alarmName);
    clearInterval(countdownInterval);
    localStorage.removeItem("targetTime");
    localStorage.removeItem("pausedTimeLeft");

    timer.textContent = "00:06";
    startButton.textContent = "Start Timer";
    startButton.disabled = false;

    pauseButton.textContent = "Pause";
    pauseButton.disabled = true;
});

function startTimer(durationMS) {
    chrome.alarms.create(alarmName, {
        delayInMinutes: durationMS / 60000
    });

    const targetTime = Date.now() + durationMS;
    localStorage.setItem("targetTime", targetTime);

    startButton.disabled = true;
    pauseButton.disabled = false;
    startCountdownUI(targetTime);
}

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
            pauseButton.disabled = true;
            localStorage.removeItem("targetTime");
            return;
        }

        updateTimerDisplay(timeLeft);
    }, 50);
}

function checkTimerState() {
    const pausedTime = localStorage.getItem("pausedTimeLeft");
    if (pausedTime) {
        updateTimerDisplay(parseInt(pausedTime));
        pauseButton.textContent = "Resume";
        pauseButton.disabled = false;
        startButton.disabled = true;
        return;
    }

    const targetTime = localStorage.getItem("targetTime");
    if (targetTime) {
        const timeLeft = targetTime - Date.now();
        if (timeLeft > 0) {
            startCountdownUI(parseInt(targetTime));
        } else {
            timer.textContent = "00:00";
            localStorage.removeItem("targetTime");
        }
    }

    chrome.alarms.get(alarmName, (alarm) => {
        if (alarm && !localStorage.getItem("targetTime") && !pausedTime) {
            localStorage.setItem("targetTime", alarm.scheduledTime);
            startCountdownUI(alarm.scheduledTime);
        }
    });
}