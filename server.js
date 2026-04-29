const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

/* =======================
   MYSQL CONNECTION
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
   TODO ROUTES
======================= */

/* GET TODOS */
app.get('/api/todos', (req, res) => {
  db.query(
    'SELECT * FROM todos',
    (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results);
    }
  );
});

/* CREATE TODO */
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

/* UPDATE TODO */
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

/* DELETE TODO */
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

/* GET CLASSES */
app.get('/api/classes', (req, res) => {
  db.query(
    'SELECT * FROM classes',
    (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results);
    }
  );
});

/* CREATE CLASS */
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

/* UPDATE CLASS */
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

/* DELETE CLASS */
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
