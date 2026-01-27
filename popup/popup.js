const timer = document.getElementById("timer");
const startButton = document.getElementById("startButton");
const pauseButton = document.getElementById("pauseButton");
const resetButton = document.getElementById("resetButton");

let countdownInterval;

const WORK_TIME_MIN = 2;  //in minutes

syncUI();

//buttons
startButton.addEventListener("click", () => {
    chrome.alarms.create("workTimer", { delayInMinutes: WORK_TIME_MIN });
    syncUI();
});

pauseButton.addEventListener("click", () => {
    const isPaused = pauseButton.textContent === "Resume";
    
    if (!isPaused) {
        chrome.alarms.getAll((alarms) => {
            if (alarms.length > 0) {
                const alarm = alarms[0];
                const timeLeft = alarm.scheduledTime - Date.now();
                
                // Save exactly WHICH timer was paused
                localStorage.setItem("pausedAlarmName", alarm.name);
                localStorage.setItem("pausedTimeLeft", timeLeft);
                
                chrome.alarms.clearAll();
                clearInterval(countdownInterval);
                
                pauseButton.textContent = "Resume";
                timer.textContent = "Paused";
                startButton.disabled = true;
            }
        });
    } else {
        const name = localStorage.getItem("pausedAlarmName");
        const timeLeft = parseInt(localStorage.getItem("pausedTimeLeft"));
        
        if (name && timeLeft) {
            // Restart the correct timer
            chrome.alarms.create(name, { delayInMinutes: timeLeft / 60000 });
            
            localStorage.removeItem("pausedAlarmName");
            localStorage.removeItem("pausedTimeLeft");
            
            pauseButton.textContent = "Pause";
            syncUI();
        }
    }
});

resetButton.addEventListener("click", () => {
    chrome.alarms.clearAll();
    clearInterval(countdownInterval);
    localStorage.clear();
    
    timer.textContent = "20:00"; // Reset text
    startButton.textContent = "Start Timer";
    startButton.disabled = false;
    pauseButton.textContent = "Pause";
    pauseButton.disabled = true;
});

function syncUI() {
    chrome.alarms.getAll((alarms) => {
        if (alarms.length === 0) {
            if (localStorage.getItem("pausedAlarmName")) {
                timer.textContent = "Paused";
                pauseButton.textContent = "Resume";
                startButton.disabled = true;
                pauseButton.disabled = false;
            } else {
                startButton.disabled = false;
                pauseButton.disabled = true;
            }
            return;
        }

        const alarm = alarms[0];
        startButton.disabled = true;
        pauseButton.disabled = false;
        pauseButton.textContent = "Pause";

        if (alarm.name === "workTimer") {
            startButton.textContent = "Focusing...";
        } else {
            startButton.textContent = "Resting...";
        }

        startCountdownUI(alarm.scheduledTime);
    });
}

function startCountdownUI(targetTime) {
    if (countdownInterval) clearInterval(countdownInterval);
    
    updateTimerDisplay(targetTime - Date.now());

    countdownInterval = setInterval(() => {
        const timeLeft = targetTime - Date.now();
        
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            setTimeout(syncUI, 50);
            return;
        }
        
        updateTimerDisplay(timeLeft);
    }, 50);
}

function updateTimerDisplay(timeLeft) {
    if (timeLeft < 0) timeLeft = 0;
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    timer.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}