// background.js

// This script manages authentication and server requests.
// It listens for messages from content.js and performs actions like login, auth-check,
// and sending chat messages to the server.

// Asynchronous function to check authentication status
async function checkAuthStatus() {
  try {
    // Explicitly set mode: "cors" and credentials: "include"
    const response = await fetch("https://localhost:3000/api/v1/user/auth-status", {
      method: "GET",
      credentials: "include",
      mode: "cors", // ensures cross-origin is handled
    });
    return response.ok; // true if authenticated, false otherwise
  } catch (error) {
    console.error("Error checking auth status:", error);
    return false;
  }
}

// Asynchronous function to handle user login
async function handleLogin(email, password) {
  try {
    // Explicitly set mode: "cors" and credentials: "include"
    const response = await fetch("https://localhost:3000/api/v1/user/login", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      credentials: "include",
      mode: "cors",
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || "Login failed";
      return { success: false, error: errorMessage };
    }
  } catch (error) {
    console.error("Error during login:", error);
    return { success: false, error: "Error occurred during login." };
  }
}

// Asynchronous function to send chat messages
async function sendChatMessage(messageText) {
  try {
    // Explicitly set mode: "cors" and credentials: "include"
    const response = await fetch("https://localhost:3000/api/v1/chat/new", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Source": "chrome_extension" 
       },
      credentials: "include",
      mode: "cors",
      body: JSON.stringify({
        message: messageText,
        class_name: "null",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || "Failed to fetch response from the backend.";
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Error sending chat message:", error);
    return { success: false, error: error.message };
  }
}

// Function to inject or remove the UI in the active tab
function toggleUI(tabId) {
  chrome.tabs.sendMessage(tabId, { action: "toggleUI" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Error sending toggleUI message:", chrome.runtime.lastError.message);
    }
    // Optionally handle the response
  });
}

// Listen for messages from content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "checkAuthStatus") {
    checkAuthStatus().then((isAuthenticated) => {
      sendResponse({ authenticated: isAuthenticated });
    });
    return true; // indicates that the response is asynchronous
  }

  if (message.action === "login") {
    handleLogin(message.email, message.password).then(sendResponse);
    return true; // indicates that the response is asynchronous
  }

  if (message.action === "sendChatMessage") {
    sendChatMessage(message.text).then(sendResponse);
    return true; // indicates that the response is asynchronous
  }
});

// Listen for extension icon clicks to toggle the UI
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    toggleUI(tab.id);
  }
});
