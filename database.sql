DROP DATABASE IF EXISTS CS3110project;
CREATE DATABASE CS3110project;
USE CS3110project;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  role VARCHAR(50)
);

CREATE TABLE todos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  text VARCHAR(255),
  completed BOOLEAN DEFAULT false,
  due_date DATE,                        -- Optional due date for the task
  username VARCHAR(255),
  last_modified_by VARCHAR(255),
  last_modified_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (username) REFERENCES users(username)
);

CREATE TABLE classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  className VARCHAR(255),
  day VARCHAR(255),                     -- Now stores multiple days e.g. "Monday,Wednesday,Friday"
  time VARCHAR(50),
  location VARCHAR(255),               -- Where the class is held
  frequency VARCHAR(50) DEFAULT 'none',-- "none", "weekly", "monthly", or "specific"
  specific_dates TEXT,                 -- Comma separated dates e.g. "2026-05-01,2026-05-15"
  start_date DATE,                     -- The first date of the class
  username VARCHAR(255),
  last_modified_by VARCHAR(255),
  last_modified_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (username) REFERENCES users(username)
);

INSERT INTO users (username, password, role)
VALUES
('admin', 'adminPass1!', 'admin'),
('author', 'authorPass1!', 'author');

CREATE USER IF NOT EXISTS 'appuser'@'localhost' IDENTIFIED BY 'appUser123!';
CREATE USER IF NOT EXISTS 'appuser'@'%' IDENTIFIED BY 'appUser123!';
ALTER USER 'appuser'@'localhost' IDENTIFIED BY 'appUser123!';
ALTER USER 'appuser'@'%' IDENTIFIED BY 'appUser123!';
GRANT ALL PRIVILEGES ON CS3110project.* TO 'appuser'@'localhost';
GRANT ALL PRIVILEGES ON CS3110project.* TO 'appuser'@'%';
FLUSH PRIVILEGES;
