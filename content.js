// content.js

let audio = null;
let soundEnabled = true;
let volume = 0.5;
let selectedSound = "notification_1.wav"; // Default sound file
let tocEnabled = false;
let tocContainer = null;
let showTOCButton = null;
let lastUrl = window.location.href; // For detecting URL changes
let tocVisible = true; // TOC의 가시성 상태를 추적
let selectedLanguage = "en"; // 기본값
let tocWidth = 300; // 초기 TOC 너비

// Load initial settings

chrome.storage.sync.get(
  ["volume", "soundEnabled", "selectedSound", "tocEnabled", "selectedLanguage"],
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
    }
    // 선택된 언어 로드
    const browserLanguage = navigator.language.split("-")[0];
    const defaultLanguage = translations[browserLanguage]
      ? browserLanguage
      : "en";
    selectedLanguage = result.selectedLanguage || defaultLanguage;

    // Initialize TOC after loading settings
    if (tocEnabled) {
      waitForMainAndInitializeTOC();
    }

    // Start observing URL changes
    observeUrlChange();
  },
);

// Update settings when changed
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
        const newSoundURL = chrome.runtime.getURL(selectedSound);
        if (audio.src !== newSoundURL) {
          audio.src = newSoundURL;
          audio.load();
        }
      }
    }
    if (changes.tocEnabled) {
      tocEnabled = changes.tocEnabled.newValue;
      if (tocEnabled) {
        initializeTOC();
      } else {
        removeTOC();
      }
    }
    if (changes.selectedLanguage) {
      selectedLanguage = changes.selectedLanguage.newValue;
      // 언어가 변경되었으므로 TOC를 업데이트합니다.
      updateTOC();
    }
  }
});

// Function to play the notification sound
function playSound() {
  if (!soundEnabled) {
    return; // Exit if sound notifications are disabled
  }

  if (!audio) {
    const soundURL = chrome.runtime.getURL(selectedSound);
    audio = new Audio(soundURL);
    audio.volume = volume;
    audio.addEventListener("ended", () => {
      audio.currentTime = 0; // Reset after playback
    });
  } else {
    audio.volume = volume;
    // Update src if the sound file has changed
    const newSoundURL = chrome.runtime.getURL(selectedSound);
    if (audio.src !== newSoundURL) {
      audio.src = newSoundURL;
      audio.load();
    }
  }

  console.log("Attempting to play audio:", {
    src: audio.src,
    readyState: audio.readyState,
    paused: audio.paused,
    volume: audio.volume,
    selectedSound: selectedSound,
  });

  audio
    .play()
    .then(() => {
      console.log("Audio played successfully");
    })
    .catch((error) => {
      console.error("Error playing audio:", {
        error: error.message,
        name: error.name,
        readyState: audio.readyState,
        networkState: audio.networkState,
        src: audio.src,
      });
    });
}

let isDarkMode =
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

// Detect system dark mode changes and update styles
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    isDarkMode = e.matches;
    updateTOCStyle(isDarkMode);
  });

// Function to calculate TOC left position
function calculateLeftPosition() {
  const minLeft = 20;
  const maxLeft = window.innerWidth - 169; // 160px width + padding + margin
  let leftPosition = window.innerWidth;
  leftPosition = Math.max(minLeft, Math.min(leftPosition, maxLeft));
  return leftPosition;
}

// Initialize TOC
function initializeTOC() {
  createTOC();
  createShowTOCButton();
  updateTOC();

  // Observe changes in the main content area
  observeMainContainer();

  // Listen for window resize to adjust TOC position
  window.addEventListener("resize", onWindowResize);
}

