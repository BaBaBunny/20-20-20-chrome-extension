chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "play_audio") {
        const audio = new Audio(msg.source);
        audio.volume = Math.min(1, Math.max(0, Number(msg.volume ?? 1)));
        audio.play().catch((error) => {
            console.error("Could not play reminder sound:", error);
        });
    }
});