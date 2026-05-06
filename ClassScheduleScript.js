const CLASSES_API = '/api/classes';

/* =======================
   GET AUTH HEADER
   Reads the session token from localStorage
   and returns it as a Bearer token header.
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
    document.getElementById('classSchedule').innerHTML = '<li>Error loading classes</li>';
  }
}

/* =======================
   DISPLAY THE CLASS LIST
   Builds a list item for each class.
   Single click opens the edit/delete modal.
======================= */
function renderClasses(data) {
  const list = document.getElementById('classSchedule');
  list.innerHTML = '';

  data.forEach(cls => {
    const li   = document.createElement('li');
    const span = document.createElement('span');

    // Build display text
    let displayText = `${cls.day} - ${cls.time} : ${cls.className}`;
    if (cls.location)                      displayText += ` @ ${cls.location}`;
    if (cls.frequency === 'weekly')        displayText += ' (Weekly)';
    else if (cls.frequency === 'monthly')  displayText += ' (Monthly)';
    else if (cls.frequency === 'specific') displayText += ` (Specific dates: ${cls.specific_dates})`;
    if (cls.end_date) {
      const formatted = new Date(cls.end_date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
      });
      displayText += ` until ${formatted}`;
    }
    displayText += ` (Last edited by ${cls.last_modified_by})`;

    span.textContent = displayText;
    li.appendChild(span);
    list.appendChild(li);

    // Single click opens the edit / delete modal
    li.onclick = () => openClassEditModal(cls);
  });
}

