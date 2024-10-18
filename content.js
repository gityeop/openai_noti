// content.js

let audio = null;
let soundEnabled = true;
let volume = 0.5;
let selectedSound = "notification_1.wav"; // Default sound file
let tocEnabled = false;
let tocContainer = null;
let lastUrl = window.location.href; // For detecting URL changes

// Load initial settings
chrome.storage.sync.get(
  ["volume", "soundEnabled", "selectedSound", "tocEnabled"],
  (result) => {
    console.log("Initial settings loaded:", result);
    if (result.volume !== undefined) {
      volume = result.volume / 100;
      console.log("Volume set to:", volume);
    }
    if (result.soundEnabled !== undefined) {
      soundEnabled = result.soundEnabled;
      console.log("Sound enabled:", soundEnabled);
    }
    if (result.selectedSound !== undefined) {
      selectedSound = result.selectedSound;
      console.log("Selected sound:", selectedSound);
    }
    if (result.tocEnabled !== undefined) {
      tocEnabled = result.tocEnabled;
      console.log("TOC enabled:", tocEnabled);
    }

    // Initialize TOC after loading settings
    if (tocEnabled) {
      initializeTOC();
    }

    // Start observing URL changes
    observeUrlChange();
  },
);

// Update settings when changed
chrome.storage.onChanged.addListener((changes, area) => {
  console.log("Storage changes detected:", changes, "Area:", area);
  if (area === "sync") {
    if (changes.soundEnabled) {
      soundEnabled = changes.soundEnabled.newValue;
      console.log("Sound enabled changed to:", soundEnabled);
    }
    if (changes.volume) {
      volume = changes.volume.newValue / 100;
      console.log("Volume changed to:", volume);
      if (audio) {
        audio.volume = volume;
        console.log("Audio volume updated to:", volume);
      }
    }
    if (changes.selectedSound) {
      selectedSound = changes.selectedSound.newValue;
      console.log("Selected sound changed to:", selectedSound);
      if (audio) {
        audio.src = chrome.runtime.getURL(`sounds/${selectedSound}`);
        audio.load();
        console.log("Audio source updated to:", audio.src);
      }
    }
    if (changes.tocEnabled) {
      tocEnabled = changes.tocEnabled.newValue;
      console.log("TOC enabled changed to:", tocEnabled);
      if (tocEnabled) {
        initializeTOC();
      } else {
        removeTOC();
      }
    }
  }
});

// Function to play the notification sound
function playSound() {
  console.log("playSound called");
  if (!soundEnabled) {
    console.log("Sound is disabled, exiting playSound");
    return; // Exit if sound notifications are disabled
  }

  if (!audio) {
    const soundURL = chrome.runtime.getURL(`sounds/${selectedSound}`);
    console.log("Creating new Audio object with URL:", soundURL);
    audio = new Audio(soundURL);
    audio.volume = volume;
    audio.addEventListener("ended", () => {
      audio.currentTime = 0; // Reset after playback
      console.log("Audio ended, currentTime reset to 0");
    });
  } else {
    audio.volume = volume;
    console.log("Audio volume set to:", volume);
    // Update src if the sound file has changed
    const newSoundURL = chrome.runtime.getURL(`sounds/${selectedSound}`);
    if (audio.src !== newSoundURL) {
      console.log("Updating audio source to:", newSoundURL);
      audio.src = newSoundURL;
      audio.load();
    }
  }

  audio
    .play()
    .then(() => {
      console.log("Audio playback started");
    })
    .catch((error) => {
      console.error("Error playing audio:", error);
    });
}

let isDarkMode =
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

console.log("Initial isDarkMode:", isDarkMode);

// Detect system dark mode changes and update styles
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    isDarkMode = e.matches;
    console.log("System dark mode changed, isDarkMode:", isDarkMode);
    updateTOCStyle(isDarkMode);
  });

// Function to calculate TOC left position
function calculateLeftPosition() {
  const minLeft = 20;
  const maxLeft = window.innerWidth - 169; // 160px width + padding + margin
  let leftPosition = window.innerWidth;
  leftPosition = Math.max(minLeft, Math.min(leftPosition, maxLeft));
  console.log("Calculated TOC left position:", leftPosition);
  return leftPosition;
}

// Initialize TOC
function initializeTOC() {
  console.log("initializeTOC called");
  createTOC();
  updateTOC();

  // Observe changes in the main content area
  observeMainContainer();

  // Listen for window resize to adjust TOC position
  window.addEventListener("resize", onWindowResize);
}

