/* =======================
   LOGIN
   Sends username/password to the server.
   If correct, saves them and goes to the app.
======================= */
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const authHeader = "Basic " + btoa(`${username}:${password}`);

  try {
    // Test the credentials by hitting a protected route
    const res = await fetch('/api/classes', {
      headers: { 'Authorization': authHeader }
    });

    if (res.ok || res.status === 200) {
      // Save credentials and go to the app
      localStorage.setItem("username", username);
      localStorage.setItem("password", password);
      window.location.href = 'index.html';
    } else {
      document.getElementById('loginError').style.display = 'block';
    }
  } catch (err) {
    console.error(err);
    alert('Could not connect to server');
  }
});