// 'Show TOC' 버튼을 생성하는 함수 추가
function createShowTOCButton() {
  if (showTOCButton) {
    return;
  }
  showTOCButton = document.createElement("button");

  // uc0acuc774ub4dcubc14 uc544uc774ucf58 ucee8ud14cuc774ub108 uc0dduc131
  const iconContainer = document.createElement("div");
  iconContainer.style.width = "26px";
  iconContainer.style.height = "26px";
  iconContainer.style.position = "relative";
  iconContainer.style.display = "flex";
  iconContainer.style.alignItems = "center";
  iconContainer.style.justifyContent = "center";

  // uc67cucabd uc218uc9c1uc120 uc0dduc131
  const verticalLine = document.createElement("div");
  verticalLine.style.width = "3px"; // 2pxuc5d0uc11c 3pxub85c ub450uaecduac8c uc870uc815
  verticalLine.style.height = "18px";
  verticalLine.style.backgroundColor = "#666";
  verticalLine.style.position = "absolute";
  verticalLine.style.left = "6px";
  verticalLine.style.borderRadius = "1.5px";

  // ud654uc0b4ud45c uc0dduc131 (>)
  const arrowContainer = document.createElement("div");
  arrowContainer.style.position = "absolute";
  arrowContainer.style.width = "10px";
  arrowContainer.style.height = "14px";
  arrowContainer.style.right = "4px";
  arrowContainer.style.display = "flex";
  arrowContainer.style.alignItems = "center";
  arrowContainer.style.justifyContent = "center";

  // ud654uc0b4ud45c uc0c1uc120
  const arrowTop = document.createElement("div");
  arrowTop.style.position = "absolute";
  arrowTop.style.width = "10px";
  arrowTop.style.height = "3px"; // 2pxuc5d0uc11c 3pxub85c ub450uaecduac8c uc870uc815
  arrowTop.style.backgroundColor = "#666";
  arrowTop.style.top = "5px";
  arrowTop.style.transform = "rotate(45deg)";
  arrowTop.style.transformOrigin = "left center";
  arrowTop.style.borderRadius = "1.5px";

  // ud654uc0b4ud45c ud558uc120
  const arrowBottom = document.createElement("div");
  arrowBottom.style.position = "absolute";
  arrowBottom.style.width = "10px";
  arrowBottom.style.height = "3px"; // 2pxuc5d0uc11c 3pxub85c ub450uaecduac8c uc870uc815
  arrowBottom.style.backgroundColor = "#666";
  arrowBottom.style.bottom = "5px";
  arrowBottom.style.transform = "rotate(-45deg)";
  arrowBottom.style.transformOrigin = "left center";
  arrowBottom.style.borderRadius = "1.5px";

  arrowContainer.appendChild(arrowTop);
  arrowContainer.appendChild(arrowBottom);

  iconContainer.appendChild(verticalLine);
  iconContainer.appendChild(arrowContainer);
  showTOCButton.appendChild(iconContainer);

  showTOCButton.style.position = "fixed";
  showTOCButton.style.top = "65px";
  showTOCButton.style.right = "0px";
  showTOCButton.style.zIndex = "1000";
  showTOCButton.style.display = "none";
  showTOCButton.style.borderTopLeftRadius = "10px";
  showTOCButton.style.borderBottomLeftRadius = "10px";
  showTOCButton.style.backgroundColor = "var(--toc-bg-color, #f7f7f8)";
  showTOCButton.style.border = "1px solid var(--toc-border-color, #e5e5e5)";
  showTOCButton.style.borderRight = "none";
  showTOCButton.style.padding = "5px 8px";
  showTOCButton.style.cursor = "pointer";
  showTOCButton.style.boxShadow = "-2px 2px 5px rgba(0, 0, 0, 0.1)";

  showTOCButton.addEventListener("click", () => {
    showTOC();
    showTOCButton.style.display = "none";
    tocVisible = true;
  });

  document.body.appendChild(showTOCButton);
}

function injectAnimationStyles() {
  const style = document.createElement("style");
  style.innerHTML = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}
injectAnimationStyles();

