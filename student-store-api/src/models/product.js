// src/models/product.js
// The "data-access layer" for products. Every database operation on products
// lives here as a method on the Product class. The route handlers in server.js
// call these methods — they never talk to Prisma directly. This keeps the
// "how do we talk to the DB" logic in one place.

const prisma = require("../db/db")

class Product {
  // READ ALL — return every product in the table.
  static async list() {
    return await prisma.product.findMany()
  }

  // READ ONE — find a single product by its id. Returns null if not found.
  static async getById(id) {
    return await prisma.product.findUnique({
      where: { id: Number(id) },
    })
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
