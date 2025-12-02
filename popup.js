// popup.js

document.addEventListener("DOMContentLoaded", () => {
  try {
    const volumeSlider = document.getElementById("volumeSlider");
    const volumeValue = document.getElementById("volumeValue");
    const soundToggle = document.getElementById("soundToggle");
    const soundSelect = document.getElementById("soundSelect");
    const tocToggle = document.getElementById("tocToggle");
    const languageSelect = document.getElementById("languageSelect");
    const volumeContainer = document.getElementById("volumeContainer");
    const soundSelectContainer = document.getElementById(
      "soundSelectContainer",
    );

    // 지원하는 언어 목록
    const availableLanguages = {
      en: "English",
      ko: "한국어",
      zh: "中文",
      es: "Español",
      // 다른 언어 추가 가능
    };

    // 언어 선택 드롭다운에 옵션 추가
    for (const [code, name] of Object.entries(availableLanguages)) {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = name;
      languageSelect.appendChild(option);
    }

    // 소리 파일 목록
    const soundFiles = [
      "sounds/notification_1.wav",
      "sounds/notification_2.wav",
      "sounds/notification_3.wav",
      // 새로운 소리 파일이 추가될 때마다 여기에 추가
    ];

    // 소리 파일을 드롭다운에 추가
    soundFiles.forEach((file) => {
      const option = document.createElement("option");
      option.value = file;
      option.textContent = file
        .replace("sounds/", "")
        .replace(".wav", "")
        .replace(/_/g, " ")
        .toUpperCase();
      soundSelect.appendChild(option);
    });

    // Function to update disabled state
    function updateSoundControlsState(enabled) {
      if (!enabled) {
        volumeContainer.classList.add("disabled");
        soundSelectContainer.classList.add("disabled");
      } else {
        volumeContainer.classList.remove("disabled");
        soundSelectContainer.classList.remove("disabled");
      }
    }

    // Add event listener for sound toggle
    soundToggle.addEventListener("change", (e) => {
      updateSoundControlsState(e.target.checked);
      // Save the state
      chrome.storage.sync.set({ soundEnabled: e.target.checked });
    });

    // 초기 설정 값을 로드
    chrome.storage.sync.get(
      [
        "volume",
        "soundEnabled",
        "selectedSound",
        "tocEnabled",
        "selectedLanguage",
      ],
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
        const soundEnabled =
          result.soundEnabled !== undefined ? result.soundEnabled : true;
        soundToggle.checked = soundEnabled;
        updateSoundControlsState(soundEnabled);

        // 선택된 소리 파일 로드
        soundSelect.value =
          result.selectedSound !== undefined
            ? result.selectedSound
            : soundFiles[0];

        // TOC 기능 토글 상태 로드
        tocToggle.checked =
          result.tocEnabled !== undefined ? result.tocEnabled : false;

        // 선택된 언어 로드
        const browserLanguage = navigator.language.split("-")[0];
        const defaultLanguage = availableLanguages[browserLanguage]
          ? browserLanguage
          : "en";
        const selectedLanguage = result.selectedLanguage || defaultLanguage;
        languageSelect.value = selectedLanguage;

        // 선택된 언어로 텍스트 설정
        setLanguage(selectedLanguage);
      },
    );

    // 언어 설정 함수
    function setLanguage(lang) {
      const elements = {
        settingsTitle: translations[lang].settingsTitle,
        soundNotification: translations[lang].soundNotification,
        notificationVolume: translations[lang].notificationVolume,
        selectNotificationSound: translations[lang].selectNotificationSound,
        tocFeature: translations[lang].tocFeature,
        languageLabel: translations[lang].languageLabel || "Language",
      };

      // Safely update text content for each element
      Object.entries(elements).forEach(([id, text]) => {
        const element = document.getElementById(id);
        if (element) {
          element.textContent = text;
        }
      });
    }

    // 볼륨 슬라이더 변경 시 저장
    volumeSlider.addEventListener("input", (event) => {
      const volume = event.target.value;
      volumeValue.textContent = volume;
      chrome.storage.sync.set({ volume: Number(volume) }, () => {
        console.log(
          translations[languageSelect.value].volumeSet + ": " + volume,
        );
      });
    });

    // 소리 알림 토글 변경 시 저장
    soundToggle.addEventListener("change", (event) => {
      const soundEnabled = event.target.checked;
      chrome.storage.sync.set({ soundEnabled: soundEnabled }, () => {
        console.log(
          translations[languageSelect.value].soundNotificationSet +
            ": " +
            soundEnabled,
        );
      });
    });

    // 소리 선택 변경 시 저장 및 재생
    soundSelect.addEventListener("change", async (event) => {
      const selectedSound = event.target.value;

      try {
        // 선택된 소리 재생
        const audio = new Audio(chrome.runtime.getURL(selectedSound));
        audio.volume = volumeSlider.value / 100;
        await audio.play();
      } catch (error) {
        console.error("Sound playback failed:", error);
      }

      chrome.storage.sync.set({ selectedSound: selectedSound }, () => {
        console.log(
          translations[languageSelect.value].selectedSoundSet +
            ": " +
            selectedSound,
        );
      });
    });

    // TOC 기능 토글 변경 시 저장
    tocToggle.addEventListener("change", (event) => {
      const tocEnabled = event.target.checked;
      chrome.storage.sync.set({ tocEnabled: tocEnabled }, () => {
        console.log(
          translations[languageSelect.value].tocFeatureSet + ": " + tocEnabled,
        );
      });
    });

    // 언어 선택 변경 시 저장 및 텍스트 업데이트
    languageSelect.addEventListener("change", (event) => {
      const selectedLanguage = event.target.value;
      chrome.storage.sync.set({ selectedLanguage: selectedLanguage }, () => {
        console.log("언어 설정됨: " + selectedLanguage);
        setLanguage(selectedLanguage);
      });
    });
  } catch (error) {
    console.error("Error initializing popup:", error);
    document.body.innerHTML = `<div style="color:red; padding:10px;">Error: ${error.message}</div>`;
  }
});
