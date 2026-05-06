/* =======================
   LOGIN
   Sends username and password to the server.
   If correct, saves the session token and
   redirects to the handler page.
======================= */
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errorEl  = document.getElementById('loginError');

  errorEl.style.display = 'none';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      // Show error message if credentials are wrong
      errorEl.style.display = 'block';
      return;
    }

    const data = await res.json();

    // Save the token and username to localStorage
    // We no longer save the password — just the token
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);

    // Go to the handler page which verifies the token
    // and redirects to the app
    window.location.href = 'handler.html';

  } catch (err) {
    console.error(err);
    alert('Could not connect to server');
  }
});
