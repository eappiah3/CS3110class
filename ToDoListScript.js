const form = document.getElementById('todoForm');
const input = document.getElementById('input');
const list = document.getElementById('todoList');
const API = 'https://eacs3110.mooo.com/api/todos';

/* =======================
   AUTH HELPER
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
   CREATE TODO
   Runs when the form is submitted.
   Sends the task text and optional due date to the server.
======================= */
form.addEventListener('submit', async function (event) {
  event.preventDefault();

  const text = input.value.trim();
  const due_date = document.getElementById('due_date').value || null;

  if (!text) {
    alert("Todo cannot be empty");
    return;
  }

  try {
    form.querySelector('button').disabled = true;
    const res = await fetch(API, {
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
    const res = await fetch(API);
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
  const li = document.createElement('li');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = todo.completed;

  const span = document.createElement('span');

  // Build display text — only show due date if it exists
  let displayText = `${todo.text}`;
  if (todo.due_date) {
    // Format the date nicely e.g. "May 10, 2026"
    const formatted = new Date(todo.due_date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
    });
    displayText += ` — Due: ${formatted}`;
  }
  displayText += ` (Last edited by ${todo.last_modified_by})`;
  span.textContent = displayText;

  /* =======================
     MARK COMPLETE
     Clicking the checkbox updates the todo on the server.
  ======================= */
  checkbox.onchange = async () => {
    try {
      const res = await fetch(`${API}/${todo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader()
        },
        body: JSON.stringify({
          text: todo.text,
          completed: checkbox.checked,
          due_date: todo.due_date || null
        })
      });
      if (!res.ok) {
        const msg = await res.text();
        console.error("UPDATE ERROR:", msg);
        throw new Error(msg);
      }
      li.classList.toggle('completed', checkbox.checked);
    } catch (err) {
      console.error(err);
      alert('Could not update todo');
      checkbox.checked = !checkbox.checked;
    }
  };

  /* =======================
     DELETE ON DOUBLE CLICK
     Double-clicking removes the todo from the server.
  ======================= */
  li.ondblclick = async () => {
    if (!confirm('Delete this to do list item?')) return;
    try {
      const res = await fetch(`${API}/${todo.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': getAuthHeader()
        }
      });
      if (!res.ok) {
        const msg = await res.text();
        console.error("DELETE ERROR:", msg);
        throw new Error(msg);
      }
      li.remove();
    } catch (err) {
      console.error(err);
      alert('Could not delete todo');
    }
  };

  if (todo.completed) {
    li.classList.add('completed');
  }

  li.appendChild(checkbox);
  li.appendChild(span);
  list.appendChild(li);
}

/* =======================
   START THE APP
======================= */
loadTodos();
setInterval(loadTodos, 5000); // Refresh every 5 seconds
