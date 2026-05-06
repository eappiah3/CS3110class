/* =======================
   SIGN UP
   Sends a new username/password to the server.
   If successful, redirects to the login page.
======================= */
document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (res.ok) {
      alert('Account created! Please log in.');
      window.location.href = 'login.html';
    } else {
      const data = await res.json();
      const errorEl = document.getElementById('signupError');
      errorEl.textContent = data.error || 'Could not create account';
      errorEl.style.display = 'block';
    }
  } catch (err) {
    console.error(err);
    alert('Could not connect to server');
  }
});
