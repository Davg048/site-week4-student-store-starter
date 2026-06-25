// src/models/product.js
// The "data-access layer" for products. Every database operation on products
// lives here as a method on the Product class. The route handlers in server.js
// call these methods — they never talk to Prisma directly. This keeps the
// "how do we talk to the DB" logic in one place.

const prisma = require("../db/db")

// The frontend reads `product.image_url` (snake_case). Our model field is `imageUrl`.
// This helper returns the product with BOTH keys so the API is backward-compatible
// and the frontend works untouched. Returns null/undefined unchanged.
function withImageUrl(product) {
  if (!product) return product
  return { ...product, image_url: product.imageUrl }
}

class Product {
  // READ ALL — return products, optionally filtered by category and/or sorted.
  // options: { category?: string, sort?: "price" | "name" }
  static async list({ category, sort } = {}) {
    // Build the Prisma query piece by piece so we only add what was requested.
    const query = {}

    // Filtering: only add a `where` clause if a category was provided.
    if (category) {
      query.where = { category }
    }

    // Sorting: only allow the fields we documented in the spec.
    if (sort === "price" || sort === "name") {
      query.orderBy = { [sort]: "asc" }
    }

    const products = await prisma.product.findMany(query)
    return products.map(withImageUrl)
  }

  // READ ONE — find a single product by its id. Returns null if not found.
  static async getById(id) {
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
    })
    return withImageUrl(product)
  }

  // CREATE — insert a new product row and return it.
  static async create({ name, description, price, imageUrl, category }) {
    return await prisma.product.create({
      data: { name, description, price, imageUrl, category },
    })
  }

  // UPDATE — change fields on an existing product and return the updated row.
  static async update(id, data) {
    return await prisma.product.update({
      where: { id: Number(id) },
      data,
    })
  }

  // DELETE — remove a product row and return the deleted record.
  static async delete(id) {
    return await prisma.product.delete({
      where: { id: Number(id) },
    })
  }
}

module.exports = Product
