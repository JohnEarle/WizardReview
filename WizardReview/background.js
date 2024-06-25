let storedUsernames = [];
let knownUsernames = new Set();

chrome.runtime.onInstalled.addListener(() => {
  console.log('User Rating Extension installed.');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateUsernames') {
    const newUsers = request.usernames.filter(username => !knownUsernames.has(username));
    const leavingUsers = [...knownUsernames].filter(username => !request.usernames.includes(username));
    
    newUsers.forEach(username => knownUsernames.add(username));
    leavingUsers.forEach(username => knownUsernames.delete(username));

    storedUsernames = [...knownUsernames];

    if (newUsers.length > 0) {
      console.log('New users:', newUsers);
    }

    if (leavingUsers.length > 0) {
      console.log('Leaving users:', leavingUsers);
    }

    console.log('Current users:', storedUsernames);

    sendResponse({ success: true, usernames: storedUsernames });
  } else if (request.action === 'getUsernames') {
    sendResponse({ usernames: storedUsernames });
  }
});
