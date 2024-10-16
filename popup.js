// popup.js

document.addEventListener("DOMContentLoaded", () => {
  const volumeSlider = document.getElementById("volumeSlider");
  const volumeValue = document.getElementById("volumeValue");
  const soundToggle = document.getElementById("soundToggle");

  // 초기 설정 값을 로드
  chrome.storage.sync.get(["volume", "soundEnabled"], (result) => {
    // 볼륨 설정 로드
    if (result.volume !== undefined) {
      volumeSlider.value = result.volume;
      volumeValue.textContent = result.volume;
    } else {
      volumeSlider.value = 50; // 기본값
      volumeValue.textContent = 50;
    }

    // 소리 알림 토글 상태 로드
    if (result.soundEnabled !== undefined) {
      soundToggle.checked = result.soundEnabled;
    } else {
      soundToggle.checked = true; // 기본값 ON
    }
  });

  // 볼륨 슬라이더 변경 시 저장
  volumeSlider.addEventListener("input", (event) => {
    const volume = event.target.value;
    volumeValue.textContent = volume;
    chrome.storage.sync.set({ volume: Number(volume) }, () => {
      console.log("볼륨 설정됨:", volume);
    });
  });

  // 소리 알림 토글 변경 시 저장
  soundToggle.addEventListener("change", (event) => {
    const soundEnabled = event.target.checked;
    chrome.storage.sync.set({ soundEnabled: soundEnabled }, () => {
      console.log("소리 알림 설정됨:", soundEnabled);
    });
  });
});
