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
   NOTIFICATIONS
======================= */
async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    alert("This browser does not support notifications.");
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    console.log("Notifications enabled");
  }
}

function showNotificationOnce(id, title, body) {
  if (Notification.permission !== "granted") return;

  if (localStorage.getItem("notified_" + id)) return;

  new Notification(title, {
    body: body
  });

  localStorage.setItem("notified_" + id, "true");
}

function checkUpcomingClasses(classes) {
  const now = new Date();

  classes.forEach(cls => {
    const [hour, minute] = cls.time.split(":");

    const classTime = new Date();
    classTime.setHours(hour);
    classTime.setMinutes(minute);
    classTime.setSeconds(0);

    const diff = (classTime - now) / 60000;

    if (diff > 0 && diff <= 15) {
      showNotificationOnce(
        cls.id,
        "Upcoming Class",
        `${cls.className} starts in ${Math.floor(diff)} minutes`
      );
    }
  });
}

/* =======================
   LOAD CLASSES
======================= */
async function loadClasses() {
  try {
    const res = await fetch(API);

    if (!res.ok) throw new Error('Failed to fetch classes');

    const data = await res.json();

    list.innerHTML = '';

    checkUpcomingClasses(data);

    data.forEach(cls => {
      const li = document.createElement('li');

      li.textContent =
        `${cls.day} - ${cls.time} : ${cls.className} (Last edited by ${cls.last_modified_by})`;

      /* EDIT */
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

          li.textContent =
            `${day} - ${time} : ${className} (Last edited by you)`;

        } catch (err) {
          console.error(err);
          alert('Could not update class');
        }
      };

      /* DELETE */
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
   CREATE CLASS
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
requestNotificationPermission();
loadClasses();
setInterval(loadClasses, 5000);
