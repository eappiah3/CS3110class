const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

/* =======================
   MYSQL CONNECTION
   Connects to the local MySQL database.
======================= */
const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'appuser',
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
   BASIC AUTH MIDDLEWARE
   Checks the username and password sent
   with each request against the database.
   If they don't match, the request is blocked.
======================= */
function basicAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic');
    return res.status(401).send('Authentication required');
  }

  const base64 = authHeader.split(' ')[1];
  const decoded = Buffer.from(base64, 'base64').toString();
  const [username, password] = decoded.split(':');

  db.query(
    'SELECT * FROM users WHERE username = ? AND password = ?',
    [username, password],
    (err, results) => {
      if (err) return res.status(500).send(err);
      if (results.length === 0) {
        return res.status(401).send('Invalid credentials');
      }
      req.user = results[0];
      next();
    }
  );
}

/* =======================
   SELF SIGNUP (PUBLIC)
   Anyone can create a regular account.
   No login required for this route.
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
        // Username already taken
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
  db.query(
    'SELECT * FROM todos',
    (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results);
    }
  );
});

/* CREATE TODO — Login required */
app.post('/api/todos', basicAuth, (req, res) => {
  const { text } = req.body;
  db.query(
    'INSERT INTO todos (text, completed, username, last_modified_by) VALUES (?, ?, ?, ?)',
    [text, false, req.user.username, req.user.username],
    (err, result) => {
      if (err) return res.status(500).send(err);
      res.json({
        id: result.insertId,
        text,
        completed: false
      });
    }
  );
});

/* UPDATE TODO — Login required */
app.put('/api/todos/:id', basicAuth, (req, res) => {
  const id = req.params.id;
  const { text, completed } = req.body;
  db.query(
    'UPDATE todos SET text = ?, completed = ?, last_modified_by = ? WHERE id = ?',
    [text, completed, req.user.username, id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: 'Todo updated' });
    }
  );
});

/* DELETE TODO — Login required */
app.delete('/api/todos/:id', basicAuth, (req, res) => {
  const id = req.params.id;
  db.query(
    'DELETE FROM todos WHERE id = ?',
    [id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: 'Todo deleted' });
    }
  );
});

/* =======================
   CLASS ROUTES
======================= */

/* GET CLASSES — No login required to view */
app.get('/api/classes', (req, res) => {
  db.query(
    'SELECT * FROM classes',
    (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results);
    }
  );
});

/* CREATE CLASS — Login required */
app.post('/api/classes', basicAuth, (req, res) => {
  const { className, day, time } = req.body;
  db.query(
    'INSERT INTO classes (className, day, time, username, last_modified_by) VALUES (?, ?, ?, ?, ?)',
    [className, day, time, req.user.username, req.user.username],
    (err, result) => {
      if (err) return res.status(500).send(err);
      res.json({
        id: result.insertId,
        className,
        day,
        time
      });
    }
  );
});

/* UPDATE CLASS — Login required */
app.put('/api/classes/:id', basicAuth, (req, res) => {
  const id = req.params.id;
  const { className, day, time } = req.body;
  db.query(
    'UPDATE classes SET className = ?, day = ?, time = ?, last_modified_by = ? WHERE id = ?',
    [className, day, time, req.user.username, id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: 'Class updated' });
    }
  );
});

/* DELETE CLASS — Login required */
app.delete('/api/classes/:id', basicAuth, (req, res) => {
  const id = req.params.id;
  db.query(
    'DELETE FROM classes WHERE id = ?',
    [id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: 'Class deleted' });
    }
  );
});

/* =======================
   USER ROUTES (ADMIN ONLY)
   Only admins can create users this way.
   Regular users should use /api/signup instead.
======================= */
app.post('/api/users', basicAuth, (req, res) => {
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
