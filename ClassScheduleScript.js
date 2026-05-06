const API = '/api/classes';
const form = document.getElementById('classScheduleForm');
const list = document.getElementById('classSchedule');

/* =======================
   GET LOGIN DETAILS
   Checks localStorage for saved username/password.
   If not found, asks the user to enter them.
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
   ASK FOR NOTIFICATION PERMISSION
   Called once when the page loads.
======================= */
async function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

/* =======================
   SHOW A NOTIFICATION
   Only works if the user allowed notifications.
======================= */
function showNotification(title, body) {
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

/* =======================
   LOAD CLASSES FROM SERVER
   Shows cached data first for speed,
   then fetches fresh data from the server.
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
   DISPLAY THE CLASS LIST
   Builds a list item for each class
   and adds a double-click menu to each.
======================= */
function renderClasses(data) {
  list.innerHTML = '';

  data.forEach(cls => {
    const li = document.createElement('li');
    const span = document.createElement('span');

    // Build the display text — only show location if it exists
    let displayText = `${cls.day} - ${cls.time} : ${cls.className}`;
    if (cls.location) displayText += ` @ ${cls.location}`;
    if (cls.recurring) displayText += ' (Weekly)';
    displayText += ` (Last edited by ${cls.last_modified_by})`;

    span.textContent = displayText;

    li.appendChild(span);
    list.appendChild(li);

    // Double-click opens the Edit / Delete menu
    li.ondblclick = (e) => {
      e.stopPropagation();
      showContextMenu(e, li, cls);
    };
  });
}

/* =======================
   SHOW EDIT / DELETE MENU
   A small popup appears where the user double-clicked,
   giving them the option to edit or delete the class.
======================= */
function showContextMenu(e, li, cls) {
  // Remove any menu that's already open
  document.querySelectorAll('.context-menu').forEach(m => m.remove());

  // Build the menu
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `
    <button class="ctx-edit">Edit</button>
    <button class="ctx-delete">Delete</button>
  `;

  // Place the menu where the user clicked
  document.body.appendChild(menu);
  menu.style.top = `${e.pageY}px`;
  menu.style.left = `${e.pageX}px`;

  // Edit button opens the inline edit form
  menu.querySelector('.ctx-edit').onclick = () => {
    menu.remove();
    openInlineEdit(li, cls);
  };

  // Delete button removes the class
  menu.querySelector('.ctx-delete').onclick = async () => {
    menu.remove();
    const confirmDelete = confirm('Delete this class?');
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${API}/${cls.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': getAuthHeader() }
      });
      if (!res.ok) throw new Error('Delete failed');
      li.remove();
    } catch (err) {
      console.error(err);
      alert('Could not delete class');
    }
  };

  // Close the menu if the user clicks anywhere else
  setTimeout(() => {
    document.addEventListener('click', () => menu.remove(), { once: true });
  }, 0);
}

/* =======================
   OPEN INLINE EDIT FORM
   Replaces the list item with a form
   pre-filled with the current class details.
======================= */
function openInlineEdit(li, cls) {
  // Don't open a second form if one is already open
  if (li.querySelector('.edit-form')) return;

  // Format the start_date for the date input (YYYY-MM-DD)
  const startDateValue = cls.start_date ? cls.start_date.split('T')[0] : '';

  li.innerHTML = `
    <form class="edit-form">
      <input class="edit-className" value="${cls.className}" placeholder="Class Name" required />
      <select class="edit-day">
        ${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
          .map(d => `<option ${cls.day === d ? 'selected' : ''}>${d}</option>`).join('')}
      </select>
      <input class="edit-time" type="time" value="${cls.time}" required />
      <input class="edit-location" type="text" value="${cls.location || ''}" placeholder="Location (optional)" />
      <input class="edit-start-date" type="date" value="${startDateValue}" required />
      <label class="recurring-label">
        <input class="edit-recurring" type="checkbox" ${cls.recurring ? 'checked' : ''}> Repeats weekly
      </label>
      <button type="submit">Save</button>
      <button type="button" class="cancel-btn">Cancel</button>
    </form>
  `;

  // Cancel goes back to the normal list
  li.querySelector('.cancel-btn').onclick = (e) => {
    e.stopPropagation();
    loadClasses();
  };

  // Save sends the updated data to the server
  li.querySelector('.edit-form').onsubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const updated = {
      className:  li.querySelector('.edit-className').value,
      day:        li.querySelector('.edit-day').value,
      time:       li.querySelector('.edit-time').value,
      location:   li.querySelector('.edit-location').value,
      start_date: li.querySelector('.edit-start-date').value,
      recurring:  li.querySelector('.edit-recurring').checked
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
   ADD A NEW CLASS
   Runs when the form at the top of the page is submitted.
======================= */
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const className  = document.getElementById('className').value;
  const day        = document.getElementById('day').value;
  const time       = document.getElementById('time').value;
  const location   = document.getElementById('location').value;
  const start_date = document.getElementById('start_date').value;
  const recurring  = document.getElementById('recurring').checked;

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader()
      },
      body: JSON.stringify({ className, day, time, location, start_date, recurring })
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

/* =======================
   START THE APP
======================= */
requestNotificationPermission();
loadClasses();
setInterval(loadClasses, 5000); // Refresh every 5 seconds