function createTOC() {
  if (tocContainer) {
    return; // TOC already exists
  }

  tocContainer = document.createElement("div");
  tocContainer.id = "chatnoti-toc";
  tocContainer.style.position = "fixed";
  tocContainer.style.top = "56px";
  tocContainer.style.right = "10px"; // 왼쪽 대신 오른쪽 기준으로 위치 설정
  tocContainer.style.width = tocWidth + "px";
  tocContainer.style.maxHeight = "80vh";
  tocContainer.style.overflowY = "auto";
  tocContainer.style.borderRadius = "8px";
  tocContainer.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
  tocContainer.style.padding = "10px";
  tocContainer.style.zIndex = "1000";
  tocContainer.style.fontSize = "12px";
  tocContainer.style.transition = "transform 0.3s ease, opacity 0.3s ease";
  tocContainer.style.transform = "translateX(100%)"; // 초기 위치 설정
  tocContainer.style.opacity = "0";

  // Apply styles based on system mode
  updateTOCStyle(isDarkMode);

  const tocHeader = document.createElement("div");
  tocHeader.style.display = "flex";
  tocHeader.style.alignItems = "center";
  tocHeader.style.justifyContent = "space-between";
  tocHeader.style.marginBottom = "10px";
  tocHeader.style.marginLeft = "10px";

  const tocTitle = document.createElement("div");
  tocTitle.textContent = translations[selectedLanguage].tableOfContents;
  tocTitle.style.fontWeight = "bold";
  tocTitle.style.fontSize = "14px";

  // 'Hide TOC' 버튼 추가
  const hideButton = document.createElement("button");

  // uc0acuc774ub4dcubc14 uc544uc774ucf58 ucee8ud14cuc774ub108 uc0dduc131 (uc228uae30uae30 ubc84ud2bcuc6a9)
  const hideIconContainer = document.createElement("div");
  hideIconContainer.style.width = "20px";
  hideIconContainer.style.height = "20px";
  hideIconContainer.style.position = "relative";
  hideIconContainer.style.display = "flex";
  hideIconContainer.style.alignItems = "center";
  hideIconContainer.style.justifyContent = "center";

  // uc67cucabd uc218uc9c1uc120 uc0dduc131
  const hideVerticalLine = document.createElement("div");
  hideVerticalLine.style.width = "3px"; // 2pxuc5d0uc11c 3pxub85c ub450uaecduac8c uc870uc815
  hideVerticalLine.style.height = "12px";
  hideVerticalLine.style.backgroundColor = "#666";
  hideVerticalLine.style.position = "absolute";
  hideVerticalLine.style.left = "5px";
  hideVerticalLine.style.borderRadius = "1.5px"; // 1pxuc5d0uc11c 1.5pxub85c ub450uaecduac8c uc870uc815

  // ud654uc0b4ud45c uc0dduc131 (<)
  const hideArrowContainer = document.createElement("div");
  hideArrowContainer.style.position = "absolute";
  hideArrowContainer.style.width = "8px";
  hideArrowContainer.style.height = "12px";
  hideArrowContainer.style.right = "3px";
  hideArrowContainer.style.display = "flex";
  hideArrowContainer.style.alignItems = "center";
  hideArrowContainer.style.justifyContent = "center";

  // ud654uc0b4ud45c uc0c1uc120
  const hideArrowTop = document.createElement("div");
  hideArrowTop.style.position = "absolute";
  hideArrowTop.style.width = "8px";
  hideArrowTop.style.height = "3px"; // 2pxuc5d0uc11c 3pxub85c ub450uaecduac8c uc870uc815
  hideArrowTop.style.backgroundColor = "#666";
  hideArrowTop.style.top = "4px";
  hideArrowTop.style.transform = "rotate(-45deg)";
  hideArrowTop.style.transformOrigin = "right center";
  hideArrowTop.style.borderRadius = "1.5px"; // 1pxuc5d0uc11c 1.5pxub85c ub450uaecduac8c uc870uc815

  // ud654uc0b4ud45c ud558uc120
  const hideArrowBottom = document.createElement("div");
  hideArrowBottom.style.position = "absolute";
  hideArrowBottom.style.width = "8px";
  hideArrowBottom.style.height = "3px"; // 2pxuc5d0uc11c 3pxub85c ub450uaecduac8c uc870uc815
  hideArrowBottom.style.backgroundColor = "#666";
  hideArrowBottom.style.bottom = "4px";
  hideArrowBottom.style.transform = "rotate(45deg)";
  hideArrowBottom.style.transformOrigin = "right center";
  hideArrowBottom.style.borderRadius = "1.5px"; // 1pxuc5d0uc11c 1.5pxub85c ub450uaecduac8c uc870uc815

  hideArrowContainer.appendChild(hideArrowTop);
  hideArrowContainer.appendChild(hideArrowBottom);

  hideIconContainer.appendChild(hideVerticalLine);
  hideIconContainer.appendChild(hideArrowContainer);
  hideButton.appendChild(hideIconContainer);

  hideButton.style.cursor = "pointer";
  hideButton.style.backgroundColor = "transparent";
  hideButton.style.border = "none";
  hideButton.style.padding = "3px";
  hideButton.style.display = "flex";
  hideButton.style.alignItems = "center";
  hideButton.style.justifyContent = "center";
  hideButton.style.transition = "opacity 0.2s ease";

  // 호버 효과 추가
  hideButton.addEventListener("mouseover", () => {
    hideButton.style.opacity = "0.8";
  });

  hideButton.addEventListener("mouseout", () => {
    hideButton.style.opacity = "1";
  });

  hideButton.addEventListener("click", () => {
    hideTOC();
    showTOCButton.style.display = "block";
    tocVisible = false;
  });
  tocHeader.appendChild(tocTitle);
  tocHeader.appendChild(hideButton);

  tocContainer.appendChild(tocHeader);

  const tocList = document.createElement("ul");
  tocList.style.listStyleType = "none";
  tocList.style.padding = "0";
  tocList.style.margin = "0";
  tocList.style.marginLeft = "10px";
  tocContainer.appendChild(tocList);

  // 리사이저 추가 (가로 크기 조절 기능)
  const tocResizer = document.createElement("div");
  tocResizer.id = "toc-resizer";
  tocResizer.style.position = "absolute";
  tocResizer.style.left = "0";
  tocResizer.style.top = "0";
  tocResizer.style.width = "5px";
  tocResizer.style.height = "100%";
  tocResizer.style.cursor = "ew-resize";
  tocResizer.style.backgroundColor = "rgba(0, 0, 0, 0.08)";

  let startX, startWidth;

  tocResizer.addEventListener("mousedown", function (e) {
    startX = e.clientX;
    startWidth = parseInt(tocContainer.style.width);
    document.addEventListener("mousemove", resizing);
    document.addEventListener("mouseup", stopResizing);
  });

  function resizing(e) {
    const newWidth = startWidth - (e.clientX - startX);
    if (newWidth > 150 && newWidth < 500) {
      tocWidth = newWidth;
      tocContainer.style.width = newWidth + "px";
      updateTOC();
    }
  }

  function stopResizing() {
    document.removeEventListener("mousemove", resizing);
    document.removeEventListener("mouseup", stopResizing);
  }

  tocContainer.appendChild(tocResizer);

  document.body.appendChild(tocContainer);
  updateTOC();

  // TOC를 초기에 표시할지 여부에 따라 위치를 설정
  if (tocEnabled && tocVisible) {
    showTOC();
  }
}

