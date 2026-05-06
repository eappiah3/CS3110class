const CLASSES_API = '/api/classes';
const form        = document.getElementById('classScheduleForm');
const list        = document.getElementById('classSchedule');

/* =======================
   GET AUTH HEADER
   Reads the session token from localStorage
   and returns it as a Bearer token header.
   No more username/password sent with requests.
======================= */
function getAuthHeader() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return null;
  }
  return `Bearer ${token}`;
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
   GET SELECTED DAYS
   Reads the day checkboxes and returns
   a comma separated string of checked days
   e.g. "Monday,Wednesday,Friday"
======================= */
function getSelectedDays(container) {
  const checked = container.querySelectorAll('input[name="day"]:checked');
  return Array.from(checked).map(cb => cb.value).join(',');
}

/* =======================
   CHECK DAYS IN CHECKBOXES
   Given a comma separated string of days,
   checks the matching checkboxes in a container.
   Used when pre-filling the edit form.
======================= */
function checkDays(container, dayString) {
  if (!dayString) return;
  const days = dayString.split(',');
  container.querySelectorAll('input[name="day"]').forEach(cb => {
    cb.checked = days.includes(cb.value);
  });
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

    const res = await fetch(CLASSES_API);
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
    const li   = document.createElement('li');
    const span = document.createElement('span');

    // Build display text
    let displayText = `${cls.day} - ${cls.time} : ${cls.className}`;
    if (cls.location)                  displayText += ` @ ${cls.location}`;
    if (cls.frequency === 'weekly')    displayText += ' (Weekly)';
    else if (cls.frequency === 'monthly')  displayText += ' (Monthly)';
    else if (cls.frequency === 'specific') displayText += ` (Specific dates: ${cls.specific_dates})`;
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
  document.querySelectorAll('.context-menu').forEach(m => m.remove());

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `
    <button class="ctx-edit">Edit</button>
    <button class="ctx-delete">Delete</button>
  `;

  document.body.appendChild(menu);
  menu.style.top  = `${e.pageY}px`;
  menu.style.left = `${e.pageX}px`;

  menu.querySelector('.ctx-edit').onclick = () => {
    menu.remove();
    openInlineEdit(li, cls);
  };

  menu.querySelector('.ctx-delete').onclick = async () => {
    menu.remove();
    const confirmDelete = confirm('Delete this class?');
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${CLASSES_API}/${cls.id}`, {
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
  if (li.querySelector('.edit-form')) return;

  const startDateValue     = cls.start_date     ? cls.start_date.split('T')[0] : '';
  const specificDatesValue = cls.specific_dates ? cls.specific_dates           : '';
  const frequency          = cls.frequency      ? cls.frequency                : 'none';

  li.innerHTML = `
    <form class="edit-form">
      <input class="edit-className" value="${cls.className}" placeholder="Class Name" required />
      <div class="day-checkboxes">
        <span class="day-label">Days:</span>
        <label><input type="checkbox" name="day" value="Monday"> Mon</label>
        <label><input type="checkbox" name="day" value="Tuesday"> Tue</label>
        <label><input type="checkbox" name="day" value="Wednesday"> Wed</label>
        <label><input type="checkbox" name="day" value="Thursday"> Thu</label>
        <label><input type="checkbox" name="day" value="Friday"> Fri</label>
        <label><input type="checkbox" name="day" value="Saturday"> Sat</label>
        <label><input type="checkbox" name="day" value="Sunday"> Sun</label>
      </div>
      <input class="edit-time" type="time" value="${cls.time}" required />
      <input class="edit-location" type="text" value="${cls.location || ''}" placeholder="Location (optional)" />
      <input class="edit-start-date" type="date" value="${startDateValue}" required />
      <select class="edit-frequency">
        <option value="none"     ${frequency === 'none'     ? 'selected' : ''}>Does not repeat</option>
        <option value="weekly"   ${frequency === 'weekly'   ? 'selected' : ''}>Repeats weekly</option>
        <option value="monthly"  ${frequency === 'monthly'  ? 'selected' : ''}>Repeats monthly</option>
        <option value="specific" ${frequency === 'specific' ? 'selected' : ''}>Specific dates</option>
      </select>
      <div class="edit-specific-wrapper" style="display: ${frequency === 'specific' ? 'block' : 'none'};">
        <input class="edit-specific-dates" type="text" value="${specificDatesValue}" placeholder="e.g. 2026-05-01, 2026-05-15" />
        <small>Enter dates separated by commas (YYYY-MM-DD)</small>
      </div>
      <button type="submit">Save</button>
      <button type="button" class="cancel-btn">Cancel</button>
    </form>
  `;

  // Pre-check the days that were saved
  checkDays(li, cls.day);

  // Show/hide specific dates field when frequency changes
  li.querySelector('.edit-frequency').onchange = function () {
    li.querySelector('.edit-specific-wrapper').style.display =
      this.value === 'specific' ? 'block' : 'none';
  };

  // Cancel goes back to the normal list
  li.querySelector('.cancel-btn').onclick = (e) => {
    e.stopPropagation();
    loadClasses();
  };

  // Save sends the updated data to the server
  li.querySelector('.edit-form').onsubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const selectedDays = getSelectedDays(li);
    if (!selectedDays) {
      alert('Please select at least one day.');
      return;
    }

    const updated = {
      className:      li.querySelector('.edit-className').value,
      day:            selectedDays,
      time:           li.querySelector('.edit-time').value,
      location:       li.querySelector('.edit-location').value,
      start_date:     li.querySelector('.edit-start-date').value,
      frequency:      li.querySelector('.edit-frequency').value,
      specific_dates: li.querySelector('.edit-specific-dates')
                      ? li.querySelector('.edit-specific-dates').value
                      : null
    };

    try {
      const res = await fetch(`${CLASSES_API}/${cls.id}`, {
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

  const day = getSelectedDays(form);
  if (!day) {
    alert('Please select at least one day.');
    return;
  }

  const className      = document.getElementById('className').value;
  const time           = document.getElementById('time').value;
  const location       = document.getElementById('location').value;
  const start_date     = document.getElementById('start_date').value;
  const frequency      = document.getElementById('frequency').value;
  const specific_dates = frequency === 'specific'
    ? document.getElementById('specific_dates').value
    : null;

  try {
    const res = await fetch(CLASSES_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader()
      },
      body: JSON.stringify({ className, day, time, location, start_date, frequency, specific_dates })
    });
    if (!res.ok) throw new Error('Failed to create class');
    form.reset();
    document.getElementById('specificDatesWrapper').style.display = 'none';
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
setInterval(loadClasses, 5000);
