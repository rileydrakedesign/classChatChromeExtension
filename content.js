// Listen for messages from the background script to open the chat box
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openChatBox") {
    createFloatingChatBox();
    sendResponse({ success: true });
  }
});

// Function to create the floating chat box using Shadow DOM
function createFloatingChatBox() {
  if (document.getElementById("floatingChatBox")) {
    return; // Chat box already exists
  }

  // Create a container for the Shadow DOM
  const container = document.createElement("div");
  container.id = "floatingChatBox";
  container.style.position = "fixed";
  container.style.bottom = "20px";
  container.style.right = "20px";
  container.style.zIndex = "9999";

  // Attach Shadow DOM
  const shadow = container.attachShadow({ mode: "open" });

  // Create the chat box inside the Shadow DOM
  const chatBox = document.createElement("div");
  chatBox.id = "chatBox";
  chatBox.style.width = "350px";
  chatBox.style.height = "500px"; // Increased height to accommodate new sections
  chatBox.style.background = "white";
  chatBox.style.border = "1px solid #ccc";
  chatBox.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
  chatBox.style.padding = "10px";
  chatBox.style.fontFamily = "Arial, sans-serif";
  chatBox.style.borderRadius = "8px";
  chatBox.style.overflowY = "auto";

  // Add styles to the Shadow DOM
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
      max-height: 300px; /* Adjusted for more content */
      overflow-y: auto;
      font-size: 14px;
      border-top: 1px solid #ccc;
      padding-top: 10px;
    }
    a {
      color: #007bff;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .disabled {
      background: #6c757d !important;
      cursor: not-allowed !important;
    }
    .loading {
      display: flex;
      align-items: center;
    }
    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #007bff;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      animation: spin 2s linear infinite;
      margin-left: 10px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    /* Additional styles for Answer and Explanation */
    .section-title {
      font-weight: bold;
      margin-top: 10px;
      margin-bottom: 5px;
      color: #333;
    }
    .section-content {
      margin-bottom: 10px;
      background-color: #f9f9f9;
      padding: 8px;
      border-radius: 4px;
    }
  `;

  // Define the inner HTML of the chat box
  chatBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h4 style="margin: 0;">Chat Assistant</h4>
      <button id="closeChatBox" aria-label="Close Chat Box">X</button>
    </div>
    <textarea id="selectedTextBox" placeholder="Selected text will appear here..." readonly aria-label="Selected Text"></textarea>
    <button id="submitTextButton" aria-label="Submit Selected Text">Submit</button>
    <div id="responseArea" aria-live="polite"></div>
  `;

  // Append styles and chat box to the Shadow DOM
  shadow.appendChild(style);
  shadow.appendChild(chatBox);
  document.body.appendChild(container);

  console.log("Chat box created.");

  // Close the chat box when the close button is clicked
  shadow.getElementById("closeChatBox").addEventListener("click", () => {
    container.remove();
    console.log("Chat box closed.");
  });

  // Flag to track if a request is in progress
  let isLoading = false;

  // Detect selected text and update the textarea
  document.addEventListener("mouseup", () => {
    const selectedTextBox = shadow.getElementById("selectedTextBox");
    if (!selectedTextBox) {
      console.error("Selected text box not found in the DOM.");
      return;
    }

    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      selectedTextBox.value = selectedText;
      console.log("Selected text updated:", selectedText);
    }
  });

  // Handle the "Submit" button click
  shadow.getElementById("submitTextButton").addEventListener("click", () => {
    const selectedTextBox = shadow.getElementById("selectedTextBox");
    const responseArea = shadow.getElementById("responseArea");
    const submitButton = shadow.getElementById("submitTextButton");

    if (!selectedTextBox) {
      console.error("Selected text box not found.");
      return;
    }

    const selectedText = selectedTextBox.value;

    if (!selectedText) {
      alert("Please select some text first.");
      return;
    }

    if (isLoading) {
      alert("Please wait for the current request to complete.");
      return;
    }

    // Set loading state
    isLoading = true;
    submitButton.disabled = true;
    submitButton.classList.add("disabled");
    responseArea.innerHTML = `
      <p><em>Submitting...</em></p>
      <div class="spinner"></div>
    `;

    console.log("Submitting text to backend:", selectedText);

    // Send the selected text to the background script
    chrome.runtime.sendMessage(
      { action: "sendTextToBackend", text: selectedText },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message to background:", chrome.runtime.lastError.message);
          responseArea.innerHTML = `<p><strong>Error:</strong> Could not process the request.</p>`;
          resetLoadingState();
        } else if (response && response.success) {
          displayResponse(response.data);
        } else {
          responseArea.innerHTML = `<p><strong>Error:</strong> Failed to fetch response.</p>`;
          resetLoadingState();
        }
      }
    );
  });

  // Function to reset loading state
  function resetLoadingState() {
    isLoading = false;
    const submitButton = shadow.getElementById("submitTextButton");
    const responseArea = shadow.getElementById("responseArea");
    submitButton.disabled = false;
    submitButton.classList.remove("disabled");
    // Remove spinner if present
    const spinner = responseArea.querySelector(".spinner");
    if (spinner) {
      spinner.remove();
    }
  }

  // Function to display the response from the backend
  function displayResponse(result) {
    const responseArea = shadow.getElementById("responseArea");
    responseArea.innerHTML = ""; // Clear previous content

    const assistantMessage = result.messages.find(
      (msg) => msg.role === "assistant"
    );

    if (!assistantMessage) {
      responseArea.innerHTML = "<p><strong>No response available.</strong></p>";
      resetLoadingState();
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

    // Display citations if available
    if (assistantMessage.citation && assistantMessage.citation.length > 0) {
      const citationsContainer = document.createElement("div");
      citationsContainer.style.marginTop = "10px";
      citationsContainer.innerHTML = `<strong>Citations:</strong>`;

      const citationList = document.createElement("ul");
      citationList.style.paddingLeft = "20px";

      assistantMessage.citation.forEach((citation) => {
        const listItem = document.createElement("li");
        if (citation.href) {
          listItem.innerHTML = `<a href="${citation.href}" target="_blank">${citation.text}</a>`;
        } else {
          listItem.textContent = citation.text;
        }
        citationList.appendChild(listItem);
      });

      citationsContainer.appendChild(citationList);
      responseArea.appendChild(citationsContainer);
    }

    // Reset loading state after displaying the response
    resetLoadingState();
  }
}

// Optional: Automatically inject content script on page load (if not already injected via manifest)
(function() {
  // Ensure the content script runs only once
  if (!window.hasRunAIStudyBuddy) {
    window.hasRunAIStudyBuddy = true;
    // The main functionality is already handled via the message listener
    console.log("AI Study Buddy content script initialized.");
  }
})();
