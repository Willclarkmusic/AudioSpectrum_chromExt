let audioCtx = null;
let analyser = null;
let dataArray = null;
let bufferLength = null;
let source = null;
let captureStream = null;
let analysisInterval = null;

// Listen for messages from popup to start tabCapture
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "capture_tab_audio") {
    chrome.tabCapture.capture(
      {
        audio: true,
        video: false,
      },
      function (stream) {
        if (chrome.runtime.lastError || !stream) {
          sendResponse({ success: false, error: chrome.runtime.lastError });
        } else {
          captureStream = stream;
          // Setup audio context and analyser
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          source = audioCtx.createMediaStreamSource(stream);
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 2048;
          bufferLength = analyser.frequencyBinCount;
          dataArray = new Uint8Array(bufferLength);
          // Route audio: source -> analyser -> destination
          source.connect(analyser);
          analyser.connect(audioCtx.destination);
          sendResponse({ success: true });
        }
      }
    );
    // Indicate async response
    return true;
  }
  if (request.action === "release_tab_audio") {
    if (captureStream) {
      let tracks = captureStream.getTracks();
      tracks.forEach((track) => track.stop());
      captureStream = null;
    }
    if (analysisInterval) {
      clearInterval(analysisInterval);
      analysisInterval = null;
    }
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }
    sendResponse({ success: true });
  }
  if (request.action === "start_analysis") {
    if (analyser && dataArray) {
      if (analysisInterval) clearInterval(analysisInterval);
      analysisInterval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        // Calculate volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        chrome.runtime.sendMessage({
          action: "audio_data",
          spectrum: Array.from(dataArray),
          volume: avg,
        });
      }, 50); // 20 FPS
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: "No analyser available" });
    }
  }
  if (request.action === "stop_analysis") {
    if (analysisInterval) {
      clearInterval(analysisInterval);
      analysisInterval = null;
    }
    sendResponse({ success: true });
  }
});
