// src/server.js
// The entry point for the Student Store backend.
// Milestone 0: a minimal Express server with a single root route so we can
// confirm the server boots and responds. We'll add real routes in later milestones.

// 1. Import the Express library (installed via npm).
const express = require("express")

// 2. Create an Express application instance. `app` is the object we hang routes off of.
const app = express()

// 3. Pick a port. Use the host's PORT env var if it sets one (Render does this in
//    deployment); otherwise fall back to 3001 for local development.
const PORT = process.env.PORT || 3001

// 4. Middleware: automatically parse incoming JSON request bodies into `req.body`.
//    We don't need it for the root route, but every POST/PUT endpoint we build later
//    will rely on it, so we wire it up once here.
app.use(express.json())

// 5. Root route — a simple health check. A GET request to "/" returns a JSON message.
app.get("/", (req, res) => {
  res.status(200).json({ message: "Student Store API is running 🚀" })
})

// 6. Start listening for incoming HTTP requests on PORT.
//    The callback runs once the server has successfully bound to the port.
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`)
})