function showTOC() {
  if (!tocContainer) return;

  tocContainer.style.display = "block";
  requestAnimationFrame(() => {
    tocContainer.style.transform = "translateX(0)";
    tocContainer.style.opacity = "1";
  });

  tocVisible = true;
}

function hideTOC() {
  if (!tocContainer) return;

  tocContainer.style.transform = "translateX(100%)";
  tocContainer.style.opacity = "0";

  tocContainer.addEventListener(
    "transitionend",
    function onTransitionEnd() {
      tocContainer.style.display = "none";
      tocContainer.removeEventListener("transitionend", onTransitionEnd);
    },
    { once: true },
  );

  tocVisible = false;
}

// Window resize handler
function onWindowResize() {
  // 리사이징 이벤트에서 left 계산을 제거
  // 오른쪽 기준으로 위치를 고정하기 때문에 계산이 필요없음
}

// Update TOC style based on dark mode
function updateTOCStyle(isDarkMode) {
  if (!tocContainer) {
    return;
  }

  if (isDarkMode) {
    tocContainer.style.backgroundColor = "#1e1e1e"; // Dark mode background
    tocContainer.style.color = "#ffffff"; // Dark mode text color
    tocContainer.style.border = "1px solid #555555"; // Dark mode border
  } else {
    tocContainer.style.backgroundColor = "#ffffff"; // Light mode background
    tocContainer.style.color = "#333333"; // Light mode text color
    tocContainer.style.border = "1px solid #cccccc"; // Light mode border
  }

  // Update link styles
  const tocLinks = tocContainer.querySelectorAll("a");
  tocLinks.forEach((link) => {
    if (isDarkMode) {
      link.style.color = "#4ea8de"; // Dark mode link color
    } else {
      link.style.color = "#007bff"; // Light mode link color
    }
    link.style.textDecoration = "none";
    link.style.cursor = "pointer";
    link.style.whiteSpace = "nowrap";
    link.style.overflow = "hidden";
    link.style.textOverflow = "ellipsis";
    link.style.display = "block";
  });

  // 'Hide TOC' 버튼 스타일 업데이트
  const hideButton = tocContainer.querySelector("button");
  if (hideButton) {
    hideButton.style.backgroundColor = "transparent";
    hideButton.style.border = "none";
    hideButton.style.padding = "3px";
    hideButton.style.cursor = "pointer";

    // ud654uc0b4ud45c uc218uc9c1uc120 ubc0f ud654uc0b4ud45c uc0c9uc0c1 uc5c5ub370uc774ud2b8
    const verticalLine = hideButton.querySelector("div > div:first-child");
    const arrowContainer = hideButton.querySelector("div > div:last-child");

    if (verticalLine && arrowContainer) {
      const arrowColor = isDarkMode ? "#ffffff" : "#666666";
      verticalLine.style.backgroundColor = arrowColor;

      const arrowTop = arrowContainer.querySelector("div:first-child");
      const arrowBottom = arrowContainer.querySelector("div:last-child");

      if (arrowTop && arrowBottom) {
        arrowTop.style.backgroundColor = arrowColor;
        arrowBottom.style.backgroundColor = arrowColor;
      }
    }
  }

  // 'Show TOC' 버튼 스타일 업데이트
  if (showTOCButton) {
    showTOCButton.style.backgroundColor = isDarkMode ? "#333333" : "#f0f0f0";
    showTOCButton.style.border = isDarkMode
      ? "1px solid #555555"
      : "1px solid #cccccc";
    showTOCButton.style.borderRight = "none";
    showTOCButton.style.cursor = "pointer";

    // ud654uc0b4ud45c uc0dduc131 uc0c1uc120 uc218uc9c1uc120 uc0dduc131
    const arrowLine = showTOCButton.querySelector("div > div:first-child");
    const arrowContainer = showTOCButton.querySelector("div > div:last-child");

    if (arrowLine && arrowContainer) {
      const arrowColor = isDarkMode ? "#ffffff" : "#666666";
      arrowLine.style.backgroundColor = arrowColor;

      const arrowTop = arrowContainer.querySelector("div:first-child");
      const arrowBottom = arrowContainer.querySelector("div:last-child");

      if (arrowTop && arrowBottom) {
        arrowTop.style.backgroundColor = arrowColor;
        arrowBottom.style.backgroundColor = arrowColor;
      }
    }
  }
}

