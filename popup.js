const userQueryTextarea = document.getElementById("userQuery");
const followUpInput = document.getElementById("followUpQuery");
const sendFollowUpButton = document.getElementById("sendFollowUp");
const responseArea = document.getElementById("responseArea");

// On popup load, verify authentication status and fetch selected text
checkAuthStatus();
fetchSelectedText();

// Check user authentication status
async function checkAuthStatus() {
  try {
    const response = await fetch("http://localhost:3000/api/v1/user/auth-status", {
      method: "GET",
      credentials: "include", // Include cookies with the request
    });

    if (response.status !== 200) {
      // Redirect to login page if not authenticated
      window.location.href = "login.html";
    }
  } catch (error) {
    console.error("Error checking auth status:", error);
    window.location.href = "login.html";
  }
}

// Fetch selected text from the background script
function fetchSelectedText() {
  chrome.runtime.sendMessage({ action: "getSelectedText" }, (response) => {
    if (response && response.text) {
      userQueryTextarea.value = response.text; // Populate the chat box with the selected text
    }
  });
}

// Follow-up query handler
sendFollowUpButton.addEventListener("click", async () => {
  const followUpQuery = followUpInput.value.trim();
  if (!followUpQuery) {
    alert("Please enter a follow-up question.");
    return;
  }

  await sendUserQuery(followUpQuery);
});

// Function to send user queries to the backend
async function sendUserQuery(query) {
  try {
    const response = await fetch("http://localhost:3000/api/v1/new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Include cookies with the request
      body: JSON.stringify({ message: query, class_name: "null" }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        alert("Session expired. Please log in again.");
        window.location.href = "login.html";
      } else {
        alert("Failed to retrieve response. Please try again.");
      }
      return;
    }

    const result = await response.json();
    displayResponse(result.messages.at(-1).content);
  } catch (error) {
    console.error("Error sending query:", error);
    alert("An error occurred. Please try again.");
  }
}

// Display response
function displayResponse(answer) {
  responseArea.innerHTML = `<strong>Answer:</strong> ${answer}`;
}
