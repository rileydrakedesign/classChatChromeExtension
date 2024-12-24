// background.js

// This script manages authentication and server requests.
// It listens for messages from content.js and performs actions like login, auth-check,
// and sending chat messages to the server.

// CHANGES: 
// (1) Added 'mode: "cors"' to fetch calls to ensure cross-origin requests are explicitly allowed.
// (2) Added clarifying comments to highlight that all server interaction is done here with credentials: "include".

async function checkAuthStatus() {
  try {
    // We explicitly set mode: "cors" and credentials: "include"
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

async function handleLogin(email, password) {
  try {
    // We explicitly set mode: "cors" and credentials: "include"
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

async function sendChatMessage(messageText) {
  try {
    // We explicitly set mode: "cors" and credentials: "include"
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
      throw new Error("Failed to fetch response from the backend.");
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Error sending chat message:", error);
    return { success: false, error: error.message };
  }
}

// Listen for messages from content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "checkAuthStatus") {
    checkAuthStatus().then((isAuthenticated) => {
      sendResponse({ authenticated: isAuthenticated });
    });
    return true; // asynchronous response
  }

  if (message.action === "login") {
    handleLogin(message.email, message.password).then(sendResponse);
    return true; // asynchronous response
  }

  if (message.action === "sendChatMessage") {
    sendChatMessage(message.text).then(sendResponse);
    return true; // asynchronous response
  }
});
