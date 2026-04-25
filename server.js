const express = require('express');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

/* =======================
   IN-MEMORY DATA
======================= */

let todos = [];
let classes = [];

/* Users with roles */
let users = [
  { username: 'admin', password: 'adminpass1', role: 'admin' },
  { username: 'author', password: 'authorpass1', role: 'author' }
];

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

  const user = users.find(
    u => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).send('Invalid credentials');
  }

  req.user = user;
  next();
}

/* =======================
   TODO ROUTES
======================= */

/* GET (unauthenticated) */
app.get('/api/todos', (req, res) => {
  res.json(todos);
});

/* POST (authenticated) */
app.post('/api/todos', basicAuth, (req, res) => {
  const todo = {
    id: Date.now(),
    text: req.body.text,
    completed: false
  };

  todos.push(todo);
  res.json(todo);
});

/* PUT (authenticated) */
app.put('/api/todos/:id', basicAuth, (req, res) => {
  const id = Number(req.params.id);
  const todo = todos.find(t => t.id === id);

  if (!todo) {
    return res.status(404).json({ error: 'Not found' });
  }

  todo.text = req.body.text;
  todo.completed = req.body.completed;

  res.json({ message: 'Todo updated' });
});

/* DELETE (authenticated) */
app.delete('/api/todos/:id', basicAuth, (req, res) => {
  const id = Number(req.params.id);
  todos = todos.filter(t => t.id !== id);

  res.json({ message: 'Todo deleted' });
});

/* =======================
   CLASS ROUTES
======================= */

/* GET (unauthenticated) */
app.get('/api/classes', (req, res) => {
  res.json(classes);
});

/* POST (authenticated) */
app.post('/api/classes', basicAuth, (req, res) => {
  const { className, day, time } = req.body;

  if (!className || !day || !time) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const newClass = {
    id: Date.now(),
    className,
    day,
    time
  };

  classes.push(newClass);
  res.json(newClass);
});

/* PUT (authenticated) */
app.put('/api/classes/:id', basicAuth, (req, res) => {
  const id = Number(req.params.id);
  const cls = classes.find(c => c.id === id);

  if (!cls) {
    return res.status(404).json({ error: 'Class not found' });
  }

  cls.className = req.body.className;
  cls.day = req.body.day;
  cls.time = req.body.time;

  res.json({ message: 'Class updated' });
});

/* DELETE (authenticated) */
app.delete('/api/classes/:id', basicAuth, (req, res) => {
  const id = Number(req.params.id);
  classes = classes.filter(c => c.id !== id);

  res.json({ message: 'Class deleted' });
});

/* =======================
   USER ROUTES (ADMIN ONLY)
======================= */

app.post('/api/users', basicAuth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: admin only' });
  }

  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'User already exists' });
  }

  users.push({ username, password, role });

  res.json({ message: 'User created' });
});

const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'YOUR_PASSWORD',
  database: 'todo_app'
});

db.connect(err => {
  if (err) {
    console.error('DB connection failed:', err);
  } else {
    console.log('Connected to MySQL');
  }
});

/* =======================
   SERVER
======================= */

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