// Remove TOC
function removeTOC() {
  if (tocContainer) {
    tocContainer.remove();
    tocContainer = null;
  }
  if (showTOCButton) {
    showTOCButton.remove();
    showTOCButton = null;
  }
  tocVisible = true;
  disconnectMainObserver();
}

// Update TOC content
function updateTOC() {
  if (!tocEnabled || !tocContainer) {
    console.log(
      "TOC is not enabled or container does not exist, exiting updateTOC",
    );
    return;
  }

  // Check if translations are available
  if (typeof translations === "undefined" || !translations[selectedLanguage]) {
    console.log("Translations not available yet, retrying in 100ms");
    setTimeout(updateTOC, 100);
    return;
  }

  const tocList = tocContainer.querySelector("ul");
  if (!tocList) {
    console.log("TOC list element not found");
    return;
  }

  tocList.innerHTML = ""; // Clear existing list

  // TOC 제목 업데이트
  const tocTitleElement = tocContainer.querySelector("div:first-child > div");
  if (tocTitleElement) {
    try {
      tocTitleElement.textContent =
        translations[selectedLanguage].tableOfContents;
    } catch (error) {
      console.log("Error updating TOC title:", error);
    }
  }

  // Select all article elements
  const articles = document.querySelectorAll("main article");
  let userQuestionCount = 0;
  articles.forEach((article, index) => {
    // Assistant messages contain div.markdown
    const isAssistantMessage = article.querySelector("div.markdown");
    if (!isAssistantMessage) {
      // User message content is in div.whitespace-pre-wrap
      const contentElement = article.querySelector("div.whitespace-pre-wrap");
      if (contentElement) {
        userQuestionCount++;
        const questionText = contentElement.textContent.trim();

        // 사용 가능한 최대 텍스트 길이 계산 (TOC 너비에 따라 변경)
        const maxChars = Math.floor(tocWidth / 10); // 대략 10px당 1글자로 계산

        // 항목의 고유 ID 생성 (페이지 URL과 인덱스 결합)
        const itemId = `${window.location.pathname}-${index}`;

        // 사용자 정의 이름이 있는지 확인
        const customName = customTOCNames[itemId];

        let displayText = customName || questionText;
        const shortText =
          displayText.length > maxChars
            ? displayText.substring(0, maxChars) + "..."
            : displayText;

        const tocItem = document.createElement("li");
        tocItem.style.marginBottom = "5px";
        tocItem.style.position = "relative";
        tocItem.dataset.id = itemId;
        tocItem.dataset.originalText = questionText;

        const tocLink = document.createElement("a");
        tocLink.href = "#";
        tocLink.textContent = shortText;
        tocLink.dataset.articleIndex = index; // Store index for reference
        tocLink.style.textDecoration = "none";
        tocLink.style.cursor = "pointer";
        tocLink.style.whiteSpace = "nowrap";
        tocLink.style.overflow = "hidden";
        tocLink.style.textOverflow = "ellipsis";
        tocLink.style.display = "block";
        tocLink.style.paddingRight = "25px"; // 연필 아이콘을 위한 공간 확보

        tocLink.addEventListener("click", (e) => {
          e.preventDefault();
          contentElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        });

        // 연필 아이콘 생성 (SVG 파일 사용)
        const editIcon = document.createElement("div");

        // SVG 파일을 img 태그로 불러오기
        const imgElement = document.createElement("img");
        imgElement.src = chrome.runtime.getURL("icons/edit.svg");
        imgElement.style.width = "16px";
        imgElement.style.height = "16px";
        imgElement.style.opacity = "0.6"; // 연한 회색 효과를 위해 투명도 조절
        imgElement.style.filter = "grayscale(100%)"; // 흑백 필터 적용

        editIcon.appendChild(imgElement);
        editIcon.style.position = "absolute";
        editIcon.style.right = "2px";
        editIcon.style.top = "50%";
        editIcon.style.transform = "translateY(-50%)";
        editIcon.style.cursor = "pointer";
        editIcon.style.opacity = "0";
        editIcon.style.transition = "opacity 0.2s ease";

        // 항목에 호버 시 연필 아이콘 표시
        tocItem.addEventListener("mouseenter", () => {
          editIcon.style.opacity = "1";
        });

        tocItem.addEventListener("mouseleave", () => {
          editIcon.style.opacity = "0";
        });

        // 항목 수정 상태 관리 변수
        let isEditing = false;

        // 연필 아이콘 클릭 시 인라인 편집 기능
        editIcon.addEventListener("click", (e) => {
          e.stopPropagation();

          if (isEditing) return; // 이미 편집 중이면 무시
          isEditing = true;

          // 기존 텍스트 저장
          const currentName = customTOCNames[itemId] || questionText;

          // 기존 텍스트 링크 숨기기
          tocLink.style.display = "none";

          // 인라인 편집을 위한 입력 요소 생성
          const inputElement = document.createElement("input");
          inputElement.type = "text";
          inputElement.value = currentName;
          inputElement.style.width = "90%";
          inputElement.style.border = "1px solid #ccc";
          inputElement.style.borderRadius = "4px";
          inputElement.style.padding = "2px 5px";
          inputElement.style.fontSize = "12px";
          inputElement.style.outline = "none";

          // 에디트 아이콘 숨기기
          editIcon.style.display = "none";

          // 클릭 이벤트 막기
          inputElement.addEventListener("click", (e) => {
            e.stopPropagation();
          });

          // 엔터 키 처리
          inputElement.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              completeEdit();
            } else if (e.key === "Escape") {
              cancelEdit();
            }
          });

          // 포커스 잃을 때 편집 완료
          inputElement.addEventListener("blur", () => {
            // uc57duac04uc758 uc9c0uc5f0uc744 uc8fcuc5b4 Enter ud0a4 uc774ubca4ud2b8uac00 uba3cuc800 ucc98ub9acub418ub3c4ub85d ud568
            setTimeout(() => {
              if (isEditing) {
                completeEdit();
              }
            }, 100);
          });

          // 편집 완료 함수
          function completeEdit() {
            if (!isEditing) return; // uc774ubbf8 ud3b8uc9d1uc774 uc885ub8ccub418uc5c8ub2e4uba74 uc544ubb34 uac83ub3c4 ud558uc9c0 uc54auc74c

            const newName = inputElement.value.trim();
            if (newName !== "" && newName !== currentName) {
              // uc0c8 uc774ub984 uc800uc7a5
              customTOCNames[itemId] = newName;

              // uc2a4ud1a0ub9acuc9c0uc5d0 uc800uc7a5
              chrome.storage.sync.set({ customTOCNames: customTOCNames });

              // TOC uc5c5ub370uc774ud2b8
              isEditing = false;
              updateTOC();
            } else {
              cancelEdit();
            }
          }

          // 편집 취소 함수
          function cancelEdit() {
            if (!isEditing) return; // uc774ubbf8 ud3b8uc9d1uc774 uc885ub8ccub418uc5c8ub2e4uba74 uc544ubb34 uac83ub3c4 ud558uc9c0 uc54auc74c

            tocLink.style.display = "block";

            // uc694uc18cuac00 uc5ecuc804ud788 DOMuc5d0 uc874uc7acud558ub294uc9c0 ud655uc778
            if (inputElement.parentNode) {
              inputElement.remove();
            }

            editIcon.style.display = "block";
            isEditing = false;
          }

          // 입력 요소 추가
          tocItem.insertBefore(inputElement, tocLink);
          inputElement.focus();
          inputElement.select();
        });

        tocItem.appendChild(tocLink);
        tocItem.appendChild(editIcon);
        tocList.appendChild(tocItem);
      }
    }
  });
  if (userQuestionCount > 0) {
    if (tocVisible) {
      tocContainer.style.display = "block";
    } else {
      tocContainer.style.display = "none";
    }
  } else {
    tocContainer.style.display = "none"; // 질문이 없을 때 TOC 숨김
  }
  updateTOCStyle(isDarkMode);
}

