const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

// In-memory "database" — resets if the instance restarts, which is fine for a demo
let registrations = [];
let nextId = 1;

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/', (req, res) => {
  const rows = registrations.map(r =>
    `<tr><td>${r.id}</td><td>${r.name}</td><td>${r.roll}</td><td>${r.room}</td></tr>`
  ).join('');

  res.send(`
    <html>
    <head>
      <title>Hostel Registration</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; }
        input { display: block; margin: 8px 0; padding: 6px; width: 100%; }
        button { padding: 8px 16px; background: #2c7be5; color: white; border: none; cursor: pointer; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        td, th { border: 1px solid #ccc; padding: 6px; text-align: left; }
      </style>
    </head>
    <body>
      <h2>Hostel Registration</h2>
      <form method="POST" action="/register">
        <input name="name" placeholder="Full Name" required>
        <input name="roll" placeholder="Roll Number" required>
        <input name="room" placeholder="Preferred Room Type (e.g. Single/Double)" required>
        <button type="submit">Register</button>
      </form>

      <h3>Registered Students (${registrations.length})</h3>
      <table>
        <tr><th>ID</th><th>Name</th><th>Roll No.</th><th>Room</th></tr>
        ${rows || '<tr><td colspan="4">No registrations yet</td></tr>'}
      </table>
    </body>
    </html>
  `);
});

app.post('/register', (req, res) => {
  const { name, roll, room } = req.body;
  registrations.push({ id: nextId++, name, roll, room });
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});