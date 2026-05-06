const TODOS_API   = 'https://eacs3110.mooo.com/api/todos';
const CLASSES_API = '/api/classes';

/* =======================
   CALENDAR SETUP
   Runs when the page loads.
   Fetches classes and todos then builds the calendar.
======================= */
document.addEventListener('DOMContentLoaded', async () => {
  const calendarEl = document.getElementById('calendarView');

  // Fetch both classes and todos at the same time for speed
  const [classes, todos] = await Promise.all([
    fetchClasses(),
    fetchTodos()
  ]);

  // Convert classes and todos into FullCalendar event objects
  const classEvents = buildClassEvents(classes);
  const todoEvents  = buildTodoEvents(todos);
  const allEvents   = [...classEvents, ...todoEvents];

  // Build the calendar
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
       When the user clicks an event, open
       a modal so they can edit or delete it.
    ======================= */
    eventClick: function(info) {
      openEditModal(info.event);
    }
  });

  calendar.render();

  // Save to window so showTab() can call calendar.render() when switching tabs
  window.myCalendar = calendar;
});

/* =======================
   FETCH CLASSES
   Gets all classes from the server.
======================= */
async function fetchClasses() {
  try {
    const res = await fetch(CLASSES_API);
    if (!res.ok) throw new Error('Failed to fetch classes');
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

/* =======================
   FETCH TODOS
   Gets all todos from the server.
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
   Converts each class into one or more
   FullCalendar events based on its frequency
   and which days it occurs on.
======================= */
function buildClassEvents(classes) {
  const events = [];

  classes.forEach(cls => {
    if (!cls.start_date) return; // Skip classes with no start date

    const startDate = cls.start_date.split('T')[0];

    // A class can have multiple days e.g. "Monday,Wednesday,Friday"
    // Split them into an array so we can handle each one
    const days = cls.day ? cls.day.split(',').map(d => d.trim()) : [];

    if (cls.frequency === 'weekly') {
      /* ---------------------------------
         WEEKLY RECURRING
         Creates one recurring event per day
         so e.g. MWF gets three recurring events.
      --------------------------------- */
      days.forEach(day => {
        events.push({
          id:    `class-${cls.id}-${day}`,
          title: buildClassTitle(cls),
          startTime:  cls.time,
          daysOfWeek: [dayMap[day]],
          startRecur: startDate,
          backgroundColor: '#534ab7',
          borderColor:     '#3c3489',
          extendedProps: { type: 'class', data: cls }
        });
      });

    } else if (cls.frequency === 'monthly') {
      /* ---------------------------------
         MONTHLY RECURRING
         FullCalendar doesn't have a built-in monthly
         recurrence by day name, so we manually generate
         dates for the next 12 months and add each as
         a one-time event.
      --------------------------------- */
      days.forEach(day => {
        const monthlyDates = getMonthlyDates(startDate, dayMap[day], 12);
        monthlyDates.forEach(date => {
          events.push({
            id:    `class-${cls.id}-${day}-${date}`,
            title: buildClassTitle(cls),
            start: `${date}T${cls.time}`,
            backgroundColor: '#534ab7',
            borderColor:     '#3c3489',
            extendedProps: { type: 'class', data: cls }
          });
        });
      });

    } else if (cls.frequency === 'specific' && cls.specific_dates) {
      /* ---------------------------------
         SPECIFIC DATES
         Each date in the specific_dates string
         gets its own event on the calendar.
      --------------------------------- */
      const specificDates = cls.specific_dates.split(',').map(d => d.trim());
      specificDates.forEach(date => {
        events.push({
          id:    `class-${cls.id}-${date}`,
          title: buildClassTitle(cls),
          start: `${date}T${cls.time}`,
          backgroundColor: '#534ab7',
          borderColor:     '#3c3489',
          extendedProps: { type: 'class', data: cls }
        });
      });

    } else {
      /* ---------------------------------
         NO REPEAT — ONE TIME EVENT
         Shows once on the start date.
         If multiple days are selected,
         each gets its own one-time event.
      --------------------------------- */
      if (days.length > 0) {
        days.forEach(day => {
          events.push({
            id:    `class-${cls.id}-${day}`,
            title: buildClassTitle(cls),
            start: `${startDate}T${cls.time}`,
            backgroundColor: '#534ab7',
            borderColor:     '#3c3489',
            extendedProps: { type: 'class', data: cls }
          });
        });
      } else {
        // Fallback: no days selected, just show on start date
        events.push({
          id:    `class-${cls.id}`,
          title: buildClassTitle(cls),
          start: `${startDate}T${cls.time}`,
          backgroundColor: '#534ab7',
          borderColor:     '#3c3489',
          extendedProps: { type: 'class', data: cls }
        });
      }
    }
  });

  return events;
}

/* =======================
   BUILD CLASS TITLE
   Builds the event title shown on the calendar.
   Includes location if it exists.
======================= */
function buildClassTitle(cls) {
  return cls.location
    ? `${cls.className} @ ${cls.location}`
    : cls.className;
}

/* =======================
   GET MONTHLY DATES
   Given a start date and a day of week number,
   finds the matching day in each of the next N months.
   e.g. "every first Monday for 12 months"
   Returns an array of date strings like ["2026-05-05", ...]
======================= */
function getMonthlyDates(startDate, dayOfWeek, months) {
  const dates = [];
  const start = new Date(startDate);

  for (let i = 0; i < months; i++) {
    // Go to the same month offset
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);

    // Find the first occurrence of the target day in that month
    while (d.getDay() !== dayOfWeek) {
      d.setDate(d.getDate() + 1);
    }

    // Format as YYYY-MM-DD
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }

  return dates;
}

/* =======================
   BUILD TODO EVENTS
   Converts todos that have a due date
   into FullCalendar events. Todos without
   a due date are skipped.
======================= */
function buildTodoEvents(todos) {
  return todos
    .filter(todo => todo.due_date)
    .map(todo => ({
      id:    `todo-${todo.id}`,
      title: todo.completed ? `✓ ${todo.text}` : todo.text,
      start: todo.due_date.split('T')[0],
      allDay: true,
      backgroundColor: todo.completed ? '#888' : '#22a06b',
      borderColor:     todo.completed ? '#666' : '#1a7d52',
      extendedProps: { type: 'todo', data: todo }
    }));
}

/* =======================
   OPEN EDIT MODAL
   When a calendar event is clicked,
   show a popup to edit or delete it.
======================= */
function openEditModal(event) {
  document.querySelectorAll('.cal-modal').forEach(m => m.remove());

  const type = event.extendedProps.type;
  const data = event.extendedProps.data;

  const modal = document.createElement('div');
  modal.className = 'cal-modal';

  if (type === 'class') {
    const startDate      = data.start_date     ? data.start_date.split('T')[0] : '';
    const specificDates  = data.specific_dates ? data.specific_dates           : '';
    const frequency      = data.frequency      ? data.frequency                : 'none';

    // Build day checkboxes with current days pre-checked
    const savedDays = data.day ? data.day.split(',').map(d => d.trim()) : [];
    const dayCheckboxes = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
      .map(d => `
        <label>
          <input type="checkbox" name="day" value="${d}" ${savedDays.includes(d) ? 'checked' : ''}>
          ${d.slice(0, 3)}
        </label>`)
      .join('');

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
          <input class="ec-start-date" type="date" value="${startDate}" required />

          <select class="ec-frequency">
            <option value="none"     ${frequency === 'none'     ? 'selected' : ''}>Does not repeat</option>
            <option value="weekly"   ${frequency === 'weekly'   ? 'selected' : ''}>Repeats weekly</option>
            <option value="monthly"  ${frequency === 'monthly'  ? 'selected' : ''}>Repeats monthly</option>
            <option value="specific" ${frequency === 'specific' ? 'selected' : ''}>Specific dates</option>
          </select>

          <div class="ec-specific-wrapper" style="display: ${frequency === 'specific' ? 'block' : 'none'};">
            <input class="ec-specific-dates" type="text" value="${specificDates}" placeholder="e.g. 2026-05-01, 2026-05-15" />
            <small>Enter dates separated by commas (YYYY-MM-DD)</small>
          </div>

          <div class="cal-modal-btns">
            <button type="submit">Save</button>
            <button type="button" class="delete-btn">Delete</button>
            <button type="button" class="cancel-btn">Cancel</button>
          </div>
        </form>
      </div>
    `;

    // Show/hide specific dates when frequency changes
    modal.querySelector('.ec-frequency').onchange = function () {
      modal.querySelector('.ec-specific-wrapper').style.display =
        this.value === 'specific' ? 'block' : 'none';
    };

    // Cancel
    modal.querySelector('.cancel-btn').onclick = () => modal.remove();

    // Delete
    modal.querySelector('.delete-btn').onclick = async () => {
      if (!confirm('Delete this class?')) return;
      try {
        const res = await fetch(`${CLASSES_API}/${data.id}`, {
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

    // Save
    modal.querySelector('#editClassForm').onsubmit = async (e) => {
      e.preventDefault();

      // Collect checked days
      const checked = modal.querySelectorAll('input[name="day"]:checked');
      const day = Array.from(checked).map(cb => cb.value).join(',');
      if (!day) { alert('Please select at least one day.'); return; }

      const freq = modal.querySelector('.ec-frequency').value;
      const updated = {
        className:      modal.querySelector('.ec-className').value,
        day,
        time:           modal.querySelector('.ec-time').value,
        location:       modal.querySelector('.ec-location').value,
        start_date:     modal.querySelector('.ec-start-date').value,
        frequency:      freq,
        specific_dates: freq === 'specific'
          ? modal.querySelector('.ec-specific-dates').value
          : null
      };

      try {
        const res = await fetch(`${CLASSES_API}/${data.id}`, {
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
          <input class="et-due-date" type="date" value="${dueDate}" />
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

  // Close modal if user clicks outside the box
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
