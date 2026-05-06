const TODOS_API   = 'https://eacs3110.mooo.com/api/todos';
const CALENDAR_API = '/api/classes';

/* =======================
   CALENDAR SETUP
   Runs when the page loads.
   Fetches classes and todos then builds the calendar.
======================= */
document.addEventListener('DOMContentLoaded', async () => {
  const calendarEl = document.getElementById('calendarView');

  const [classes, todos] = await Promise.all([
    fetchClasses(),
    fetchTodos()
  ]);

  const allEvents = [
    ...buildClassEvents(classes),
    ...buildTodoEvents(todos)
  ];

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left:   'prev,next today',
      center: 'title',
      right:  'dayGridMonth,timeGridWeek,timeGridDay'
    },
    events: allEvents,

    /* =======================
       EVENT CLICK — OPEN EDIT MODAL
    ======================= */
    eventClick: function(info) {
      openCalendarEditModal(info.event);
    }
  });

  calendar.render();
  window.myCalendar = calendar;
});

/* =======================
   FETCH CLASSES
======================= */
async function fetchClasses() {
  try {
    const res = await fetch(CALENDAR_API);
    if (!res.ok) throw new Error('Failed to fetch classes');
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

/* =======================
   FETCH TODOS
======================= */
async function fetchTodos() {
  try {
    const res = await fetch(TODOS_API);
    if (!res.ok) throw new Error('Failed to fetch todos');
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

/* =======================
   DAY NAME TO NUMBER
   FullCalendar uses numbers for days of the week.
   0 = Sunday, 1 = Monday, 2 = Tuesday, etc.
======================= */
const dayMap = {
  'Sunday': 0, 'Monday': 1, 'Tuesday': 2,
  'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
};

/* =======================
   BUILD CLASS EVENTS
   Converts each class into FullCalendar events.
   Uses end_date to stop recurring events.
======================= */
function buildClassEvents(classes) {
  const events = [];

  classes.forEach(cls => {
    if (!cls.start_date) return;

    const startDate = cls.start_date.split('T')[0];

    // end_date is optional — if missing, recurring events go on indefinitely
    const endDate = cls.end_date ? cls.end_date.split('T')[0] : null;

    const days = cls.day ? cls.day.split(',').map(d => d.trim()) : [];

    if (cls.frequency === 'weekly') {
      /* ---------------------------------
         WEEKLY RECURRING
         Uses FullCalendar's built-in recurrence.
         endRecur stops the event on the end date.
      --------------------------------- */
      days.forEach(day => {
        const event = {
          id:              `class-${cls.id}-${day}`,
          title:           buildClassTitle(cls),
          startTime:       cls.time,
          daysOfWeek:      [dayMap[day]],
          startRecur:      startDate,
          backgroundColor: '#534ab7',
          borderColor:     '#3c3489',
          extendedProps:   { type: 'class', data: cls }
        };

        // Only add endRecur if an end date was set
        if (endDate) event.endRecur = endDate;

        events.push(event);
      });

    } else if (cls.frequency === 'monthly') {
      /* ---------------------------------
         MONTHLY RECURRING
         Manually generates dates for each month
         up to the end date (or 24 months if no end date).
      --------------------------------- */
      days.forEach(day => {
        const monthLimit    = 24; // Max months to generate if no end date
        const monthlyDates  = getMonthlyDates(startDate, dayMap[day], monthLimit, endDate);
        monthlyDates.forEach(date => {
          events.push({
            id:              `class-${cls.id}-${day}-${date}`,
            title:           buildClassTitle(cls),
            start:           `${date}T${cls.time}`,
            backgroundColor: '#534ab7',
            borderColor:     '#3c3489',
            extendedProps:   { type: 'class', data: cls }
          });
        });
      });

    } else if (cls.frequency === 'specific' && cls.specific_dates) {
      /* ---------------------------------
         SPECIFIC DATES
         Each date gets its own event.
      --------------------------------- */
      const specificDates = cls.specific_dates.split(',').map(d => d.trim());
      specificDates.forEach(date => {
        events.push({
          id:              `class-${cls.id}-${date}`,
          title:           buildClassTitle(cls),
          start:           `${date}T${cls.time}`,
          backgroundColor: '#534ab7',
          borderColor:     '#3c3489',
          extendedProps:   { type: 'class', data: cls }
        });
      });

    } else {
      /* ---------------------------------
         NO REPEAT — ONE TIME EVENT
      --------------------------------- */
      days.forEach(day => {
        events.push({
          id:              `class-${cls.id}-${day}`,
          title:           buildClassTitle(cls),
          start:           `${startDate}T${cls.time}`,
          backgroundColor: '#534ab7',
          borderColor:     '#3c3489',
          extendedProps:   { type: 'class', data: cls }
        });
      });
    }
  });

  return events;
}

/* =======================
   BUILD CLASS TITLE
   Includes location if it exists.
======================= */
function buildClassTitle(cls) {
  return cls.location
    ? `${cls.className} @ ${cls.location}`
    : cls.className;
}

/* =======================
   GET MONTHLY DATES
   Finds the matching weekday in each month
   from the start date up to the end date
   (or up to monthLimit months if no end date).
======================= */
function getMonthlyDates(startDate, dayOfWeek, monthLimit, endDate) {
  const dates = [];
  const start = new Date(startDate);
  const end   = endDate ? new Date(endDate) : null;

  for (let i = 0; i < monthLimit; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);

    // Find the first occurrence of the target day in that month
    while (d.getDay() !== dayOfWeek) {
      d.setDate(d.getDate() + 1);
    }

    // Stop if we've passed the end date
    if (end && d > end) break;

    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }

  return dates;
}

/* =======================
   BUILD TODO EVENTS
   Only includes todos that have a due date.
======================= */
function buildTodoEvents(todos) {
  return todos
    .filter(todo => todo.due_date)
    .map(todo => ({
      id:              `todo-${todo.id}`,
      title:           todo.completed ? `✓ ${todo.text}` : todo.text,
      start:           todo.due_date.split('T')[0],
      allDay:          true,
      backgroundColor: todo.completed ? '#888' : '#22a06b',
      borderColor:     todo.completed ? '#666' : '#1a7d52',
      extendedProps:   { type: 'todo', data: todo }
    }));
}

/* =======================
   OPEN CALENDAR EDIT MODAL
   When a calendar event is clicked,
   show a popup to edit or delete it.
======================= */
function openCalendarEditModal(event) {
  document.querySelectorAll('.cal-modal').forEach(m => m.remove());

  const type = event.extendedProps.type;
  const data = event.extendedProps.data;

  const modal = document.createElement('div');
  modal.className = 'cal-modal';

  if (type === 'class') {
    const startDate     = data.start_date     ? data.start_date.split('T')[0]     : '';
    const endDate       = data.end_date       ? data.end_date.split('T')[0]       : '';
    const specificDates = data.specific_dates ? data.specific_dates               : '';
    const frequency     = data.frequency      ? data.frequency                    : 'none';

    const savedDays     = data.day ? data.day.split(',').map(d => d.trim()) : [];
    const dayCheckboxes = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
      .map(d => `
        <label>
          <input type="checkbox" name="day" value="${d}" ${savedDays.includes(d) ? 'checked' : ''}>
          ${d.slice(0, 3)}
        </label>`
      ).join('');

    const showEndDate      = frequency === 'weekly' || frequency === 'monthly';
    const showSpecific     = frequency === 'specific';
    const showRepeatFields = frequency !== 'none';

    modal.innerHTML = `
      <div class="cal-modal-box">
        <h3>Edit Class</h3>
        <form id="editClassForm">
          <input class="ec-className" value="${data.className}" placeholder="Class Name" required />
          <div class="day-checkboxes">
            <span class="day-label">Days:</span>
            ${dayCheckboxes}
          </div>
          <input class="ec-time" type="time" value="${data.time}" required />
          <input class="ec-location" type="text" value="${data.location || ''}" placeholder="Location (optional)" />
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

    modal.querySelector('.cancel-btn').onclick = () => modal.remove();

    modal.querySelector('.delete-btn').onclick = async () => {
      if (!confirm('Delete this class?')) return;
      try {
        const res = await fetch(`${CALENDAR_API}/${data.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': getAuthHeader() }
        });
        if (!res.ok) throw new Error('Delete failed');
        modal.remove();
        refreshCalendar();
      } catch (err) {
        console.error(err);
        alert('Could not delete class');
      }
    };

    modal.querySelector('#editClassForm').onsubmit = async (e) => {
      e.preventDefault();

      const checked = modal.querySelectorAll('input[name="day"]:checked');
      const day     = Array.from(checked).map(cb => cb.value).join(',');
      if (!day) { alert('Please select at least one day.'); return; }

      const freq    = modal.querySelector('.ec-frequency').value;
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
        const res = await fetch(`${CALENDAR_API}/${data.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': getAuthHeader()
          },
          body: JSON.stringify(updated)
        });
        if (!res.ok) throw new Error('Update failed');
        modal.remove();
        refreshCalendar();
      } catch (err) {
        console.error(err);
        alert('Could not update class');
      }
    };

  } else if (type === 'todo') {
    const dueDate = data.due_date ? data.due_date.split('T')[0] : '';

    modal.innerHTML = `
      <div class="cal-modal-box">
        <h3>Edit Task</h3>
        <form id="editTodoForm">
          <input class="et-text" value="${data.text}" placeholder="Task" required />
          <label style="font-size: 13px; color: #6b6b8a;">
            Due Date <span style="font-weight: 400;">(optional)</span>
            <input class="et-due-date" type="date" value="${dueDate}" />
          </label>
          <label class="recurring-label">
            <input class="et-completed" type="checkbox" ${data.completed ? 'checked' : ''}> Completed
          </label>
          <div class="cal-modal-btns">
            <button type="submit">Save</button>
            <button type="button" class="delete-btn">Delete</button>
            <button type="button" class="cancel-btn">Cancel</button>
          </div>
        </form>
      </div>
    `;

    modal.querySelector('.cancel-btn').onclick = () => modal.remove();

    modal.querySelector('.delete-btn').onclick = async () => {
      if (!confirm('Delete this task?')) return;
      try {
        const res = await fetch(`${TODOS_API}/${data.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': getAuthHeader() }
        });
        if (!res.ok) throw new Error('Delete failed');
        modal.remove();
        refreshCalendar();
      } catch (err) {
        console.error(err);
        alert('Could not delete task');
      }
    };

    modal.querySelector('#editTodoForm').onsubmit = async (e) => {
      e.preventDefault();
      const updated = {
        text:      modal.querySelector('.et-text').value,
        due_date:  modal.querySelector('.et-due-date').value || null,
        completed: modal.querySelector('.et-completed').checked
      };
      try {
        const res = await fetch(`${TODOS_API}/${data.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': getAuthHeader()
          },
          body: JSON.stringify(updated)
        });
        if (!res.ok) throw new Error('Update failed');
        modal.remove();
        refreshCalendar();
      } catch (err) {
        console.error(err);
        alert('Could not update task');
      }
    };
  }

  // Close if clicking outside the box
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  document.body.appendChild(modal);
}

/* =======================
   REFRESH CALENDAR
   Re-fetches all data and redraws
   the calendar with the latest events.
======================= */
async function refreshCalendar() {
  const [classes, todos] = await Promise.all([
    fetchClasses(),
    fetchTodos()
  ]);

  const allEvents = [
    ...buildClassEvents(classes),
    ...buildTodoEvents(todos)
  ];

  window.myCalendar.removeAllEvents();
  allEvents.forEach(event => window.myCalendar.addEvent(event));
}
