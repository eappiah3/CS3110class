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

function showNotification(title, body) {
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

/* =======================
   LOAD CLASSES (WITH CACHE)
======================= */
async function loadClasses() {
  try {
    const cached = localStorage.getItem("cachedClasses");
    if (cached) {
      renderClasses(JSON.parse(cached));
    }

    const res = await fetch(API);
    if (!res.ok) throw new Error('Failed to fetch classes');
    const data = await res.json();

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

    const span = document.createElement('span');
    span.textContent = `${cls.day} - ${cls.time} : ${cls.className} (Last edited by ${cls.last_modified_by})`;

    /* =======================
       LEFT CLICK TO EDIT
    ======================= */
    li.onclick = () => openInlineEdit(li, cls);

    /* =======================
       DELETE ON DOUBLE CLICK
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

    li.appendChild(span);
    list.appendChild(li);
  });
}

/* =======================
   INLINE EDIT
======================= */
function openInlineEdit(li, cls) {
  if (li.querySelector('.edit-form')) return;

  li.innerHTML = `
    <form class="edit-form">
      <input class="edit-className" value="${cls.className}" placeholder="Class Name" required />
      <select class="edit-day">
        ${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
          .map(d => `<option ${cls.day === d ? 'selected' : ''}>${d}</option>`).join('')}
      </select>
      <input class="edit-time" type="time" value="${cls.time}" required />
      <button type="submit">Save</button>
      <button type="button" class="cancel-btn">Cancel</button>
    </form>
  `;

  li.querySelector('.cancel-btn').onclick = (e) => {
    e.stopPropagation();
    loadClasses();
  };

  li.querySelector('.edit-form').onsubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = {
      className: li.querySelector('.edit-className').value,
      day:       li.querySelector('.edit-day').value,
      time:      li.querySelector('.edit-time').value,
    };
    try {
      const res = await fetch(`${API}/${cls.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader()
        },
        body: JSON.stringify(updated)
      });
      if (!res.ok) throw new Error('Update failed');
      showNotification("Class Updated", `${updated.className} was successfully updated`);
      loadClasses();
    } catch (err) {
      console.error(err);
      alert('Could not update class');
    }
  };
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
    showNotification("Class Added", `${className} was successfully added`);
  } catch (err) {
    console.error(err);
    alert('Could not add class');
  }
});

requestNotificationPermission();
loadClasses();
setInterval(loadClasses, 5000);
