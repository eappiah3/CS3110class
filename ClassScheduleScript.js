const API = '/api/classes';

const form = document.getElementById('classScheduleForm');
const list = document.getElementById('classSchedule');

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
   LOAD CLASSES (GET - NO AUTH)
======================= */
async function loadClasses() {
  try {
    const res = await fetch(API); // ❗ unauthenticated GET
    if (!res.ok) throw new Error('Failed to fetch classes');

    const data = await res.json();

    list.innerHTML = '';

    data.forEach(cls => {
      const li = document.createElement('li');
      li.textContent = `${cls.day} - ${cls.time} : ${cls.className} (Last edited by ${cls.last_modified_by})`;

      /* EDIT (click) */
      li.onclick = async () => {
        const className = prompt("Edit class name:", cls.className);
        const day = prompt("Edit day:", cls.day);
        const time = prompt("Edit time:", cls.time);

        if (!className || !day || !time) return;

        try {
          const res = await fetch(`${API}/${cls.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': getAuthHeader()
            },
            body: JSON.stringify({ className, day, time })
          });

          if (!res.ok) throw new Error('Update failed');

          li.textContent = `${day} - ${time} : ${className}`;

        } catch (err) {
          console.error(err);
          alert('Could not update class');
        }
      };

      /* DELETE (double click) */
      li.ondblclick = async () => {
        const confirmDelete = confirm('Delete this class?');
        if (!confirmDelete) return;

        try {
          const res = await fetch(`${API}/${cls.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': getAuthHeader()
            }
          });

          if (!res.ok) throw new Error('Delete failed');

          li.remove();

        } catch (err) {
          console.error(err);
          alert('Could not delete class');
        }
      };

      list.appendChild(li);
    });

  } catch (err) {
    console.error(err);
    list.innerHTML = '<li>Error loading classes</li>';
  }
}

/* =======================
   CREATE CLASS (POST)
======================= */
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const className = document.getElementById('className').value;
  const day = document.getElementById('day').value;
  const time = document.getElementById('time').value;

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader()
      },
      body: JSON.stringify({ className, day, time })
    });

    if (!res.ok) throw new Error('Failed to create class');

    form.reset();
    loadClasses();

  } catch (err) {
    console.error(err);
    alert('Could not add class');
  }
});

/* =======================
   INITIAL LOAD
======================= */
loadClasses();
setInterval(loadClasses, 5000);
