// src/models/order.js
// The data-access layer for orders. Mirrors the Product class: every database
// operation on orders lives here as a static method. Route handlers call these;
// they never touch Prisma directly.
//
// Note: creating an order WITH its order items atomically is Milestone 5.
// For now these are plain order-level CRUD methods.

const prisma = require("../db/db")

class Order {
  // READ ALL — return every order.
  static async list() {
    return await prisma.order.findMany()
  }

  // READ ONE — find a single order by id, WITH its order items nested in.
  // `include` pulls the related order_items rows (and each item's product) in one query.
  static async getById(id) {
    return await prisma.order.findUnique({
      where: { id: Number(id) },
      include: {
        orderItems: {
          include: { product: true },
        },
      },
    })
  }

  // CREATE — insert a new order. status and createdAt use schema defaults
  // when not provided.
  static async create({ customer, totalPrice, status }) {
    return await prisma.order.create({
      data: { customer, totalPrice, status },
    })
  }

  // UPDATE — change fields on an existing order (e.g. status) and return it.
  static async update(id, data) {
    return await prisma.order.update({
      where: { id: Number(id) },
      data,
    })
  }

  // DELETE — remove an order and return the deleted record.
  static async delete(id) {
    return await prisma.order.delete({
      where: { id: Number(id) },
    })
  }
}

module.exports = Order
