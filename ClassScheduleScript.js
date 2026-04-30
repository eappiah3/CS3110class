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
    console.log("Notifications not supported");
    return;
  }

  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

function showNotificationOnce(id, title, body) {
  if (Notification.permission !== "granted") return;

  if (localStorage.getItem("notified_" + id)) return;

  new Notification(title, { body });

  localStorage.setItem("notified_" + id, "true");
}

/* =======================
   DATE / TIME LOGIC
======================= */
function getClassDateTime(timeString) {
  const now = new Date();
  const [hour, minute] = timeString.split(":");

  const classTime = new Date(now);
  classTime.setHours(parseInt(hour));
  classTime.setMinutes(parseInt(minute));
  classTime.setSeconds(0);
  classTime.setMilliseconds(0);

  return classTime;
}

function getTimeDifferenceMinutes(classTime) {
  const now = new Date();
  return (classTime - now) / 60000;
}

/* =======================
   NOTIFICATION CHECK
======================= */
function checkUpcomingClasses(classes) {
  classes.forEach(cls => {
    const classTime = getClassDateTime(cls.time);
    const diff = getTimeDifferenceMinutes(classTime);

    if (diff > 0 && diff <= 15) {
      showNotificationOnce(
        cls.id,
        "Upcoming Class",
        `${cls.className} starts in ${Math.floor(diff)} minutes`
      );
    }

    if (diff <= 0 && diff > -5) {
      showNotificationOnce(
        cls.id + "_start",
        "Class Started",
        `${cls.className} is starting now`
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
    if (!res.ok) throw new Error("Failed to fetch classes");

    const data = await res.json();

    list.innerHTML = "";

    checkUpcomingClasses(data);

    data.forEach(cls => {
      const li = document.createElement("li");

      const classTime = getClassDateTime(cls.time);
      const diff = getTimeDifferenceMinutes(classTime);

      let status = "";
      let color = "";

      if (diff < 0) {
        status = "OVERDUE";
        color = "red";
      } else if (diff <= 15) {
        status = `SOON (${Math.floor(diff)} min)`;
        color = "orange";
      } else {
        status = `UPCOMING (${Math.floor(diff)} min)`;
        color = "green";
      }

      li.style.color = color;

      li.textContent =
        `${cls.day} - ${cls.time} : ${cls.className} [${status}] (Last edited by ${cls.last_modified_by})`;

      /* =======================
         EDIT
      ======================= */
      li.onclick = async () => {
        const className = prompt("Edit class name:", cls.className);
        const day = prompt("Edit day:", cls.day);
        const time = prompt("Edit time (HH:MM):", cls.time);

        if (!className || !day || !time) return;

        try {
          const res = await fetch(`${API}/${cls.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": getAuthHeader()
            },
            body: JSON.stringify({ className, day, time })
          });

          if (!res.ok) throw new Error("Update failed");

          loadClasses();

        } catch (err) {
          console.error(err);
          alert("Could not update class");
        }
      };

      /* =======================
         DELETE
      ======================= */
      li.ondblclick = async () => {
        if (!confirm("Delete this class?")) return;

        try {
          const res = await fetch(`${API}/${cls.id}`, {
            method: "DELETE",
            headers: {
              "Authorization": getAuthHeader()
            }
          });

          if (!res.ok) throw new Error("Delete failed");

          li.remove();

        } catch (err) {
          console.error(err);
          alert("Could not delete class");
        }
      };

      list.appendChild(li);
    });

  } catch (err) {
    console.error(err);
    list.innerHTML = "<li>Error loading classes</li>";
  }
}

/* =======================
   CREATE CLASS
======================= */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const className = document.getElementById("className").value;
  const day = document.getElementById("day").value;
  const time = document.getElementById("time").value;

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": getAuthHeader()
      },
      body: JSON.stringify({ className, day, time })
    });

    if (!res.ok) throw new Error("Failed to create class");

    form.reset();
    loadClasses();

  } catch (err) {
    console.error(err);
    alert("Could not add class");
  }
});

/* =======================
   INIT
======================= */
requestNotificationPermission();
loadClasses();
setInterval(loadClasses, 5000);