// Create TOC container
function createTOC() {
  console.log("createTOC called");
  if (tocContainer) {
    console.log("TOC already exists, exiting createTOC");
    return; // TOC already exists
  }

  tocContainer = document.createElement("div");
  tocContainer.id = "chatnoti-toc";
  tocContainer.style.position = "fixed";
  tocContainer.style.top = "56px";
  tocContainer.style.left = calculateLeftPosition() + "px";
  tocContainer.style.width = "160px";
  tocContainer.style.maxHeight = "80vh";
  tocContainer.style.overflowY = "auto";
  tocContainer.style.borderRadius = "8px";
  tocContainer.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
  tocContainer.style.padding = "10px";
  tocContainer.style.zIndex = "1000";
  tocContainer.style.fontSize = "12px";

  // Apply styles based on system mode
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
  console.log("TOC created and added to document body");
}

// Window resize handler
function onWindowResize() {
  console.log("Window resized");
  if (tocContainer) {
    tocContainer.style.left = calculateLeftPosition() + "px";
    console.log("TOC left position updated to:", tocContainer.style.left);
  }
}

// Update TOC style based on dark mode
function updateTOCStyle(isDarkMode) {
  console.log("updateTOCStyle called with isDarkMode:", isDarkMode);
  if (!tocContainer) {
    console.log("No TOC container, exiting updateTOCStyle");
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
    console.log("Updated link style for:", link.textContent);
  });
}

// Remove TOC
function removeTOC() {
  console.log("removeTOC called");
  if (tocContainer) {
    tocContainer.remove();
    tocContainer = null;
    console.log("TOC removed");
  }
  disconnectMainObserver();
}

// Update TOC content
function updateTOC() {
  console.log("updateTOC called");
  if (!tocEnabled || !tocContainer) {
    console.log(
      "TOC is not enabled or container does not exist, exiting updateTOC",
    );
    return;
  }

  const tocList = tocContainer.querySelector("ul");
  tocList.innerHTML = ""; // Clear existing list

  // Select all article elements
  const articles = document.querySelectorAll("main article");
  console.log("Found articles:", articles.length);

  articles.forEach((article, index) => {
    // Assistant messages contain div.markdown
    const isAssistantMessage = article.querySelector("div.markdown");
    if (!isAssistantMessage) {
      // User message content is in div.whitespace-pre-wrap
      const contentElement = article.querySelector("div.whitespace-pre-wrap");
      if (contentElement) {
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
        tocLink.dataset.articleIndex = index; // Store index for reference
        tocLink.style.textDecoration = "none";
        tocLink.style.cursor = "pointer";

        tocLink.addEventListener("click", (e) => {
          e.preventDefault();
          contentElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          console.log("TOC link clicked, scrolling to content");
        });

        tocItem.appendChild(tocLink);
        tocList.appendChild(tocItem);
        console.log("Added TOC item:", shortText);
      }
    }
  });
  updateTOCStyle(isDarkMode);
}

// Function to observe changes in the main content area
let mainObserver = null;
function observeMainContainer() {
  const mainContainer = document.querySelector("main");
  if (!mainContainer) {
    console.log("Main container not found, cannot observe.");
    return;
  }

  // Disconnect previous observer if any
  if (mainObserver) {
    mainObserver.disconnect();
  }

  mainObserver = new MutationObserver((mutationsList, observer) => {
    console.log("Main content mutated");
    updateTOC();
  });

  const config = { childList: true, subtree: true };
  mainObserver.observe(mainContainer, config);
  console.log("Started observing main container for mutations");
}

function disconnectMainObserver() {
  if (mainObserver) {
    mainObserver.disconnect();
    mainObserver = null;
    console.log("Main observer disconnected");
  }
}

// Function to detect URL changes
function observeUrlChange() {
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      console.log("URL changed from", lastUrl, "to", window.location.href);
      lastUrl = window.location.href;

      // Re-initialize TOC if enabled
      if (tocEnabled) {
        removeTOC();
        initializeTOC();
      }
    }
  }, 1000); // Check every second
}

// Answer generation status functions (unchanged)
function isGenerating() {
  const generatingElement = document.querySelector(
    "svg.icon-lg:not(.mx-2):not(.text-token-text-secondary)",
  );
  return generatingElement;
}

function isCompleted() {
  const completedElement = document.querySelector("div.min-w-8 svg.icon-2xl");
  return completedElement;
}

let generating = false;

// Notification sound MutationObserver callback
const notificationObserverCallback = function (mutationsList, observer) {
  console.log("NotificationObserver callback called");

  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      console.log(
        "Child list mutation detected (NotificationObserver):",
        mutation,
      );
      if (isGenerating()) {
        if (!generating) {
          generating = true; // Answer is generating
          console.log("Answer is generating");
        }
      } else if (generating && isCompleted()) {
        generating = false; // Answer generation completed
        console.log("Answer generation completed");
        playSound(); // Play notification sound
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
  console.log("NotificationObserver started observing notificationTargetNode");
}

// Event listener for page load
window.addEventListener("load", () => {
  console.log("Page fully loaded");

  // Initialize TOC if enabled
  if (tocEnabled) {
    initializeTOC();
  }

  // Start observing URL changes
  observeUrlChange();
});
