const TODO_API = 'https://eacs3110.mooo.com/api/todos';
const form     = document.getElementById('todoForm');
const input    = document.getElementById('input');
const list     = document.getElementById('todoList');

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
   CREATE TODO
   Runs when the form is submitted.
   Sends the task text and optional due date to the server.
======================= */
form.addEventListener('submit', async function (event) {
  event.preventDefault();

  const text     = input.value.trim();
  const due_date = document.getElementById('due_date').value || null;

  if (!text) {
    alert("Todo cannot be empty");
    return;
  }

  try {
    form.querySelector('button').disabled = true;
    const res = await fetch(TODO_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader()
      },
      body: JSON.stringify({ text, due_date })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("SERVER ERROR:", res.status, errorText);
      throw new Error(errorText || 'Failed to create todo');
    }

    const newTodo = await res.json();
    addTodoToDOM(newTodo);
    input.value = '';
    document.getElementById('due_date').value = '';
  } catch (err) {
    console.error("FRONTEND ERROR:", err);
    alert('Could not add todo: ' + err.message);
  } finally {
    form.querySelector('button').disabled = false;
  }
});

/* =======================
   LOAD TODOS
   Fetches all todos from the server and displays them.
======================= */
async function loadTodos() {
  try {
    list.innerHTML = '<li>Loading...</li>';
    const res = await fetch(TODO_API);
    if (!res.ok) {
      const msg = await res.text();
      console.error("LOAD ERROR:", res.status, msg);
      throw new Error(msg);
    }
    const data = await res.json();
    list.innerHTML = '';
    data.forEach(addTodoToDOM);
  } catch (err) {
    console.error(err);
    list.innerHTML = '<li>Error loading To-Do List</li>';
  }
}

/* =======================
   RENDER TODO
   Builds a single list item for a todo.
   Shows the task text, due date if it exists,
   a checkbox to mark complete, and double-click to delete.
======================= */
function addTodoToDOM(todo) {
  const li       = document.createElement('li');
  const checkbox = document.createElement('input');
  checkbox.type    = 'checkbox';
  checkbox.checked = todo.completed;

  const span = document.createElement('span');

  let displayText = todo.text;
  if (todo.due_date) {
    const formatted = new Date(todo.due_date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
    });
    displayText += ` - Due: ${formatted}`;
  }
  displayText += ` (Last edited by ${todo.last_modified_by})`;
  span.textContent = displayText;

  /* =======================
     SINGLE CLICK — OPEN EDIT MODAL
  ======================= */
  span.onclick = () => openTodoEditModal(todo, li);

  /* =======================
     MARK COMPLETE
  ======================= */
  checkbox.onchange = async () => {
    try {
      const res = await fetch(`${TODO_API}/${todo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader()
        },
        body: JSON.stringify({
          text:      todo.text,
          completed: checkbox.checked,
          due_date:  todo.due_date ? todo.due_date.split('T')[0] : null
        })
      });
      if (!res.ok) throw new Error('Update failed');
      li.classList.toggle('completed', checkbox.checked);
    } catch (err) {
      console.error(err);
      alert('Could not update todo');
      checkbox.checked = !checkbox.checked;
    }
  };

  /* =======================
     DOUBLE CLICK — DELETE
  ======================= */
  li.ondblclick = async () => {
    if (!confirm('Delete this to do list item?')) return;
    try {
      const res = await fetch(`${TODO_API}/${todo.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': getAuthHeader() }
      });
      if (!res.ok) throw new Error('Delete failed');
      li.remove();
    } catch (err) {
      console.error(err);
      alert('Could not delete todo');
    }
  };

  if (todo.completed) li.classList.add('completed');

  li.appendChild(checkbox);
  li.appendChild(span);
  list.appendChild(li);
}

/* =======================
   TODO EDIT MODAL
   Opens a popup pre-filled with the
   task details so the user can edit them.
======================= */
function openTodoEditModal(todo, li) {
  document.querySelectorAll('.cal-modal').forEach(m => m.remove());

  const dueDate = todo.due_date ? todo.due_date.split('T')[0] : '';

  const modal = document.createElement('div');
  modal.className = 'cal-modal';
  modal.innerHTML = `
    <div class="cal-modal-box">
      <h3>Edit Task</h3>
      <form id="editTodoForm">
        <input class="et-text" value="${todo.text}" placeholder="Task" required />
        <label style="font-size: 13px; color: #6b6b8a;">
          Due Date <span style="font-weight: 400;">(optional)</span>
          <input class="et-due-date" type="date" value="${dueDate}" />
        </label>
        <label class="recurring-label">
          <input class="et-completed" type="checkbox" ${todo.completed ? 'checked' : ''}> Completed
        </label>
        <div class="cal-modal-btns">
          <button type="submit">Save</button>
          <button type="button" class="delete-btn">Delete</button>
          <button type="button" class="cancel-btn">Cancel</button>
        </div>
      </form>
    </div>
  `;

  // Cancel
  modal.querySelector('.cancel-btn').onclick = () => modal.remove();

  // Delete
  modal.querySelector('.delete-btn').onclick = async () => {
    if (!confirm('Delete this task?')) return;
    try {
      const res = await fetch(`${TODO_API}/${todo.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': getAuthHeader() }
      });
      if (!res.ok) throw new Error('Delete failed');
      modal.remove();
      li.remove();
    } catch (err) {
      console.error(err);
      alert('Could not delete task');
    }
  };

  // Save
  modal.querySelector('#editTodoForm').onsubmit = async (e) => {
    e.preventDefault();
    const updated = {
      text:      modal.querySelector('.et-text').value,
      due_date:  modal.querySelector('.et-due-date').value || null,
      completed: modal.querySelector('.et-completed').checked
    };
    try {
      const res = await fetch(`${TODO_API}/${todo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader()
        },
        body: JSON.stringify(updated)
      });
      if (!res.ok) throw new Error('Update failed');
      modal.remove();
      loadTodos();
    } catch (err) {
      console.error(err);
      alert('Could not update task');
    }
  };

  // Close if clicking outside the box
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  document.body.appendChild(modal);
}

/* =======================
   START THE APP
======================= */
loadTodos();
setInterval(loadTodos, 5000);
