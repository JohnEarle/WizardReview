// Ensure Firebase is initialized only once
if (!firebase.apps.length) {
  const firebaseConfig = {
    apiKey: "AIzaSyBCVZw3P2D664v9q9u6OT2vyZS3UzUuwrw",
    authDomain: "wizardreview.firebaseapp.com",
    projectId: "wizardreview",
    storageBucket: "wizardreview.appspot.com",
    messagingSenderId: "558031816813",
    appId: "1:558031816813:web:7c7ec5313a960ab9569764",
    measurementId: "G-YHW8P140K9"
  };
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
  const authContainer = document.getElementById('auth-container');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginButton = document.getElementById('login');
  const signupButton = document.getElementById('signup');
  const signoutButton = document.getElementById('signout'); // Sign out button
  const userList = document.getElementById('user-list');

  // Set auth persistence
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).then(() => {
    console.log('Auth persistence set to LOCAL');
  }).catch(error => {
    console.error('Error setting auth persistence:', error);
  });

  // Authentication event listeners
  loginButton.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    auth.signInWithEmailAndPassword(email, password).then(userCredential => {
      console.log('Logged in', userCredential.user);
      authContainer.style.display = 'none';
      signoutButton.style.display = 'block'; // Show sign-out button
      displayUserList();
    }).catch(error => {
      console.error('Error logging in:', error);
    });
  });

  signupButton.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    auth.createUserWithEmailAndPassword(email, password).then(userCredential => {
      console.log('Signed up', userCredential.user);
      authContainer.style.display = 'none';
      signoutButton.style.display = 'block'; // Show sign-out button
      displayUserList();
    }).catch(error => {
      console.error('Error signing up:', error);
    });
  });

  signoutButton.addEventListener('click', () => {
    auth.signOut().then(() => {
      console.log('Signed out');
      authContainer.style.display = 'block';
      signoutButton.style.display = 'none'; // Hide sign-out button
      userList.innerHTML = ''; // Clear user list
    }).catch(error => {
      console.error('Error signing out:', error);
    });
  });

  // Monitor auth state
  auth.onAuthStateChanged(user => {
    if (user) {
      // User is signed in
      console.log('User is signed in:', user);
      authContainer.style.display = 'none';
      signoutButton.style.display = 'block'; // Show sign-out button
      displayUserList();
      document.getElementById('user-list').style.display = 'block';
    } else {
      // User is signed out
      console.log('User is signed out');
      authContainer.style.display = 'block';
      signoutButton.style.display = 'none'; // Hide sign-out button
      document.getElementById('user-list').style.display = 'none';
    }
  });

  // Function to display the user list and rating UI
  function displayUserList() {
    console.log('Fetching usernames from background script...');
    chrome.runtime.sendMessage({ action: 'getUsernames' }, response => {
      if (response && response.usernames) {
        console.log('Usernames received:', response.usernames);
        const usernames = response.usernames;
        userList.innerHTML = ''; // Clear existing content
        usernames.forEach(username => {
          const userDiv = document.createElement('div');
          userDiv.className = 'rating-container';

          const usernameLabel = document.createElement('div');
          usernameLabel.className = 'username';
          usernameLabel.innerText = username;
          userDiv.appendChild(usernameLabel);

          const goodButton = document.createElement('button');
          goodButton.className = 'good-button';
          goodButton.innerText = 'Good';
          goodButton.dataset.ratingValue = 'good';

          const badButton = document.createElement('button');
          badButton.className = 'bad-button';
          badButton.innerText = 'Bad';
          badButton.dataset.ratingValue = 'bad';

          const commentInput = document.createElement('textarea');
          commentInput.className = 'comment-input';
          commentInput.placeholder = 'Add a comment';

          userDiv.appendChild(goodButton);
          userDiv.appendChild(badButton);
          userDiv.appendChild(commentInput);
          userList.appendChild(userDiv);

          // Fetch existing rating
          fetchRating(username, goodButton, badButton, commentInput);

          // Add event listeners for rating buttons
          [goodButton, badButton].forEach(button => {
            button.addEventListener('click', () => {
              const ratingValue = button.dataset.ratingValue;
              const comment = commentInput.value;

              if (auth.currentUser) {
                auth.currentUser.getIdToken().then(idToken => {
                  fetch('https://us-central1-wizardreview.cloudfunctions.net/submitRating', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({
                      username: username,
                      rating: ratingValue,
                      comment: comment
                    })
                  })
                  .then(response => {
                    if (!response.ok) {
                      return response.text().then(text => { throw new Error(text); });
                    }
                    return response.json();
                  })
                  .then(data => {
                    console.log(data);
                    fetchRating(username, goodButton, badButton, commentInput);
                  })
                  .catch(error => {
                    console.error('Error submitting rating:', error);
                  });
                });
              } else {
                console.error('No authenticated user found');
              }
            });
          });
        });
        // Store the state in localStorage
        localStorage.setItem('userListState', JSON.stringify(usernames));
      } else {
        console.error('Failed to fetch usernames.');
      }
    });
  }

  // Function to fetch existing rating
  function fetchRating(username, goodButton, badButton, commentInput) {
    db.collection('userRatings').doc(username).get().then(doc => {
      if (doc.exists) {
        const data = doc.data();
        const goodVotes = data.good || 0;
        const badVotes = data.bad || 0;

        goodButton.innerText = `Good (${goodVotes})`;
        badButton.innerText = `Bad (${badVotes})`;

        if (auth.currentUser) {
          console.log('Current user UID:', auth.currentUser.uid);
          // Highlight the previous rating and set comment
          if (data.ratedBy && data.ratedBy[auth.currentUser.uid]) {
            const previousRating = data.ratedBy[auth.currentUser.uid];
            const previousComment = data.comments[auth.currentUser.uid];
            commentInput.value = previousComment || '';

            if (previousRating === 'good') {
              goodButton.classList.add('selected');
              badButton.classList.remove('selected');
            } else {
              goodButton.classList.remove('selected');
              badButton.classList.add('selected');
            }
          }
        } else {
          console.error('No authenticated user found');
        }
      }
    }).catch(error => {
      console.error('Error fetching rating:', error);
    });
  }

  // Initialize MutationObserver to detect DOM changes
  function initMutationObserver() {
    const targetNode = document.querySelector('#root');

    if (targetNode) {
      const observer = new MutationObserver((mutationsList, observer) => {
        for (let mutation of mutationsList) {
          if (mutation.type === 'childList') {
            displayUserList(); // Update the popup content
            break;
          }
        }
      });

      observer.observe(targetNode, { childList: true, subtree: true });
      console.log('MutationObserver has been successfully initialized.');
    } else {
      console.error('Target node for MutationObserver not found. Trying again...');
      setTimeout(initMutationObserver, 1000); // Try again after 1 second
    }
  }

  initMutationObserver(); // Call the function to initialize MutationObserver

  // Restore state from localStorage
  const storedState = localStorage.getItem('userListState');
  if (storedState) {
    const usernames = JSON.parse(storedState);
    userList.innerHTML = ''; // Clear existing content
    usernames.forEach(username => {
      const userDiv = document.createElement('div');
      userDiv.className = 'rating-container';

      const usernameLabel = document.createElement('div');
      usernameLabel.className = 'username';
      usernameLabel.innerText = username;
      userDiv.appendChild(usernameLabel);

      const goodButton = document.createElement('button');
      goodButton.className = 'good-button';
      goodButton.innerText = 'Good';
      goodButton.dataset.ratingValue = 'good';

      const badButton = document.createElement('button');
      badButton.className = 'bad-button';
      badButton.innerText = 'Bad';
      badButton.dataset.ratingValue = 'bad';

      const commentInput = document.createElement('textarea');
      commentInput.className = 'comment-input';
      commentInput.placeholder = 'Add a comment';

      userDiv.appendChild(goodButton);
      userDiv.appendChild(badButton);
      userDiv.appendChild(commentInput);
      userList.appendChild(userDiv);

      // Fetch existing rating
      fetchRating(username, goodButton, badButton, commentInput);

      // Add event listeners for rating buttons
      [goodButton, badButton].forEach(button => {
        button.addEventListener('click', () => {
          const ratingValue = button.dataset.ratingValue;
          const comment = commentInput.value;

          if (auth.currentUser) {
            auth.currentUser.getIdToken().then(idToken => {
              fetch('https://us-central1-wizardreview.cloudfunctions.net/submitRating', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                  username: username,
                  rating: ratingValue,
                  comment: comment
                })
              })
              .then(response => {
                if (!response.ok) {
                  return response.text().then(text => { throw new Error(text); });
                }
                return response.json();
              })
              .then(data => {
                console.log(data);
                fetchRating(username, goodButton, badButton, commentInput);
              })
              .catch(error => {
                console.error('Error submitting rating:', error);
              });
            });
          } else {
            console.error('No authenticated user found');
          }
        });
      });
    });
  }
});
