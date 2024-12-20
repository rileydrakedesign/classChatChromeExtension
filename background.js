// Listener for extension icon click
chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return; // Ensure tab ID is available

  console.log("Extension icon clicked. Sending message to open chat box.");

  // Send a message to the content script to open the chat box
  chrome.tabs.sendMessage(tab.id, { action: "openChatBox" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Error sending message to content script:", chrome.runtime.lastError.message);
    } else if (response && response.success) {
      console.log("Chat box opened successfully.");
    } else {
      console.error("Failed to open chat box.");
    }
  });
});

// Listener for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sendTextToBackend") {
    const selectedText = message.text;
    console.log("Received text to send to backend:", selectedText);

    // Make the fetch request to the backend
    fetch("http://localhost:3000/api/v1/chat/new", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        'X-Source': 'chrome_extension' // Custom header to identify the source
       },
      credentials: "include",
      body: JSON.stringify({
        message: selectedText,
        class_name: "null",
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch response from the backend.");
        }
        return response.json();
      })
      .then((data) => {
        console.log("Response from backend:", data);
        sendResponse({ success: true, data });
      })
      .catch((error) => {
        console.error("Error sending data to backend:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Indicates that the response is asynchronous
  }
});