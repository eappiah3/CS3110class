const form = document.getElementById('todoForm');
const input = document.getElementById('input');
const list = document.getElementById('todoList');

const API = 'https://eacs3110.mooo.com/api/todos';

/* =======================
   AUTH HELPER
======================= */
let authHeader = null;

function getAuthHeader() {
  if (!authHeader) {
    const username = prompt("Username:");
    const password = prompt("Password:");
    authHeader = "Basic " + btoa(`${username}:${password}`);
  }
  return authHeader;
}

/* =======================
   CREATE (POST)
======================= */
form.addEventListener('submit', async function (event) {
  event.preventDefault();

  const text = input.value.trim();
  if (!text) return;

  try {
    form.querySelector('button').disabled = true;

    const res = await fetch(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader()
      },
      body: JSON.stringify({ text })
    });

    if (!res.ok) throw new Error('Failed to create todo');

    const newTodo = await res.json();

    addTodoToDOM(newTodo);
    input.value = '';

  } catch (err) {
    console.error(err);
    alert('Could not add todo');
  } finally {
    form.querySelector('button').disabled = false;
  }
});

/* =======================
   READ (GET - NO AUTH)
======================= */
async function loadTodos() {
  try {
    list.innerHTML = '<li>Loading...</li>';

    const res = await fetch(API); // ❗ NO Authorization here
    if (!res.ok) throw new Error('Failed to fetch todos');

    const data = await res.json();

    list.innerHTML = '';
    data.forEach(addTodoToDOM);

  } catch (err) {
    console.error(err);
    list.innerHTML = '<li>Error loading To-Do List</li>';
  }
}

/* =======================
   CREATE DOM ELEMENT
======================= */
function addTodoToDOM(todo) {
  const li = document.createElement('li');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = todo.completed;

  const span = document.createElement('span');
  span.textContent = `${todo.text} (Last edited by ${todo.last_modified_by})`;

  /* UPDATE (PUT) */
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
          completed: checkbox.checked
        })
      });

      if (!res.ok) throw new Error('Update failed');

      li.classList.toggle('completed', checkbox.checked);

    } catch (err) {
      console.error(err);
      alert('Could not update todo');
      checkbox.checked = !checkbox.checked; // revert UI
    }
  };

  /* DELETE */
  li.ondblclick = async () => {
    const confirmDelete = confirm('Delete this to do list item?');
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${API}/${todo.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': getAuthHeader()
        }
      });

      if (!res.ok) throw new Error('Delete failed');

      li.remove();

    } catch (err) {
      console.error(err);
      alert('Could not delete to do list item');
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
   INITIAL LOAD
======================= */
loadTodos();
