// src/server.js
// The entry point for the Student Store backend.

const express = require("express")
const Product = require("./models/product")

const app = express()
const PORT = process.env.PORT || 3001

// Parse incoming JSON request bodies into req.body for every POST/PUT request.
app.use(express.json())

// Root route — a simple health check.
app.get("/", (req, res) => {
  res.status(200).json({ message: "Student Store API is running 🚀" })
})

// ---------------------------------------------------------------------------
// PRODUCT ROUTES (Milestone 1)
// ---------------------------------------------------------------------------

// GET /products — list all products.
app.get("/products", async (req, res) => {
  try {
    const products = await Product.list()
    res.status(200).json(products)
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" })
  }
})

// GET /products/:id — fetch a single product by id.
app.get("/products/:id", async (req, res) => {
  try {
    const product = await Product.getById(req.params.id)
    if (!product) {
      return res.status(404).json({ error: "Product not found" })
    }
    res.status(200).json(product)
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product" })
  }
})

// POST /products — create a new product.
app.post("/products", async (req, res) => {
  try {
    const { name, description, price, imageUrl, category } = req.body

    // Basic validation: required fields must be present.
    if (!name || !description || price === undefined || !category) {
      return res.status(400).json({
        error: "Missing required field(s): name, description, price, category",
      })
    }

    const product = await Product.create({ name, description, price, imageUrl, category })
    res.status(201).json(product)
  } catch (err) {
    res.status(500).json({ error: "Failed to create product" })
  }
})

// PUT /products/:id — update an existing product.
app.put("/products/:id", async (req, res) => {
  try {
    const product = await Product.update(req.params.id, req.body)
    res.status(200).json(product)
  } catch (err) {
    // Prisma throws P2025 when the record to update does not exist.
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Product not found" })
    }
    res.status(500).json({ error: "Failed to update product" })
  }
})

// DELETE /products/:id — remove a product.
app.delete("/products/:id", async (req, res) => {
  try {
    const product = await Product.delete(req.params.id)
    res.status(200).json({ message: "Product deleted", product })
  } catch (err) {
    // Prisma throws P2025 when the record to delete does not exist.
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Product not found" })
    }
    res.status(500).json({ error: "Failed to delete product" })
  }
})

// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`)
})
