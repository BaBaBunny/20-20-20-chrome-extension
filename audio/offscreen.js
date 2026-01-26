chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "play_audio") {
        const audio = new Audio(msg.source);
        audio.play();
    }
});