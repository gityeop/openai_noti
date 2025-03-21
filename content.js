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
  showTOCButton.textContent = "🙋‍♂️";
  showTOCButton.style.position = "fixed";
  showTOCButton.style.top = "65px"; // 필요에 따라 조정
  showTOCButton.style.right = "0px"; // 필요에 따라 조정
  showTOCButton.style.zIndex = "1000";
  showTOCButton.style.display = "none"; // 초기에는 숨김
  showTOCButton.style.borderTopLeftRadius = "10px"; // 왼쪽 위 모서리
  showTOCButton.style.borderBottomLeftRadius = "10px"; // 왼쪽 아래 모서리
  showTOCButton.style.fontSize = "15px";
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
  tocContainer.style.top = "70px";
  tocContainer.style.right = "10px";
  tocContainer.style.width = tocWidth + "px";
  tocContainer.style.maxHeight = "80vh";
  tocContainer.style.overflowY = "auto";
  tocContainer.style.padding = "10px";
  tocContainer.style.boxSizing = "border-box";
  tocContainer.style.borderRadius = "5px";
  tocContainer.style.zIndex = "999";
  tocContainer.style.display = "none";
  tocContainer.style.transition = "all 0.3s ease";
  tocContainer.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)";

  const tocHeader = document.createElement("div");
  tocHeader.style.display = "flex";
  tocHeader.style.justifyContent = "space-between";
  tocHeader.style.alignItems = "center";
  tocHeader.style.marginBottom = "10px";

  const tocTitle = document.createElement("h3");
  tocTitle.textContent = translations[selectedLanguage].tableOfContents;
  tocTitle.style.margin = "0";
  tocTitle.style.padding = "0";

  const tocCloseButton = document.createElement("button");
  tocCloseButton.textContent = "×";
  tocCloseButton.style.background = "none";
  tocCloseButton.style.border = "none";
  tocCloseButton.style.cursor = "pointer";
  tocCloseButton.style.fontSize = "20px";
  tocCloseButton.style.padding = "0";
  tocCloseButton.style.lineHeight = "1";
  tocCloseButton.addEventListener("click", () => {
    hideTOC();
    showTOCButton.style.display = "block";
    tocVisible = false;
  });

  tocHeader.appendChild(tocTitle);
  tocHeader.appendChild(tocCloseButton);
  tocContainer.appendChild(tocHeader);

  const tocList = document.createElement("ul");
  tocList.style.listStyleType = "decimal";
  tocList.style.paddingLeft = "20px";
  tocList.style.margin = "0";
  tocContainer.appendChild(tocList);

  const tocResizer = document.createElement("div");
  tocResizer.id = "toc-resizer";
  tocResizer.style.position = "absolute";
  tocResizer.style.left = "0";
  tocResizer.style.top = "0";
  tocResizer.style.width = "5px";
  tocResizer.style.height = "100%";
  tocResizer.style.cursor = "ew-resize";
  tocResizer.style.backgroundColor = "transparent";

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
}

function showTOC() {
  tocContainer.style.display = "block";
  tocContainer.style.animation = "none";
  requestAnimationFrame(() => {
    tocContainer.style.animation = "slideIn 0.3s forwards";
  });
}

function hideTOC() {
  tocContainer.style.animation = "none";
  requestAnimationFrame(() => {
    tocContainer.style.animation = "slideOut 0.3s forwards";
  });
  tocContainer.addEventListener("animationend", onAnimationEnd);

  function onAnimationEnd() {
    tocContainer.style.display = "none";
    tocContainer.style.transform = "translateX(100%)";
    tocContainer.style.opacity = "0";
    tocContainer.removeEventListener("animationend", onAnimationEnd);
  }
}

// Window resize handler
function onWindowResize() {
  if (tocContainer) {
    tocContainer.style.left = calculateLeftPosition() + "px";
  }
}

// Update TOC style based on dark mode
function updateTOCStyle(isDarkMode) {
  if (!tocContainer) {
    return;
  }

  if (isDarkMode) {
    tocContainer.style.backgroundColor = "#1e1e1e";
    tocContainer.style.color = "#ffffff";
    tocContainer.style.border = "1px solid #555555";
  } else {
    tocContainer.style.backgroundColor = "#ffffff";
    tocContainer.style.color = "#333333";
    tocContainer.style.border = "1px solid #cccccc";
  }

  const tocLinks = tocContainer.querySelectorAll("a");
  tocLinks.forEach((link) => {
    if (isDarkMode) {
      link.style.color = "#4ea8de";
    } else {
      link.style.color = "#007bff";
    }
    link.style.textDecoration = "none";
    link.style.cursor = "pointer";
  });

  const hideButton = tocContainer.querySelector("button");
  if (hideButton) {
    hideButton.style.backgroundColor = isDarkMode ? "#333333" : "#f0f0f0";
    hideButton.style.color = isDarkMode ? "#ffffff" : "#333333";
    hideButton.style.border = isDarkMode
      ? "1px solid #555555"
      : "1px solid #cccccc";
    hideButton.style.padding = "5px 10px";
    hideButton.style.cursor = "pointer";
  }

  if (showTOCButton) {
    showTOCButton.style.backgroundColor = isDarkMode ? "#333333" : "#f0f0f0";
    showTOCButton.style.color = isDarkMode ? "#ffffff" : "#333333";
    showTOCButton.style.border = isDarkMode
      ? "1px solid #555555"
      : "1px solid #cccccc";
    showTOCButton.style.padding = "5px 10px";
    showTOCButton.style.cursor = "pointer";
  }
  tocContainer.style.transform = tocVisible
    ? "translateX(0)"
    : "translateX(100%)";
  tocContainer.style.opacity = tocVisible ? "1" : "0";
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
  if (!tocContainer || !tocEnabled) {
    console.log(
      "TOC is not enabled or container does not exist, exiting updateTOC",
    );
    return;
  }

  const tocList = tocContainer.querySelector("ul");
  if (!tocList) {
    console.log("TOC list element not found");
    return;
  }

  tocList.innerHTML = "";

  const articles = document.querySelectorAll("main article");
  let userQuestionCount = 0;
  articles.forEach((article, index) => {
    const isAssistantMessage = article.querySelector("div.markdown");
    if (!isAssistantMessage) {
      const contentElement = article.querySelector("div.whitespace-pre-wrap");
      if (contentElement) {
        userQuestionCount++;
        const questionText = contentElement.textContent.trim();

        const maxChars = Math.floor(tocWidth / 10);

        const shortText =
          questionText.length > maxChars
            ? questionText.substring(0, maxChars) + "..."
            : questionText;

        const tocItem = document.createElement("li");
        tocItem.style.marginBottom = "5px";

        const tocLink = document.createElement("a");
        tocLink.href = "#";
        tocLink.textContent = shortText;
        tocLink.dataset.articleIndex = index;
        tocLink.style.textDecoration = "none";
        tocLink.style.cursor = "pointer";
        tocLink.style.display = "block";
        tocLink.style.whiteSpace = "nowrap";
        tocLink.style.overflow = "hidden";
        tocLink.style.textOverflow = "ellipsis";

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
    if (tocVisible) {
      tocContainer.style.display = "block";
    } else {
      tocContainer.style.display = "none";
    }
  } else {
    tocContainer.style.display = "none";
  }
  updateTOCStyle(isDarkMode);
}

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
  } else {
    const bodyObserver = new MutationObserver((mutationsList, observer) => {
      for (const mutation of mutationsList) {
        if (mutation.type === "childList") {
          if (document.querySelector("main")) {
            observer.disconnect();
            initializeTOC();
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
