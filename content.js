// content.js

let audio = null;
let soundEnabled = true;
let volume = 0.5;
let selectedSound = "notification_1.wav"; // 기본 소리 파일

// 초기 설정 값을 로드
chrome.storage.sync.get(
  ["volume", "soundEnabled", "selectedSound"],
  (result) => {
    if (result.volume !== undefined) {
      volume = result.volume / 100;
    }
    if (result.soundEnabled !== undefined) {
      soundEnabled = result.soundEnabled;
    }
    if (result.selectedSound !== undefined) {
      selectedSound = result.selectedSound;
    }
  },
);

// 소리 알림 설정이 변경될 때 업데이트
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync") {
    if (changes.soundEnabled) {
      soundEnabled = changes.soundEnabled.newValue;
    }
    if (changes.volume) {
      volume = changes.volume.newValue / 100;
      if (audio) {
        audio.volume = volume;
      }
    }
    if (changes.selectedSound) {
      selectedSound = changes.selectedSound.newValue;
      if (audio) {
        audio.src = chrome.runtime.getURL(`sounds/${selectedSound}`);
        audio.load();
      }
    }
  }
});

// 알림 소리를 재생하는 함수
function playSound() {
  if (!soundEnabled) {
    return; // 소리 알림이 비활성화되어 있으면 함수 종료
  }

  if (!audio) {
    const soundURL = chrome.runtime.getURL(`sounds/${selectedSound}`);
    audio = new Audio(soundURL);
    audio.volume = volume;
    audio.addEventListener("ended", () => {
      audio.currentTime = 0; // 재생 완료 후 초기화
    });
  } else {
    audio.volume = volume;
    // 소리 파일이 변경된 경우 src 업데이트
    if (audio.src !== chrome.runtime.getURL(`sounds/${selectedSound}`)) {
      audio.src = chrome.runtime.getURL(`sounds/${selectedSound}`);
      audio.load();
    }
  }

  audio.play();
}

function isGenerating() {
  // "icon-lg" 클래스를 가지면서 "mx-2"와 "text-token-text-secondary" 클래스를 가지지 않는 SVG 요소 선택
  const generatingElement = document.querySelector(
    "svg.icon-lg:not(.mx-2):not(.text-token-text-secondary)",
  );
  return generatingElement;
}

// 답변 완료 상태 확인 함수
function isCompleted() {
  // 특정 부모 요소 하위의 "icon-2xl" 클래스를 가진 SVG 요소 선택
  const completedElement = document.querySelector("div.min-w-8 svg.icon-2xl");
  return completedElement;
}

let generating = false;

const observerCallback = function (mutationsList, observer) {
  for (const mutation of mutationsList) {
    if (mutation.type === "childList" || mutation.type === "attributes") {
      if (isGenerating()) {
        if (!generating) {
          generating = true; // 답변 생성 중
        }
      } else if (generating && isCompleted()) {
        generating = false; // 답변 생성 완료
        playSound(); // 알림 소리 재생
      }
    }
  }
};

// MutationObserver 설정
const observer = new MutationObserver(observerCallback);

// 감시할 대상 요소 선택
const targetNode = document.body;

if (targetNode) {
  const config = { attributes: true, childList: true, subtree: true };
  observer.observe(targetNode, config);
}
