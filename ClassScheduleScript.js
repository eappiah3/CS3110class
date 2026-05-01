const API = '/api/classes';
const form = document.getElementById('classScheduleForm');
const list = document.getElementById('classSchedule');

/* =======================
   WEB STORAGE API
======================= */
function getAuthHeader() {
  let username = localStorage.getItem("username");
  let password = localStorage.getItem("password");
  if (!username || !password) {
    username = prompt("Username:");
    password = prompt("Password:");
    localStorage.setItem("username", username);
    localStorage.setItem("password", password);
  }
  return "Basic " + btoa(`${username}:${password}`);
}

/* =======================
   NOTIFICATIONS API
======================= */
async function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

/* =======================
   LOAD CLASSES (WITH CACHE)
======================= */
async function loadClasses() {
  try {
    // LOAD CACHE FIRST (instant UI)
    const cached = localStorage.getItem("cachedClasses");
    if (cached) {
      renderClasses(JSON.parse(cached));
    }

    // FETCH FROM SERVER
    const res = await fetch(API);
    if (!res.ok) throw new Error('Failed to fetch classes');
    const data = await res.json();

    // SAVE TO CACHE
    localStorage.setItem("cachedClasses", JSON.stringify(data));
    renderClasses(data);
  } catch (err) {
    console.error(err);
    list.innerHTML = '<li>Error loading classes</li>';
  }
}

/* =======================
   RENDER UI
======================= */
function renderClasses(data) {
  list.innerHTML = '';
  data.forEach(cls => {
    const li = document.createElement('li');
    li.textContent = `${cls.day} - ${cls.time} : ${cls.className} (Last edited by ${cls.last_modified_by})`;

    /* =======================
       NOTIFICATION ON CLICK
    ======================= */
    li.onclick = () => {
      showNotification(
        "Class Selected",
        `${cls.className} on ${cls.day} at ${cls.time}`
      );
    };

    /* =======================
       DELETE
    ======================= */
    li.ondblclick = async () => {
      const confirmDelete = confirm('Delete this class?');
      if (!confirmDelete) return;
      try {
        const res = await fetch(`${API}/${cls.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': getAuthHeader()
          }
        });
        if (!res.ok) throw new Error('Delete failed');
        li.remove();
      } catch (err) {
        console.error(err);
        alert('Could not delete class');
      }
    };

    list.appendChild(li);
  });
}

/* =======================
   CREATE CLASS
======================= */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const className = document.getElementById('className').value;
  const day = document.getElementById('day').value;
  const time = document.getElementById('time').value;

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader()
      },
      body: JSON.stringify({ className, day, time })
    });
    if (!res.ok) throw new Error('Failed to create class');
    form.reset();
    loadClasses();
    showNotification(
      "Class Added",
      `${className} was successfully added`
    );
  } catch (err) {
    console.error(err);
    alert('Could not add class');
  }
});

/* =======================
   CLEAR CACHE (OPTIONAL)
======================= */
function clearCache() {
  localStorage.removeItem("cachedClasses");
  alert("Cache cleared");
  loadClasses();
}

requestNotificationPermission();
loadClasses();
setInterval(loadClasses, 5000);
