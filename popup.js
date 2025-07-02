let spectrumCanvas = document.getElementById("spectrum");
let spectrumCtx = spectrumCanvas.getContext("2d");
let volumeCanvas = document.getElementById("volume");
let volumeCtx = volumeCanvas.getContext("2d");

const SPECTRUM_BINS = 300; // Show only first 300 bins for 0-18kHz
const VOL_DB_MIN = -48;
const VOL_DB_MAX = 0;

const powerBtn = document.getElementById("powerBtn");
let metersOn = true;

function startMeters() {
  chrome.runtime.sendMessage(
    { action: "capture_tab_audio" },
    function (response) {
      if (response && response.success) {
        chrome.runtime.sendMessage({ action: "start_analysis" });
        powerBtn.classList.add("power-on");
        powerBtn.classList.remove("power-off");
        metersOn = true;
      } else {
        alert(
          "Failed to capture tab audio: " +
            (response && response.error
              ? response.error.message
              : "Unknown error")
        );
      }
    }
  );
}

function stopMeters() {
  chrome.runtime.sendMessage({ action: "stop_analysis" });
  chrome.runtime.sendMessage({ action: "release_tab_audio" });
  powerBtn.classList.remove("power-on");
  powerBtn.classList.add("power-off");
  metersOn = false;
  // Optionally clear meters
  spectrumCtx.clearRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);
  volumeCtx.clearRect(0, 0, volumeCanvas.width, volumeCanvas.height);
}

powerBtn.addEventListener("click", function () {
  if (metersOn) {
    stopMeters();
  } else {
    startMeters();
  }
});

function drawSpectrum(spectrum) {
  // Only use the first 300 bins for 0-18kHz
  const bins = spectrum.slice(0, SPECTRUM_BINS);
  spectrumCtx.clearRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);
  const barWidth = spectrumCanvas.width / bins.length;
  let x = 0;
  for (let i = 0; i < bins.length; i++) {
    const barHeight = bins[i] / 2;
    spectrumCtx.fillStyle = "rgb(" + (barHeight + 100) + ",50,50)";
    spectrumCtx.fillRect(
      x,
      spectrumCanvas.height - barHeight,
      barWidth,
      barHeight
    );
    x += barWidth + 1;
  }
}

function drawVolume(volume) {
  // Convert average amplitude (0-255) to dB
  let norm = volume / 255;
  let dB = 20 * Math.log10(norm);
  if (!isFinite(dB)) dB = VOL_DB_MIN;
  dB = Math.max(VOL_DB_MIN, Math.min(VOL_DB_MAX, dB));
  // Map dB to meter height
  let percent = (dB - VOL_DB_MIN) / (VOL_DB_MAX - VOL_DB_MIN);
  let volHeight = percent * volumeCanvas.height;
  volumeCtx.clearRect(0, 0, volumeCanvas.width, volumeCanvas.height);
  volumeCtx.fillStyle = "lime";
  volumeCtx.fillRect(
    0,
    volumeCanvas.height - volHeight,
    volumeCanvas.width,
    volHeight
  );
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (metersOn && message.action === "audio_data") {
    drawSpectrum(message.spectrum);
    drawVolume(message.volume);
  }
});

window.addEventListener("unload", function () {
  stopMeters();
});

// Start meters by default when popup opens
startMeters();
