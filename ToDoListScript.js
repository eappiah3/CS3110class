const form = document.getElementById('todoForm');
const input = document.getElementById('input');
const list = document.getElementById('todoList');
const API = 'https://eacs3110.mooo.com/api/todos';

/* =======================
   AUTH HELPER (CACHED)
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
======================= */
form.addEventListener('submit', async function (event) {
  event.preventDefault();
  const text = input.value.trim();
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
      body: JSON.stringify({ text })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("SERVER ERROR:", res.status, errorText);
      throw new Error(errorText || 'Failed to create todo');
    }

    const newTodo = await res.json();
    addTodoToDOM(newTodo);
    input.value = '';
  } catch (err) {
    console.error("FRONTEND ERROR:", err);
    alert('Could not add todo: ' + err.message);
  } finally {
    form.querySelector('button').disabled = false;
  }
});

/* =======================
   LOAD TODOS
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
======================= */
function addTodoToDOM(todo) {
  const li = document.createElement('li');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = todo.completed;

  const span = document.createElement('span');
  span.textContent = `${todo.text} (Last edited by ${todo.last_modified_by})`;

  /* UPDATE */
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

  /* DELETE */
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

loadTodos();
setInterval(loadTodos, 5000);
