// popup.js

document.addEventListener("DOMContentLoaded", () => {
  const volumeSlider = document.getElementById("volumeSlider");
  const volumeValue = document.getElementById("volumeValue");

  // 초기 볼륨 값을 로드
  chrome.storage.sync.get(["volume"], (result) => {
    if (result.volume !== undefined) {
      volumeSlider.value = result.volume;
      volumeValue.textContent = result.volume;
    } else {
      volumeSlider.value = 50; // 기본값 설정
      volumeValue.textContent = 50;
    }
  });

  // 슬라이더 값 변경 시 저장
  volumeSlider.addEventListener("input", (event) => {
    const volume = event.target.value;
    volumeValue.textContent = volume;
    chrome.storage.sync.set({ volume: Number(volume) }, () => {
      console.log("볼륨 설정됨:", volume);
    });
  });
});
