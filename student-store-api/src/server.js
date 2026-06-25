// src/server.js
// The entry point for the Student Store backend.

const express = require("express")
const Product = require("./models/product")
const Order = require("./models/order")
const OrderItem = require("./models/orderItem")

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

// GET /products — list all products, with optional ?category= and ?sort= params.
app.get("/products", async (req, res) => {
  try {
    const { category, sort } = req.query
    const products = await Product.list({ category, sort })
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
// ORDER ROUTES (Milestone 3)
// ---------------------------------------------------------------------------

// GET /orders — list all orders.
app.get("/orders", async (req, res) => {
  try {
    const orders = await Order.list()
    res.status(200).json(orders)
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders" })
  }
})

// GET /orders/:order_id — fetch a single order by id.
app.get("/orders/:order_id", async (req, res) => {
  try {
    const order = await Order.getById(req.params.order_id)
    if (!order) {
      return res.status(404).json({ error: "Order not found" })
    }
    res.status(200).json(order)
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch order" })
  }
})

// POST /orders — create a new order.
// (Milestone 5 will extend this to also create order items atomically.)
app.post("/orders", async (req, res) => {
  try {
    const { customer, totalPrice, status } = req.body

    // Basic validation: customer and totalPrice are required.
    if (customer === undefined || totalPrice === undefined) {
      return res.status(400).json({
        error: "Missing required field(s): customer, totalPrice",
      })
    }

    const order = await Order.create({ customer, totalPrice, status })
    res.status(201).json(order)
  } catch (err) {
    res.status(500).json({ error: "Failed to create order" })
  }
})

// PUT /orders/:order_id — update an existing order (e.g. change status).
app.put("/orders/:order_id", async (req, res) => {
  try {
    const order = await Order.update(req.params.order_id, req.body)
    res.status(200).json(order)
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Order not found" })
    }
    res.status(500).json({ error: "Failed to update order" })
  }
})

// DELETE /orders/:order_id — remove an order.
app.delete("/orders/:order_id", async (req, res) => {
  try {
    const order = await Order.delete(req.params.order_id)
    res.status(200).json({ message: "Order deleted", order })
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Order not found" })
    }
    res.status(500).json({ error: "Failed to delete order" })
  }
})

// ---------------------------------------------------------------------------
// ORDER ITEM ROUTES (Milestone 4)
// ---------------------------------------------------------------------------

// GET /order-items — list every order item in the database.
app.get("/order-items", async (req, res) => {
  try {
    const items = await OrderItem.list()
    res.status(200).json(items)
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch order items" })
  }
})

// POST /orders/:order_id/items — add a single item to an existing order.
app.post("/orders/:order_id/items", async (req, res) => {
  try {
    const { productId, quantity, price } = req.body

    if (productId === undefined || quantity === undefined || price === undefined) {
      return res.status(400).json({
        error: "Missing required field(s): productId, quantity, price",
      })
    }

    // The parent order must exist before we attach an item to it.
    const order = await Order.getById(req.params.order_id)
    if (!order) {
      return res.status(404).json({ error: "Order not found" })
    }

    const item = await OrderItem.create({
      orderId: req.params.order_id,
      productId,
      quantity,
      price,
    })
    res.status(201).json(item)
  } catch (err) {
    // P2003 = foreign key constraint failed (e.g. productId doesn't exist).
    if (err.code === "P2003") {
      return res.status(404).json({ error: "Referenced product does not exist" })
    }
    res.status(500).json({ error: "Failed to create order item" })
  }
})

// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`)
})
