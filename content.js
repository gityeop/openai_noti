let audio = null;

function playSound() {
  if (!audio) {
    const soundURL = chrome.runtime.getURL("sounds/notification_2.wav");
    audio = new Audio(soundURL);
    audio.addEventListener("ended", () => {
      audio.currentTime = 0; // 재생 완료 후 초기화
    });
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
        // 배경 스크립트로 소리 재생 요청 메시지 전송
        playSound();
      }
    }
  }
};

// MutationObserver 설정
const observer = new MutationObserver(observerCallback);

// 감시할 대상 요소 선택
//   const targetNode = document.querySelector(
//     "div.flex.items-end.gap-1\\.5.pl-4.md\\:gap-2"
//     //   md:pt-0 dark:border-white/20 md:border-transparent md:dark:border-transparent w-full
//   ); // Updated selector
const targetNode = document.body;

if (targetNode) {
  const config = { attributes: true, childList: true, subtree: true };
  observer.observe(targetNode, config);
}
