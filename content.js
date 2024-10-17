// content.js

let audio = null;
let soundEnabled = true;
let volume = 0.5;
let selectedSound = "notification_1.wav"; // 기본 소리 파일
let tocEnabled = false;
let tocContainer = null;

// 초기 설정 값을 로드
chrome.storage.sync.get(
  ["volume", "soundEnabled", "selectedSound", "tocEnabled"],
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
    if (result.tocEnabled !== undefined) {
      tocEnabled = result.tocEnabled;
      if (tocEnabled) {
        createTOC();
      }
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
    if (changes.tocEnabled) {
      tocEnabled = changes.tocEnabled.newValue;
      if (tocEnabled) {
        createTOC();
      } else {
        removeTOC();
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
let isDarkMode =
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

// 시스템 모드 변경 감지 및 스타일 업데이트
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    isDarkMode = e.matches;
    updateTOCStyle(isDarkMode);
  });
// TOC 위치를 계산하는 함수
function calculateLeftPosition() {
  // 윈도우 너비에 따라 leftPosition을 동적으로 계산
  // 최소값 20px, 최대값은 윈도우 너비에서 TOC의 너비(200px)와 약간의 여백(20px)을 뺀 값
  const minLeft = 20;
  const maxLeft = window.innerWidth - 169; // 200px(Toc 너비) + 20px 여백
  // 원하는 기본 위치 설정 (예: 윈도우 너비에서 250px 뺀 위치)
  let leftPosition = window.innerWidth;
  // leftPosition이 minLeft와 maxLeft 사이에 있도록 제한
  leftPosition = Math.max(minLeft, Math.min(leftPosition, maxLeft));
  return leftPosition;
}

// TOC 컨테이너 생성 함수
function createTOC() {
  if (tocContainer) return; // 이미 TOC가 생성된 경우

  tocContainer = document.createElement("div");
  tocContainer.id = "chatnoti-toc";
  tocContainer.style.position = "fixed";
  tocContainer.style.top = "56px"; // Y값 60 이상
  // X값 1050~1200 사이로 설정
  tocContainer.style.left = calculateLeftPosition() + "px";

  tocContainer.style.width = "160px";
  tocContainer.style.maxHeight = "80vh";
  tocContainer.style.overflowY = "auto";
  tocContainer.style.borderRadius = "8px";
  tocContainer.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
  tocContainer.style.padding = "10px";
  tocContainer.style.zIndex = "1000";
  tocContainer.style.fontSize = "12px"; // 글씨 크기 더 작게
  // 시스템 모드에 따른 스타일 적용
  updateTOCStyle(isDarkMode);

  const tocTitle = document.createElement("div");
  tocTitle.textContent = "목차";
  tocTitle.style.fontWeight = "bold";
  tocTitle.style.marginBottom = "10px";
  tocContainer.appendChild(tocTitle);

  const tocList = document.createElement("ul");
  tocList.style.listStyleType = "none";
  tocList.style.padding = "0";
  tocList.style.margin = "0";
  tocContainer.appendChild(tocList);

  document.body.appendChild(tocContainer);
  // 윈도우 크기 변경 시 TOC 위치 업데이트
  window.addEventListener("resize", onWindowResize);
}
// 윈도우 리사이즈 이벤트 핸들러
function onWindowResize() {
  if (tocContainer) {
    tocContainer.style.left = calculateLeftPosition() + "px";
  }
}

// TOC 스타일 업데이트 함수
function updateTOCStyle(isDarkMode) {
  if (!tocContainer) return;

  if (isDarkMode) {
    tocContainer.style.backgroundColor = "#1e1e1e"; // 다크 모드 배경색
    tocContainer.style.color = "#ffffff"; // 다크 모드 텍스트 색상
    tocContainer.style.border = "1px solid #555555"; // 다크 모드 테두리 색상
  } else {
    tocContainer.style.backgroundColor = "#ffffff"; // 라이트 모드 배경색
    tocContainer.style.color = "#333333"; // 라이트 모드 텍스트 색상
    tocContainer.style.border = "1px solid #cccccc"; // 라이트 모드 테두리 색상
  } // TOC 링크 스타일 업데이트
  const tocLinks = tocContainer.querySelectorAll("a");
  tocLinks.forEach((link) => {
    if (isDarkMode) {
      link.style.color = "#4ea8de"; // 다크 모드 링크 색상
    } else {
      link.style.color = "#007bff"; // 라이트 모드 링크 색상
    }
    link.style.textDecoration = "none";
    link.style.cursor = "pointer";
  });
}
// TOC 제거 함수
function removeTOC() {
  if (tocContainer) {
    tocContainer.remove();
    tocContainer = null;
  }
}

// TOC 업데이트 함수
function updateTOC() {
  if (!tocEnabled || !tocContainer) return;

  const tocList = tocContainer.querySelector("ul");
  tocList.innerHTML = ""; // 기존 목록 초기화

  // 모든 메시지(article) 요소 선택
  const articles = document.querySelectorAll("main article");

  let userQuestionCount = 0; // 사용자 질문 개수 카운트

  articles.forEach((article) => {
    // 어시스턴트 메시지와 사용자 메시지 구분
    const isAssistantMessage = article.querySelector("div.markdown");
    if (!isAssistantMessage) {
      // 사용자 메시지의 내용은 div.whitespace-pre-wrap에 있음
      const contentElement = article.querySelector("div.whitespace-pre-wrap");
      if (contentElement) {
        userQuestionCount++;
        const questionText = contentElement.textContent.trim();
        const shortText =
          questionText.length > 15
            ? questionText.substring(0, 15) + "..."
            : questionText;

        const tocItem = document.createElement("li");
        tocItem.style.marginBottom = "5px";

        const tocLink = document.createElement("a");
        tocLink.href = "#";
        tocLink.textContent = shortText;
        tocLink.style.color = "#007bff";
        tocLink.style.textDecoration = "none";
        tocLink.style.cursor = "pointer";

        tocLink.addEventListener("click", (e) => {
          e.preventDefault();
          contentElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        });

        tocItem.appendChild(tocLink);
        tocList.appendChild(tocItem);
      }
    }
  });
  if (userQuestionCount > 0) {
    tocContainer.style.display = "block"; // 질문이 있을 때 TOC 표시
  } else {
    tocContainer.style.display = "none"; // 질문이 없을 때 TOC 숨김
  }
  updateTOCStyle(isDarkMode);
}

// 알림 소리를 재생하는 함수와 TOC 기능을 통합한 부분은 그대로 유지

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

// MutationObserver 콜백 함수
const observerCallback = function (mutationsList, observer) {
  let tocNeedsUpdate = false;

  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      if (isGenerating()) {
        if (!generating) {
          generating = true; // 답변 생성 중
        }
      } else if (generating && isCompleted()) {
        generating = false; // 답변 생성 완료
        playSound(); // 알림 소리 재생
        tocNeedsUpdate = true;
      }

      // TOC 기능 활성화 시, 질문 추가 시 TOC 업데이트
      if (tocEnabled) {
        tocNeedsUpdate = true;
      }
    }
  }

  if (tocEnabled && tocNeedsUpdate) {
    const config = { childList: true, subtree: true };
    observer.disconnect(); // 감시 중단
    updateTOC();
    observer.observe(targetNode, config);
  }
};
// MutationObserver 설정
const observer = new MutationObserver(observerCallback);

// 감시할 대상 요소 선택
const targetNode = document.body;

if (targetNode) {
  const config = { childList: true, subtree: true };
  observer.observe(targetNode, config);
}
