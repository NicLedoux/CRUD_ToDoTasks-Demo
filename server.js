// path: server.js
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const TodoTask = require("./models/toDoTask");

const app = express();
const HOST = "0.0.0.0";                 // ensure Fly can reach it
const PORT = Number(process.env.PORT) || 8080;

// Middleware & view engine
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// Health endpoints
app.get("/healthz", (_req, res) => res.status(200).send("ok")); // WHY: keep health check DB-independent
app.get("/readyz", (_req, res) => {
  const state = mongoose.connection.readyState; // 0=disc,1=conn,2=conn'.,3=disc'
  res.status(state === 1 ? 200 : 503).json({ dbState: state });
});

// Routes
app.get("/", (_req, res) => {
  TodoTask.find({}, (err, tasks) => {
    if (err) return res.status(500).send("Database error.");
    res.render("index.ejs", { todoTasks: tasks || [] });
  });
});

app.post("/", async (req, res) => {
  try {
    const todoTask = new TodoTask({
      title: req.body.title,
      content: req.body.content,
    });
    await todoTask.save();
    res.redirect("/");
  } catch {
    res.status(500).send("Failed to save.");
  }
});

app
  .route("/edit/:id")
  .get((req, res) => {
    const id = req.params.id;
    TodoTask.find({}, (err, tasks) => {
      if (err) return res.status(500).send("Database error.");
      res.render("edit.ejs", { todoTasks: tasks || [], idTask: id });
    });
  })
  .post((req, res) => {
    TodoTask.findByIdAndUpdate(
      req.params.id,
      { title: req.body.title, content: req.body.content },
      (err) => (err ? res.status(500).send("Update failed.") : res.redirect("/"))
    );
  });

app.get("/remove/:id", (req, res) => {
  TodoTask.findByIdAndRemove(req.params.id, (err) =>
    err ? res.status(500).send("Delete failed.") : res.redirect("/")
  );
});

// Startup
async function start() {
  const uri = process.env.DB_CONNECTION;
  if (uri) {
    try {
      await mongoose.connect(uri); // mongoose v6+ sane defaults
      console.log("Connected to MongoDB");
    } catch (e) {
      console.error("MongoDB connection failed:", e.message); // keep serving /healthz
    }
  } else {
    console.warn("WARN: DB_CONNECTION not set; starting without Mongo.");
  }

  const server = app.listen(PORT, HOST, () =>
    console.log(`Server listening on http://${HOST}:${PORT}`)
  );

  // Graceful shutdown
  const shutdown = () => {
    console.log("Shutting down...");
    server.close(() => {
      mongoose.connection.close(false, () => process.exit(0));
    });
    setTimeout(() => process.exit(1), 8000).unref(); // WHY: avoid hanging forever
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
start();

module.exports = app;



