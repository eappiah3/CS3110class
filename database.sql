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
  username VARCHAR(255),
  last_modified_by VARCHAR(255),
  last_modified_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (username) REFERENCES users(username)
);

CREATE TABLE classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  className VARCHAR(255),
  day VARCHAR(50),
  time VARCHAR(50),
  username VARCHAR(255),
  last_modified_by VARCHAR(255),
  last_modified_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (username) REFERENCES users(username)
);

INSERT INTO users (username, password, role)
  VALUES 
  ('admin', 'adminpass1', 'admin'),
  ('author', 'authorpass1', 'author');

CREATE USER 'appuser'@'%' IDENTIFIED BY 'appuser123';
GRANT ALL PRIVILEGES ON `CS3110project`.* TO 'appuser'@'%';

FLUSH PRIVILEGES;