// ud56dubaa9 uc774ub984 uc800uc7a5uc744 uc704ud55c ubcc0uc218 ucd94uac00
let customTOCNames = {};

// uc800uc7a5ub41c uc0acuc6a9uc790 uc815uc758 ud56dubaa9 uc774ub984 ub85cub4dc
chrome.storage.sync.get(["customTOCNames"], (result) => {
  if (result.customTOCNames) {
    customTOCNames = result.customTOCNames;
  }
});

// Function to observe changes in the main content area
let mainObserver = null;
function observeMainContainer() {
  const mainContainer = document.querySelector("main");
  if (!mainContainer) {
    return;
  }

  if (mainObserver) {
    mainObserver.disconnect();
  }

  mainObserver = new MutationObserver((mutationsList, observer) => {
    updateTOC();
  });

  const config = { childList: true, subtree: true };
  mainObserver.observe(mainContainer, config);
}

function disconnectMainObserver() {
  if (mainObserver) {
    mainObserver.disconnect();
    mainObserver = null;
  }
}

// Function to wait for 'main' element and initialize TOC
function waitForMainAndInitializeTOC() {
  if (document.querySelector("main")) {
    initializeTOC();
    if (tocEnabled && tocVisible) {
      showTOC();
      if (showTOCButton) {
        showTOCButton.style.display = "none";
      }
    }
  } else {
    const bodyObserver = new MutationObserver((mutationsList, observer) => {
      for (const mutation of mutationsList) {
        if (mutation.type === "childList") {
          if (document.querySelector("main")) {
            observer.disconnect();
            initializeTOC();
            if (tocEnabled && tocVisible) {
              showTOC();
              if (showTOCButton) {
                showTOCButton.style.display = "none";
              }
            }
            break;
          }
        }
      }
    });

    bodyObserver.observe(document.body, { childList: true, subtree: true });
  }
}

