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

  // CREATE WITH ITEMS (Milestone 5) — the transactional endpoint.
  // Accepts customer/status plus an array of { productId, quantity }.
  // Looks up real prices from the DB, computes the total, and creates the
  // order + all its items atomically. If any item references a missing
  // product, it throws BEFORE the transaction so nothing is written.
  static async createWithItems({ customer, status, items }) {
    // Step 2 (spec): look up every referenced product in one query.
    const productIds = items.map((item) => Number(item.productId))
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    })

    // Validate: every requested product must exist. Stop before writing anything.
    const priceById = new Map(products.map((p) => [p.id, p.price]))
    for (const item of items) {
      if (!priceById.has(Number(item.productId))) {
        const err = new Error(`Product with id ${item.productId} not found`)
        err.code = "PRODUCT_NOT_FOUND"
        throw err
      }
    }

    // Step 3 (spec): compute line prices and total from DB prices, never the client.
    let totalPrice = 0
    const itemsData = items.map((item) => {
      const unitPrice = priceById.get(Number(item.productId))
      totalPrice += unitPrice * item.quantity
      return {
        productId: Number(item.productId),
        quantity: item.quantity,
        price: unitPrice,
      }
    })

    // Step 4 (spec): create order + items atomically inside a transaction.
    // If any operation throws, the whole thing rolls back — no partial order.
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: { customer, status, totalPrice },
      })

      await tx.orderItem.createMany({
        data: itemsData.map((d) => ({ ...d, orderId: order.id })),
      })

      // Step 5 (spec): return the created order with its items + products included.
      return tx.order.findUnique({
        where: { id: order.id },
        include: { orderItems: { include: { product: true } } },
      })
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
