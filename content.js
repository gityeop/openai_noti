// content.js

let audio = null;

// 알림 소리를 재생하는 함수
function playSound() {
  // 저장된 볼륨 값을 로드
  chrome.storage.sync.get(["volume"], (result) => {
    const volume = result.volume !== undefined ? result.volume / 100 : 0.5; // 기본값 0.5

    if (!audio) {
      const soundURL = chrome.runtime.getURL("sounds/notification_2.wav");
      audio = new Audio(soundURL);
      audio.volume = volume;
      audio.addEventListener("ended", () => {
        audio.currentTime = 0; // 재생 완료 후 초기화
      });
    } else {
      audio.volume = volume;
    }

    audio.play();
  });
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