/* =======================
   CLASS EDIT MODAL
   Opens a popup pre-filled with the
   class details so the user can edit or delete.
======================= */
function openClassEditModal(cls) {
  document.querySelectorAll('.cal-modal').forEach(m => m.remove());

  const startDate     = cls.start_date     ? cls.start_date.split('T')[0]     : '';
  const endDate       = cls.end_date       ? cls.end_date.split('T')[0]       : '';
  const specificDates = cls.specific_dates ? cls.specific_dates               : '';
  const frequency     = cls.frequency      ? cls.frequency                    : 'none';

  // Build day checkboxes with current days pre-checked
  const savedDays     = cls.day ? cls.day.split(',').map(d => d.trim()) : [];
  const dayCheckboxes = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
    .map(d => `
      <label>
        <input type="checkbox" name="day" value="${d}" ${savedDays.includes(d) ? 'checked' : ''}>
        ${d.slice(0, 3)}
      </label>`
    ).join('');

  // Determine which fields to show based on frequency
  const showEndDate      = frequency === 'weekly' || frequency === 'monthly';
  const showSpecific     = frequency === 'specific';
  const showRepeatFields = frequency !== 'none';

  const modal = document.createElement('div');
  modal.className = 'cal-modal';
  modal.innerHTML = `
    <div class="cal-modal-box">
      <h3>Edit Class</h3>
      <form id="editClassForm">

        <input class="ec-className" value="${cls.className}" placeholder="Class Name" required />

        <div class="day-checkboxes">
          <span class="day-label">Days:</span>
          ${dayCheckboxes}
        </div>

        <input class="ec-time" type="time" value="${cls.time}" required />
        <input class="ec-location" type="text" value="${cls.location || ''}" placeholder="Location (optional)" />

        <label style="font-size: 13px; color: #6b6b8a;">
          Start Date
          <input class="ec-start-date" type="date" value="${startDate}" required />
        </label>

        <select class="ec-frequency">
          <option value="none"     ${frequency === 'none'     ? 'selected' : ''}>Does not repeat</option>
          <option value="weekly"   ${frequency === 'weekly'   ? 'selected' : ''}>Repeats weekly</option>
          <option value="monthly"  ${frequency === 'monthly'  ? 'selected' : ''}>Repeats monthly</option>
          <option value="specific" ${frequency === 'specific' ? 'selected' : ''}>Specific dates</option>
        </select>

        <!-- Repeat fields — shown based on frequency -->
        <div class="ec-repeat-wrapper" style="display: ${showRepeatFields ? 'block' : 'none'};">

          <div class="ec-end-date-wrapper" style="display: ${showEndDate ? 'block' : 'none'};">
            <label style="font-size: 13px; color: #6b6b8a;">
              End Date <span style="font-weight: 400;">(optional)</span>
              <input class="ec-end-date" type="date" value="${endDate}" />
            </label>
          </div>

          <div class="ec-specific-wrapper" style="display: ${showSpecific ? 'block' : 'none'};">
            <input class="ec-specific-dates" type="text" value="${specificDates}" placeholder="e.g. 2026-05-01, 2026-05-15" />
            <small>Enter dates separated by commas (YYYY-MM-DD)</small>
          </div>

        </div>

        <div class="cal-modal-btns">
          <button type="submit">Save</button>
          <button type="button" class="delete-btn">Delete</button>
          <button type="button" class="cancel-btn">Cancel</button>
        </div>
      </form>
    </div>
  `;

  // Show/hide repeat fields when frequency changes
  modal.querySelector('.ec-frequency').onchange = function () {
    const freq          = this.value;
    const repeatWrapper = modal.querySelector('.ec-repeat-wrapper');
    const endWrapper    = modal.querySelector('.ec-end-date-wrapper');
    const specWrapper   = modal.querySelector('.ec-specific-wrapper');

    if (freq === 'none') {
      repeatWrapper.style.display = 'none';
    } else if (freq === 'specific') {
      repeatWrapper.style.display = 'block';
      endWrapper.style.display    = 'none';
      specWrapper.style.display   = 'block';
    } else {
      repeatWrapper.style.display = 'block';
      endWrapper.style.display    = 'block';
      specWrapper.style.display   = 'none';
    }
  };

  // Cancel
  modal.querySelector('.cancel-btn').onclick = () => modal.remove();

  // Delete
  modal.querySelector('.delete-btn').onclick = async () => {
    if (!confirm('Delete this class?')) return;
    try {
      const res = await fetch(`${CLASSES_API}/${cls.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': getAuthHeader() }
      });
      if (!res.ok) throw new Error('Delete failed');
      modal.remove();
      loadClasses();
    } catch (err) {
      console.error(err);
      alert('Could not delete class');
    }
  };

  // Save
  modal.querySelector('#editClassForm').onsubmit = async (e) => {
    e.preventDefault();

    const checked = modal.querySelectorAll('input[name="day"]:checked');
    const day     = Array.from(checked).map(cb => cb.value).join(',');
    if (!day) { alert('Please select at least one day.'); return; }

    const freq = modal.querySelector('.ec-frequency').value;

    const updated = {
      className:      modal.querySelector('.ec-className').value,
      day,
      time:           modal.querySelector('.ec-time').value,
      location:       modal.querySelector('.ec-location').value,
      start_date:     modal.querySelector('.ec-start-date').value,
      frequency:      freq,
      end_date:       freq !== 'none' && freq !== 'specific'
                        ? modal.querySelector('.ec-end-date').value || null
                        : null,
      specific_dates: freq === 'specific'
                        ? modal.querySelector('.ec-specific-dates').value
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
      modal.remove();
      loadClasses();
    } catch (err) {
      console.error(err);
      alert('Could not update class');
    }
  };

  // Close if clicking outside the box
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  document.body.appendChild(modal);
}

/* =======================
   ADD A NEW CLASS
   Runs when the form at the top of the page is submitted.
======================= */
document.getElementById('classScheduleForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const day = getSelectedDays(document.getElementById('classScheduleForm'));
  if (!day) {
    alert('Please select at least one day.');
    return;
  }

  const className      = document.getElementById('className').value;
  const time           = document.getElementById('time').value;
  const location       = document.getElementById('location').value;
  const start_date     = document.getElementById('start_date').value;
  const frequency      = document.getElementById('frequency').value;
  const end_date       = frequency !== 'none' && frequency !== 'specific'
                           ? document.getElementById('end_date').value || null
                           : null;
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
      body: JSON.stringify({ className, day, time, location, start_date, frequency, end_date, specific_dates })
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error("SERVER ERROR:", res.status, errorText);
      throw new Error(errorText || 'Failed to create class');
    }
    document.getElementById('classScheduleForm').reset();
    document.getElementById('repeatFieldsWrapper').style.display = 'none';
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
setInterval(loadClasses, 30000);
