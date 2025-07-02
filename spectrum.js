let audioCtx = null;

function visualizeAudio(stream) {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  // Route audio: source -> analyser -> destination
  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  // For volume
  const volumeCanvas = document.getElementById("volume");
  const volumeCtx = volumeCanvas.getContext("2d");

  // For spectrum
  const spectrumCanvas = document.getElementById("spectrum");
  const spectrumCtx = spectrumCanvas.getContext("2d");

  function draw() {
    requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);

    // Draw spectrum
    spectrumCtx.clearRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);
    const barWidth = spectrumCanvas.width / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = dataArray[i] / 2;
      spectrumCtx.fillStyle = "rgb(" + (barHeight + 100) + ",50,50)";
      spectrumCtx.fillRect(
        x,
        spectrumCanvas.height - barHeight,
        barWidth,
        barHeight
      );
      x += barWidth + 1;
    }

    // Draw volume
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const avg = sum / bufferLength;
    volumeCtx.clearRect(0, 0, volumeCanvas.width, volumeCanvas.height);
    const volHeight = (avg / 255) * volumeCanvas.height;
    volumeCtx.fillStyle = "lime";
    volumeCtx.fillRect(
      0,
      volumeCanvas.height - volHeight,
      volumeCanvas.width,
      volHeight
    );
  }
  draw();
}

// Export a function to resume the audio context after user gesture
function resumeAudioContext() {
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

window.visualizeAudio = visualizeAudio;
window.resumeAudioContext = resumeAudioContext;
