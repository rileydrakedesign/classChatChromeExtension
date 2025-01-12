// content.js

///////////////////////////////
// 1. LISTEN FOR toggleUI MESSAGE
///////////////////////////////
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleUI") {
    // We keep your existing toggle logic:
    const existingContainer =
      document.getElementById("floatingChatBox") ||
      document.getElementById("extensionLoginForm");

    if (existingContainer) {
      // If container exists, remove it
      existingContainer.remove();

      // Respond synchronously that we toggled the UI off
      sendResponse({ toggled: false });
      // Because it's synchronous, no need to return true
    } else {
      // If container does not exist, we do an async check
      checkAuthStatus().then((isAuthenticated) => {
        if (isAuthenticated) {
          createFloatingChatBox();
        } else {
          createLoginForm();
        }

        // Respond after finishing our async check
        sendResponse({ toggled: true });
      });

      // Return true so Chrome knows we'll respond asynchronously
      return true;
    }
  }
});

///////////////////////////////
// 2. CHECK AUTH STATUS
///////////////////////////////
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

///////////////////////////////
// 3. CREATE LOGIN FORM IF NOT AUTHED
///////////////////////////////
function createLoginForm() {
  if (document.getElementById("extensionLoginForm")) return;

  const container = document.createElement("div");
  container.id = "extensionLoginForm";
  container.style.position = "fixed";
  container.style.top = "20px";
  container.style.right = "20px";
  container.style.zIndex = "9999";
  container.style.background = "#f9f9f9";
  container.style.border = "1px solid #ccc";
  container.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  container.style.padding = "20px";
  container.style.fontFamily = "Arial, sans-serif";
  container.style.borderRadius = "10px";
  container.style.width = "320px";
  container.style.maxWidth = "90%";
  container.style.boxSizing = "border-box";

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h4 style="margin:0; font-size: 18px; font-weight: bold;">Login to Your Account</h4>
      <button id="closeLoginForm" aria-label="Close Login Form" style="background: transparent; border: none; font-size: 20px; cursor: pointer; line-height: 1;">&times;</button>
    </div>
    <input type="email" id="extensionLoginEmail" placeholder="Email" style="width:100%; margin:15px 0 10px 0; padding:10px; border: 1px solid #ccc; border-radius: 5px; font-size: 14px;" />
    <input type="password" id="extensionLoginPassword" placeholder="Password" style="width:100%; margin-bottom:15px; padding:10px; border: 1px solid #ccc; border-radius: 5px; font-size: 14px;" />
    <button id="extensionLoginButton" style="width:100%; padding:12px; background:#007bff; color:white; border:none; border-radius:5px; cursor:pointer; font-size:16px; font-weight:bold;">Login</button>
    <div id="extensionLoginError" style="margin-top:15px; color:red; font-size:14px;"></div>
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

///////////////////////////////
// 4. CREATE FLOATING CHAT BOX
///////////////////////////////
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
  container.style.width = "400px";
  container.style.maxWidth = "90%";

  const shadow = container.attachShadow({ mode: "open" });

  const chatBox = document.createElement("div");
  chatBox.id = "chatBox";
  chatBox.style.width = "100%";
  chatBox.style.height = "100%";
  chatBox.style.background = "#ffffff";
  chatBox.style.border = "1px solid #ccc";
  chatBox.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
  chatBox.style.padding = "20px";
  chatBox.style.fontFamily = "Arial, sans-serif";
  chatBox.style.borderRadius = "10px";
  chatBox.style.boxSizing = "border-box";
  chatBox.style.display = "flex";
  chatBox.style.flexDirection = "column";

  const style = document.createElement("style");
  style.textContent = `
    #closeChatBox {
      border: none;
      background: #ff4d4d;
      color: white;
      padding: 5px 10px;
      cursor: pointer;
      border-radius: 4px;
      font-size: 14px;
      font-weight: bold;
    }
    #submitTextButton {
      margin-top: 15px;
      width: 100%;
      background: #007bff;
      color: white;
      border: none;
      padding: 12px;
      cursor: pointer;
      border-radius: 5px;
      font-size: 16px;
      font-weight: bold;
      transition: background 0.3s;
    }
    #submitTextButton:hover {
      background: #0056b3;
    }
    textarea {
      width: 100%;
      height: 80px;
      margin-top: 15px;
      padding: 10px;
      resize: none;
      border: 1px solid #ccc;
      border-radius: 5px;
      font-size: 14px;
      box-sizing: border-box;
      font-family: Arial, sans-serif;
    }
    select {
      margin-top: 15px;
      padding: 10px;
      font-size: 14px;
      border: 1px solid #ccc;
      border-radius: 5px;
      font-family: Arial, sans-serif;
    }
    #responseArea {
      margin-top: 15px;
      max-height: 180px;
      overflow-y: auto;
      font-size: 14px;
      border-top: 1px solid #ccc;
      padding-top: 15px;
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
      animation: spin 1s linear infinite;
      margin-left: 10px;
      display: inline-block;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    /* Enhanced Styles for Answer and Explanation */
    .section-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 5px;
      color: #333;
    }
    .section-content.answer {
      font-size: 18px;
      font-weight: 600;
      color: #0056b3;
      margin-bottom: 15px;
    }
    .section-content.explanation {
      font-size: 16px;
      font-weight: 500;
      color: #555;
      margin-bottom: 15px;
    }
    .citations-container {
      margin-top: 15px;
    }
    .citations-container ul {
      padding-left: 20px;
      color: #007bff;
    }
    .citations-container li {
      margin-bottom: 5px;
    }
    .citations-container a {
      text-decoration: none;
      color: #007bff;
    }
    .citations-container a:hover {
      text-decoration: underline;
    }
  `;

  chatBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h4 style="margin:0; font-size: 20px; font-weight: bold;">Chat Assistant</h4>
      <button id="closeChatBox" aria-label="Close Chat Box">X</button>
    </div>
    <!-- Dropdown for selecting a class -->
    <select id="classSelect" aria-label="Select Class">
      <option value="null">Select a class</option>
    </select>
    <textarea id="selectedTextBox" placeholder="Select text on the page and submit here..." aria-label="Selected Text"></textarea>
    <button id="submitTextButton" aria-label="Submit Selected Text">Submit</button>
    <div id="responseArea" aria-live="polite"></div>
  `;

  shadow.appendChild(style);
  shadow.appendChild(chatBox);
  document.body.appendChild(container);

  // Load classes into the dropdown via background script
  loadUserClasses(shadow.getElementById("classSelect"));

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
    const classSelect = shadow.getElementById("classSelect");

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

    // Get the selected class name; if none, it will be "null"
    const selectedClassName = classSelect.value;

    // Send the chat message with the text and selected class name
    const result = await sendChatMessage(selectedText, selectedClassName);
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
    console.log("Received assistant message:", formattedMessage);

    // Split the message into lines, handling both \n and \r\n
    const lines = formattedMessage.split(/\r?\n/);

    let answer = "No answer provided.";
    let explanation = "No explanation provided.";

    // Iterate through each line to find Answer and Explanation
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
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
    answerContainer.classList.add("answer-section");

    const answerTitle = document.createElement("h5");
    answerTitle.textContent = "Answer:";
    answerTitle.classList.add("section-title");
    answerContainer.appendChild(answerTitle);

    const answerContent = document.createElement("p");
    answerContent.textContent = answer;
    answerContent.classList.add("section-content", "answer");
    answerContainer.appendChild(answerContent);

    responseArea.appendChild(answerContainer);

    // Create and append the Explanation section
    const explanationContainer = document.createElement("div");
    explanationContainer.classList.add("explanation-section");

    const explanationTitle = document.createElement("h5");
    explanationTitle.textContent = "Explanation:";
    explanationTitle.classList.add("section-title");
    explanationContainer.appendChild(explanationTitle);

    const explanationContent = document.createElement("p");
    explanationContent.textContent = explanation;
    explanationContent.classList.add("section-content", "explanation");
    explanationContainer.appendChild(explanationContent);

    responseArea.appendChild(explanationContainer);

    // Handle citations if available
    if (assistantMessage.citation && assistantMessage.citation.length > 0) {
      const citationsContainer = document.createElement("div");
      citationsContainer.classList.add("citations-container");
      citationsContainer.innerHTML = `<strong>Citations:</strong>`;

      const citationList = document.createElement("ul");

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

///////////////////////////////
// 5. SEND CHAT MESSAGE
///////////////////////////////
function sendChatMessage(text, className) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        action: "sendChatMessage",
        text,
        class_name: className, // Pass the selected class name
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending chat message:", chrome.runtime.lastError.message);
          resolve({ success: false, error: "Could not send chat message." });
        } else {
          resolve(response);
        }
      }
    );
  });
}

///////////////////////////////
// 4a. LOAD USER CLASSES
///////////////////////////////
async function loadUserClasses(selectElement) {
  try {
    chrome.runtime.sendMessage({ action: "getClasses" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending getClasses message:", chrome.runtime.lastError.message);
        return;
      }
      if (!response || !response.success) {
        console.error("Failed to get classes", response && response.error);
        return;
      }
      // Assume response.classes is an array of objects with a "name" property
      response.classes.forEach((cls) => {
        const option = document.createElement("option");
        option.value = cls.name; // or use an id if preferred
        option.textContent = cls.name;
        selectElement.appendChild(option);
      });
    });
  } catch (error) {
    console.error("Error fetching classes:", error);
  }
}
