// Function to extract usernames from the page
function extractUsernames() {
  const usernames = [];
  document.querySelectorAll('div.font-bold.flex.flex-row.truncate.items-end.leading-snug.text-sm').forEach(usernameElement => {
    const username = usernameElement.textContent.trim();
    if (username) {
      usernames.push(username);
    }
  });
  console.log('Extracted usernames:', usernames); // Log extracted usernames for debugging
  return usernames;
}

// Function to check for changes in the player list
function checkPlayerList() {
  const currentUsers = extractUsernames();
  chrome.runtime.sendMessage({
    action: 'updateUsernames',
    usernames: currentUsers
  });
}

// Function to initialize MutationObserver
function initializeObserver() {
  const targetNode = document.querySelector('#root'); // Assuming #root is the main container
  if (targetNode) {
    const observer = new MutationObserver(checkPlayerList);
    observer.observe(targetNode, { childList: true, subtree: true });
    // Initial check
    checkPlayerList();
  } else {
    console.error('Target node for MutationObserver not found');
  }
}

// Function to detect "Game Log" text and initialize the observer
function detectGameLog() {
  const checkForGameLog = setInterval(() => {
    if (document.body.textContent.includes('Game Log')) {
      console.log('Game Log detected');
      clearInterval(checkForGameLog); // Stop checking
      setTimeout(() => {
        console.log('Initializing observer after 5 seconds');
        initializeObserver(); // Initialize observer after 5 seconds
      }, 5000); // Wait for 5 seconds before initializing
    }
  }, 1000); // Check for "Game Log" text every second
}

// Start detecting "Game Log" text
detectGameLog();