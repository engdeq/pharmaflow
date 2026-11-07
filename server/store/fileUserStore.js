const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_FILE = path.join(__dirname, "users.json");

function readUsers() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

function writeUsers(users) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), "utf8");
}

function findByUsername(username) {
  return readUsers().find((user) => user.username === username) || null;
}

function findByUsernameOrEmail(username, email) {
  const users = readUsers();
  return (
    users.find(
      (user) =>
        user.username === username || user.email === email.toLowerCase()
    ) || null
  );
}

function createUser({ username, email, password }) {
  const users = readUsers();
  const user = {
    _id: crypto.randomUUID(),
    username,
    email: email.toLowerCase(),
    password,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeUsers(users);
  return user;
}

module.exports = {
  findByUsername,
  findByUsernameOrEmail,
  createUser,
};
