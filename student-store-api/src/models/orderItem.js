// src/models/orderItem.js
// Data-access layer for order items. The milestone only requires fetching and
// creating order items (full transactional order creation is Milestone 5).

const prisma = require("../db/db")

class OrderItem {
  // READ ALL — return every order item (used by the GET /order-items stretch route).
  static async list() {
    return await prisma.orderItem.findMany()
  }

  // CREATE — add a single order item linked to an existing order + product.
  static async create({ orderId, productId, quantity, price }) {
    return await prisma.orderItem.create({
      data: {
        orderId: Number(orderId),
        productId: Number(productId),
        quantity,
        price,
      },
    })
  }
}

module.exports = OrderItem
