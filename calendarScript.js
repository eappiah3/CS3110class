const TODOS_API = 'https://eacs3110.mooo.com/api/todos';
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
    initialView: 'dayGridMonth',   // Start with month view
    headerToolbar: {
      left:   'prev,next today',
      center: 'title',
      right:  'dayGridMonth,timeGridWeek,timeGridDay'  // View switcher
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
   BUILD CLASS EVENTS
   Converts each class into a FullCalendar event.
   If the class is recurring, it repeats every week
   from the start date. Otherwise it shows just once.
======================= */
function buildClassEvents(classes) {
  const events = [];

  // Map day names to numbers FullCalendar understands
  // 0 = Sunday, 1 = Monday, etc.
  const dayMap = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2,
    'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
  };

  classes.forEach(cls => {
    if (!cls.start_date) return; // Skip classes with no start date

    if (cls.recurring) {
      // Recurring event — repeats every week on the same day
      events.push({
        id:    `class-${cls.id}`,
        title: cls.location ? `${cls.className} @ ${cls.location}` : cls.className,
        startTime: cls.time,
        daysOfWeek: [dayMap[cls.day]],
        startRecur: cls.start_date,
        backgroundColor: '#534ab7',
        borderColor: '#3c3489',
        extendedProps: {
          type: 'class',
          data: cls
        }
      });
    } else {
      // One-time event — shows on the start date only
      events.push({
        id:    `class-${cls.id}`,
        title: cls.location ? `${cls.className} @ ${cls.location}` : cls.className,
        start: `${cls.start_date.split('T')[0]}T${cls.time}`,
        backgroundColor: '#534ab7',
        borderColor: '#3c3489',
        extendedProps: {
          type: 'class',
          data: cls
        }
      });
    }
  });

  return events;
}

/* =======================
   BUILD TODO EVENTS
   Converts todos that have a due date
   into FullCalendar events. Todos without
   a due date are skipped.
======================= */
function buildTodoEvents(todos) {
  return todos
    .filter(todo => todo.due_date) // Only include todos with a due date
    .map(todo => ({
      id:    `todo-${todo.id}`,
      title: todo.completed ? `✓ ${todo.text}` : todo.text,
      start: todo.due_date.split('T')[0],
      allDay: true,
      backgroundColor: todo.completed ? '#888' : '#22a06b',
      borderColor:     todo.completed ? '#666' : '#1a7d52',
      extendedProps: {
        type: 'todo',
        data: todo
      }
    }));
}

/* =======================
   OPEN EDIT MODAL
   When a calendar event is clicked,
   show a popup to edit or delete it.
======================= */
function openEditModal(event) {
  // Remove any existing modal
  document.querySelectorAll('.cal-modal').forEach(m => m.remove());

  const type = event.extendedProps.type;
  const data = event.extendedProps.data;

  const modal = document.createElement('div');
  modal.className = 'cal-modal';

  if (type === 'class') {
    // Format start date for input
    const startDate = data.start_date ? data.start_date.split('T')[0] : '';

    modal.innerHTML = `
      <div class="cal-modal-box">
        <h3>Edit Class</h3>
        <form id="editClassForm">
          <input class="ec-className" value="${data.className}" placeholder="Class Name" required />
          <select class="ec-day">
            ${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
              .map(d => `<option ${data.day === d ? 'selected' : ''}>${d}</option>`).join('')}
          </select>
          <input class="ec-time" type="time" value="${data.time}" required />
          <input class="ec-location" type="text" value="${data.location || ''}" placeholder="Location (optional)" />
          <input class="ec-start-date" type="date" value="${startDate}" required />
          <label class="recurring-label">
            <input class="ec-recurring" type="checkbox" ${data.recurring ? 'checked' : ''}> Repeats weekly
          </label>
          <div class="cal-modal-btns">
            <button type="submit">Save</button>
            <button type="button" class="delete-btn">Delete</button>
            <button type="button" class="cancel-btn">Cancel</button>
          </div>
        </form>
      </div>
    `;

    // Cancel — close the modal
    modal.querySelector('.cancel-btn').onclick = () => modal.remove();

    // Delete — remove the class
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

    // Save — update the class
    modal.querySelector('#editClassForm').onsubmit = async (e) => {
      e.preventDefault();
      const updated = {
        className:  modal.querySelector('.ec-className').value,
        day:        modal.querySelector('.ec-day').value,
        time:       modal.querySelector('.ec-time').value,
        location:   modal.querySelector('.ec-location').value,
        start_date: modal.querySelector('.ec-start-date').value,
        recurring:  modal.querySelector('.ec-recurring').checked
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
    // Format due date for input
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

    // Cancel — close the modal
    modal.querySelector('.cancel-btn').onclick = () => modal.remove();

    // Delete — remove the todo
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

    // Save — update the todo
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

  // Remove all current events and add fresh ones
  window.myCalendar.removeAllEvents();
  allEvents.forEach(event => window.myCalendar.addEvent(event));
}
