const express = require('express');
const cors    = require('cors');
const mysql   = require('mysql2');
const crypto  = require('crypto');
const app     = express();

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

/* =======================
   MYSQL CONNECTION
   Connects to the local MySQL database.
======================= */
const db = mysql.createConnection({
  host:     '127.0.0.1',
  user:     'appuser',
  password: 'appUser123!',
  database: 'CS3110project'
});

db.connect(err => {
  if (err) {
    console.error('MySQL connection failed:', err);
  } else {
    console.log('Connected to MySQL database');
  }
});

/* =======================
   SESSION AUTH MIDDLEWARE
   Checks the session token sent with each request.
   The token is sent in the Authorization header as:
   "Bearer <token>"
======================= */
function sessionAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  db.query(
    'SELECT sessions.username, users.role FROM sessions JOIN users ON sessions.username = users.username WHERE sessions.id = ?',
    [token],
    (err, results) => {
      if (err)                  return res.status(500).send(err);
      if (results.length === 0) return res.status(401).json({ error: 'Invalid or expired session' });
      req.user = results[0];
      next();
    }
  );
}

/* =======================
   LOGIN
   Checks username and password, creates a session
   token, saves it to the database, and returns it.
======================= */
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.query(
    'SELECT * FROM users WHERE username = ? AND password = ?',
    [username, password],
    (err, results) => {
      if (err)                  return res.status(500).send(err);
      if (results.length === 0) return res.status(401).json({ error: 'Invalid username or password' });

      const user  = results[0];
      const token = crypto.randomBytes(32).toString('hex');

      db.query(
        'INSERT INTO sessions (id, username) VALUES (?, ?)',
        [token, user.username],
        (err) => {
          if (err) return res.status(500).send(err);
          res.json({ token, username: user.username, role: user.role });
        }
      );
    }
  );
});

/* =======================
   LOGOUT
   Deletes the session token from the database.
======================= */
app.post('/api/logout', sessionAuth, (req, res) => {
  const token = req.headers['authorization'].split(' ')[1];
  db.query('DELETE FROM sessions WHERE id = ?', [token], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ message: 'Logged out successfully' });
  });
});

/* =======================
   VERIFY SESSION
   A simple protected route to check
   if the current token is valid.
======================= */
app.get('/api/verify', sessionAuth, (req, res) => {
  res.json({ valid: true, username: req.user.username });
});

/* =======================
   SELF SIGNUP (PUBLIC)
   Anyone can create a regular account.
======================= */
app.post('/api/signup', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.query(
    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
    [username, password, 'author'],
    (err) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'Username already taken' });
        }
        return res.status(500).send(err);
      }
      res.json({ message: 'Account created' });
    }
  );
});

/* =======================
   TODO ROUTES
======================= */

/* GET TODOS — No login required to view */
app.get('/api/todos', (req, res) => {
  db.query('SELECT * FROM todos', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

/* CREATE TODO — Login required */
app.post('/api/todos', sessionAuth, (req, res) => {
  const { text, due_date } = req.body;
  db.query(
    'INSERT INTO todos (text, completed, due_date, username, last_modified_by) VALUES (?, ?, ?, ?, ?)',
    [text, false, due_date || null, req.user.username, req.user.username],
    (err, result) => {
      if (err) return res.status(500).send(err);
      res.json({ id: result.insertId, text, completed: false, due_date: due_date || null });
    }
  );
});

/* UPDATE TODO — Login required */
app.put('/api/todos/:id', sessionAuth, (req, res) => {
  const id = req.params.id;
  const { text, completed, due_date } = req.body;
  db.query(
    'UPDATE todos SET text = ?, completed = ?, due_date = ?, last_modified_by = ? WHERE id = ?',
    [text, completed, due_date || null, req.user.username, id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: 'Todo updated' });
    }
  );
});

/* DELETE TODO — Login required */
app.delete('/api/todos/:id', sessionAuth, (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM todos WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ message: 'Todo deleted' });
  });
});

/* =======================
   CLASS ROUTES
======================= */

/* GET CLASSES — No login required to view */
app.get('/api/classes', (req, res) => {
  db.query('SELECT * FROM classes', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

/* CREATE CLASS — Login required */
app.post('/api/classes', sessionAuth, (req, res) => {
  const { className, day, time, location, frequency, specific_dates, start_date, end_date } = req.body;
  db.query(
    'INSERT INTO classes (className, day, time, location, frequency, specific_dates, start_date, end_date, username, last_modified_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      className,
      day            || null,
      time,
      location       || null,
      frequency      || 'none',
      specific_dates || null,
      start_date     || null,
      end_date       || null,  // NEW
      req.user.username,
      req.user.username
    ],
    (err, result) => {
      if (err) return res.status(500).send(err);
      res.json({
        id: result.insertId,
        className, day, time,
        location:       location       || null,
        frequency:      frequency      || 'none',
        specific_dates: specific_dates || null,
        start_date:     start_date     || null,
        end_date:       end_date       || null   // NEW
      });
    }
  );
});

/* UPDATE CLASS — Login required */
app.put('/api/classes/:id', sessionAuth, (req, res) => {
  const id = req.params.id;
  const { className, day, time, location, frequency, specific_dates, start_date, end_date } = req.body;
  db.query(
    'UPDATE classes SET className = ?, day = ?, time = ?, location = ?, frequency = ?, specific_dates = ?, start_date = ?, end_date = ?, last_modified_by = ? WHERE id = ?',
    [
      className,
      day            || null,
      time,
      location       || null,
      frequency      || 'none',
      specific_dates || null,
      start_date     || null,
      end_date       || null,  // NEW
      req.user.username,
      id
    ],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: 'Class updated' });
    }
  );
});

/* DELETE CLASS — Login required */
app.delete('/api/classes/:id', sessionAuth, (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM classes WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ message: 'Class deleted' });
  });
});

/* =======================
   USER ROUTES (ADMIN ONLY)
======================= */
app.post('/api/users', sessionAuth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { username, password, role } = req.body;
  db.query(
    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
    [username, password, role],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: 'User created' });
    }
  );
});

/* =======================
   SERVER START
======================= */
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
