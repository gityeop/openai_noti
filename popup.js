// popup.js

document.addEventListener("DOMContentLoaded", () => {
  const volumeSlider = document.getElementById("volumeSlider");
  const volumeValue = document.getElementById("volumeValue");
  const soundToggle = document.getElementById("soundToggle");
  const soundSelect = document.getElementById("soundSelect");
  const tocToggle = document.getElementById("tocToggle");

  // 소리 파일 목록 (sounds 폴더에 있는 wav 파일 이름을 추가)
  const soundFiles = [
    "notification_1.wav",
    "notification_2.wav",
    "notification_3.wav",
    // 새로운 소리 파일이 추가될 때마다 여기에 추가
  ];

  // 소리 파일을 드롭다운에 추가
  soundFiles.forEach((file) => {
    const option = document.createElement("option");
    option.value = file;
    option.textContent = file
      .replace(".wav", "")
      .replace(/_/g, " ")
      .toUpperCase();
    soundSelect.appendChild(option);
  });

  // 초기 설정 값을 로드
  chrome.storage.sync.get(
    ["volume", "soundEnabled", "selectedSound", "tocEnabled"],
    (result) => {
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

      // 선택된 소리 파일 로드
      if (result.selectedSound !== undefined) {
        soundSelect.value = result.selectedSound;
      } else {
        soundSelect.value = soundFiles[0]; // 기본값 첫 번째 소리
      }

      // TOC 기능 토글 상태 로드
      if (result.tocEnabled !== undefined) {
        tocToggle.checked = result.tocEnabled;
      } else {
        tocToggle.checked = false; // 기본값 OFF
      }
    },
  );

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

  // 소리 선택 변경 시 저장
  soundSelect.addEventListener("change", (event) => {
    const selectedSound = event.target.value;
    chrome.storage.sync.set({ selectedSound: selectedSound }, () => {
      console.log("선택된 소리 설정됨:", selectedSound);
    });
  });

  // TOC 기능 토글 변경 시 저장
  tocToggle.addEventListener("change", (event) => {
    const tocEnabled = event.target.checked;
    chrome.storage.sync.set({ tocEnabled: tocEnabled }, () => {
      console.log("TOC 기능 설정됨:", tocEnabled);
    });
  });
});
