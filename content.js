// content.js

// This script runs in the context of the webpage’s DOM.
// It injects UI elements and communicates with background.js for authentication and data requests.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleUI") {
    const existingContainer = document.getElementById("floatingChatBox") || document.getElementById("extensionLoginForm");
    if (existingContainer) {
      existingContainer.remove();
    } else {
      // Check authentication status before injecting the appropriate UI
      checkAuthStatus().then((isAuthenticated) => {
        if (isAuthenticated) {
          createFloatingChatBox();
        } else {
          createLoginForm();
        }
      });
    }
  }
});

// Function to check authentication status by messaging the background script
function checkAuthStatus() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "checkAuthStatus" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error checking auth status:", chrome.runtime.lastError.message);
        resolve(false);
      } else {
        resolve(response.authenticated);
      }
    });
  });
}

// Create a login form and inject it into the DOM if user is not authenticated
function createLoginForm() {
  if (document.getElementById("extensionLoginForm")) return;

  const container = document.createElement("div");
  container.id = "extensionLoginForm";
  container.style.position = "fixed";
  container.style.top = "20px";
  container.style.right = "20px";
  container.style.zIndex = "9999";
  container.style.background = "white";
  container.style.border = "1px solid #ccc";
  container.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
  container.style.padding = "10px";
  container.style.fontFamily = "Arial, sans-serif";
  container.style.borderRadius = "8px";
  container.style.width = "300px";

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h4 style="margin:0 0 10px 0;">Login to Your Account</h4>
      <button id="closeLoginForm" aria-label="Close Login Form" style="background: transparent; border: none; font-size: 16px; cursor: pointer;">&times;</button>
    </div>
    <input type="email" id="extensionLoginEmail" placeholder="Email" style="width:100%; margin-bottom:10px; padding:5px;" />
    <input type="password" id="extensionLoginPassword" placeholder="Password" style="width:100%; margin-bottom:10px; padding:5px;" />
    <button id="extensionLoginButton" style="width:100%; padding:10px; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer;">Login</button>
    <div id="extensionLoginError" style="margin-top:10px; color:red;"></div>
  `;

  document.body.appendChild(container);

  // Event listener for the login button
  document.getElementById("extensionLoginButton").addEventListener("click", async () => {
    const email = document.getElementById("extensionLoginEmail").value.trim();
    const password = document.getElementById("extensionLoginPassword").value.trim();

    if (!email || !password) {
      displayLoginError("Please fill in both fields.");
      return;
    }

    const result = await loginUser(email, password);
    if (result.success) {
      // Remove login form and show chat box
      container.remove();
      createFloatingChatBox();
    } else {
      displayLoginError(result.error || "Login failed");
    }
  });

  // Event listener for the close button
  document.getElementById("closeLoginForm").addEventListener("click", () => {
    container.remove();
  });
}

// Function to display login errors
function displayLoginError(msg) {
  const errorDiv = document.getElementById("extensionLoginError");
  if (errorDiv) {
    errorDiv.textContent = msg;
  }
}

// Function to handle user login by messaging the background script
function loginUser(email, password) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "login", email, password }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending login message:", chrome.runtime.lastError.message);
        resolve({ success: false, error: "Could not process login request." });
      } else {
        resolve(response);
      }
    });
  });
}

// Create and inject the floating chat box using Shadow DOM if authenticated
function createFloatingChatBox() {
  if (document.getElementById("floatingChatBox")) {
    return; // Chat box already exists
  }

  const container = document.createElement("div");
  container.id = "floatingChatBox";
  container.style.position = "fixed";
  container.style.bottom = "20px";
  container.style.right = "20px";
  container.style.zIndex = "9999";

  const shadow = container.attachShadow({ mode: "open" });

  const chatBox = document.createElement("div");
  chatBox.id = "chatBox";
  chatBox.style.width = "350px";
  chatBox.style.height = "400px";
  chatBox.style.background = "white";
  chatBox.style.border = "1px solid #ccc";
  chatBox.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
  chatBox.style.padding = "10px";
  chatBox.style.fontFamily = "Arial, sans-serif";
  chatBox.style.borderRadius = "8px";
  chatBox.style.overflowY = "auto";

  const style = document.createElement("style");
  style.textContent = `
    #closeChatBox {
      border: none;
      background: red;
      color: white;
      padding: 5px 10px;
      cursor: pointer;
      border-radius: 4px;
    }
    #submitTextButton {
      margin-top: 10px;
      width: 100%;
      background: #007bff;
      color: white;
      border: none;
      padding: 10px;
      cursor: pointer;
      border-radius: 4px;
      font-size: 16px;
    }
    #submitTextButton:hover {
      background: #0056b3;
    }
    textarea {
      width: 100%;
      height: 80px;
      margin-top: 10px;
      padding: 5px;
      resize: none;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
    }
    #responseArea {
      margin-top: 10px;
      max-height: 150px;
      overflow-y: auto;
      font-size: 14px;
      border-top: 1px solid #ccc;
      padding-top: 10px;
    }
    .disabled {
      background: #6c757d !important;
      cursor: not-allowed !important;
    }
    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #007bff;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      animation: spin 2s linear infinite;
      margin-left: 10px;
      display: inline-block;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;

  chatBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h4 style="margin:0;">Chat Assistant</h4>
      <button id="closeChatBox" aria-label="Close Chat Box">X</button>
    </div>
    <textarea id="selectedTextBox" placeholder="Selected text will appear here..." readonly aria-label="Selected Text"></textarea>
    <button id="submitTextButton" aria-label="Submit Selected Text">Submit</button>
    <div id="responseArea" aria-live="polite"></div>
  `;

  shadow.appendChild(style);
  shadow.appendChild(chatBox);
  document.body.appendChild(container);

  // Event listener for the close button
  shadow.getElementById("closeChatBox").addEventListener("click", () => {
    container.remove();
  });

  let isLoading = false;

  // Detect selected text and update the textarea
  document.addEventListener("mouseup", () => {
    const selectedTextBox = shadow.getElementById("selectedTextBox");
    if (!selectedTextBox) return;

    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      selectedTextBox.value = selectedText;
    }
  });

  // Event listener for the submit button
  shadow.getElementById("submitTextButton").addEventListener("click", async () => {
    const selectedTextBox = shadow.getElementById("selectedTextBox");
    const responseArea = shadow.getElementById("responseArea");
    const submitButton = shadow.getElementById("submitTextButton");

    if (!selectedTextBox) return;

    const selectedText = selectedTextBox.value;
    if (!selectedText) {
      alert("Please select some text first.");
      return;
    }

    if (isLoading) {
      alert("Please wait for the current request to complete.");
      return;
    }

    isLoading = true;
    submitButton.disabled = true;
    submitButton.classList.add("disabled");
    responseArea.innerHTML = `<p><em>Submitting...</em> <span class="spinner"></span></p>`;

    const result = await sendChatMessage(selectedText);
    if (result.success) {
      displayResponse(result.data, responseArea);
    } else {
      responseArea.innerHTML = `<p><strong>Error:</strong> ${result.error}</p>`;
    }

    isLoading = false;
    submitButton.disabled = false;
    submitButton.classList.remove("disabled");
    const spinner = responseArea.querySelector(".spinner");
    if (spinner) spinner.remove();
  });

  // Function to display the response from the backend
  function displayResponse(result, responseArea) {
    responseArea.innerHTML = "";
    const assistantMessage = result.messages.find((msg) => msg.role === "assistant");
    if (!assistantMessage) {
      responseArea.innerHTML = "<p><strong>No response available.</strong></p>";
      return;
    }

    const formattedMessage = assistantMessage.content;

    // Debug: Log the received message
    console.log("Received assistant message:", formattedMessage);

    // Split the message into lines, handling both \n and \r\n
    const lines = formattedMessage.split(/\r?\n/);

    let answer = "No answer provided.";
    let explanation = "No explanation provided.";

    // Iterate through each line to find Answer and Explanation
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Debug: Log each line being processed
      console.log(`Processing line ${i + 1}:`, line);

      // Check for Answer
      const answerMatch = line.match(/\*\*Answer:\*\*\s*(.+)/);
      if (answerMatch) {
        answer = answerMatch[1].trim();
        console.log("Answer found:", answer);
        continue;
      }

      // Check for Explanation
      const explanationMatch = line.match(/\*\*Explanation:\*\*\s*(.+)/);
      if (explanationMatch) {
        explanation = explanationMatch[1].trim();
        console.log("Explanation found:", explanation);
        continue;
      }
    }

    // Create and append the Answer section
    const answerContainer = document.createElement("div");
    answerContainer.style.marginBottom = "10px";

    const answerTitle = document.createElement("h5");
    answerTitle.textContent = "Answer:";
    answerTitle.classList.add("section-title");
    answerContainer.appendChild(answerTitle);

    const answerContent = document.createElement("p");
    answerContent.textContent = answer;
    answerContent.classList.add("section-content");
    answerContainer.appendChild(answerContent);

    responseArea.appendChild(answerContainer);

    // Create and append the Explanation section
    const explanationContainer = document.createElement("div");
    explanationContainer.style.marginBottom = "10px";

    const explanationTitle = document.createElement("h5");
    explanationTitle.textContent = "Explanation:";
    explanationTitle.classList.add("section-title");
    explanationContainer.appendChild(explanationTitle);

    const explanationContent = document.createElement("p");
    explanationContent.textContent = explanation;
    explanationContent.classList.add("section-content");
    explanationContainer.appendChild(explanationContent);

    responseArea.appendChild(explanationContainer);

    // Handle citations if available
    if (assistantMessage.citation && assistantMessage.citation.length > 0) {
      const citationsContainer = document.createElement("div");
      citationsContainer.style.marginTop = "10px";
      citationsContainer.innerHTML = `<strong>Citations:</strong>`;

      const citationList = document.createElement("ul");
      citationList.style.paddingLeft = "20px";

      assistantMessage.citation.forEach((citation) => {
        const listItem = document.createElement("li");
        listItem.innerHTML = `<a href="${citation.href}" target="_blank">${citation.text}</a>`;
        citationList.appendChild(listItem);
      });

      citationsContainer.appendChild(citationList);
      responseArea.appendChild(citationsContainer);
    }
  }
}

// Function to send chat messages by messaging the background script
function sendChatMessage(text) {
  return new Promise((resolve) => {
    // Delegate to the background script to perform the cross-origin fetch:
    chrome.runtime.sendMessage({ action: "sendChatMessage", text }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending chat message:", chrome.runtime.lastError.message);
        resolve({ success: false, error: "Could not send chat message." });
      } else {
        resolve(response);
      }
    });
  });
}