// Function to detect URL changes
function observeUrlChange() {
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;

      if (tocEnabled) {
        removeTOC();
        waitForMainAndInitializeTOC();
      }
    }
  }, 1000);
}

// Answer generation status functions (updated)
function isGenerating() {
  const stopButton = document.querySelector(
    'button[data-testid="stop-button"]',
  );
  return stopButton !== null;
}

function isCompleted() {
  const speechButton = document.querySelector(
    'button[data-testid="composer-speech-button"]',
  );
  const sendButton = document.querySelector(
    'button[data-testid="send-button"]',
  );
  return speechButton !== null || sendButton !== null;
}

let generating = false;

// Notification sound MutationObserver callback
const notificationObserverCallback = function (mutationsList, observer) {
  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      if (isGenerating()) {
        if (!generating) {
          generating = true;
        }
      } else if (generating && isCompleted()) {
        generating = false;
        playSound();
      }
    }
  }
};

// Set up the notification observer
const notificationObserver = new MutationObserver(notificationObserverCallback);
const notificationTargetNode = document.body;

if (notificationTargetNode) {
  const config = { childList: true, subtree: true };
  notificationObserver.observe(notificationTargetNode, config);
}

// Listen for messages from the extension's background script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateSettings") {
    const { tocEnabled: newTocEnabled, tocVisible: newTocVisible } = message;
    console.log("Received settings update:", { newTocEnabled, newTocVisible });

    const tocEnabledChanged = tocEnabled !== newTocEnabled;
    const tocVisibleChanged = tocVisible !== newTocVisible;

    tocEnabled = newTocEnabled;
    tocVisible = newTocVisible;

    if (tocEnabledChanged) {
      if (tocEnabled) {
        createTOCIfNotExists();
        if (tocVisible) {
          showTOC();
        }
      } else {
        hideTOC();
      }
    } else if (tocVisibleChanged && tocEnabled) {
      if (tocVisible) {
        showTOC();
      } else {
        hideTOC();
      }
    }

    sendResponse({ status: "Settings updated" });
  }
  return true; // Indicate async response
});

function createTOCIfNotExists() {
  if (!tocContainer) {
    createTOC();
  }
}
