const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const errorMessage = document.getElementById("errorMessage");

loginButton.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    errorMessage.textContent = "Please fill in both email and password.";
    return;
  }

  try {
    // Send login request to the backend
    const response = await fetch("http://localhost:3000/api/v1/user/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include", // Include cookies with the request
    });

    if (!response.ok) {
      if (response.status === 401) {
        errorMessage.textContent = "User not registered.";
      } else if (response.status === 403) {
        errorMessage.textContent = "Incorrect password.";
      } else {
        errorMessage.textContent = "Failed to log in. Please try again.";
      }
      return;
    }

    // If login is successful, redirect to popup.html (Chat Page)
    window.location.href = "popup.html";
  } catch (error) {
    console.error("Error during login:", error);
    errorMessage.textContent = "An error occurred. Please try again.";
  }
});
