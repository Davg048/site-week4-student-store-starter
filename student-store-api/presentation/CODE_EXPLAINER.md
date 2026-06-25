# 🏪 Student Store — Complete Code Explainer

> **What this is:** every significant piece of the Student Store backend, explained in one place —
> built up across Milestones 0–6. For each part you get the code, a plain-language explanation, and
> the *why*. Read top-to-bottom to understand the whole system, or jump to a section.
>
> **Stack:** Node.js + Express (API) · Prisma ORM (data access) · PostgreSQL (database) · React frontend.

---

## 0. The Big Picture — how a request flows

Every single API call travels the same path through four layers. Understanding this one diagram
explains the entire codebase:

```
  CLIENT                EXPRESS                  MODEL              PRISMA            POSTGRES
(browser/Postman)      (server.js)        (models/*.js)         (db.js)           (database)
     │   HTTP request      │                      │                  │                 │
     │ ───────────────────►│  pick route          │                  │                 │
     │                     │  call model ────────►│  Product.list()  │                 │
     │                     │                      │ prisma.product ─►│  SQL: SELECT ──►│
     │                     │                      │   .findMany()    │◄──── rows ──────│
     │                     │◄──── JS objects ─────│◄──── result ─────│                 │
     │  JSON + status ◄────│                      │                  │                 │
     │                     │                      │                  │                 │
  LAYER:  transport     routing/validation     business logic     ORM/translator    storage
          (HTTP verbs)  (status codes)         (CRUD methods)     (JS ⇄ SQL)        (SQL only)
```

**The key mental models that unlock everything:**

- **Postgres only speaks SQL.** It never sees your Prisma schema or your JavaScript. **Prisma is a
  translator** that converts your schema → SQL (during migrations) and your `prisma.product.findMany()`
  calls → `SELECT` statements (at runtime). The database just executes literal SQL it's handed.
- **Separation of concerns.** `server.js` decides *what HTTP status to return*. The model files decide
  *how to talk to the database*. Routes never call Prisma directly — they go through the model. Swap the
  database later and only the model changes.
- **Two-phase database changes.** Editing `schema.prisma` only changes a *text file* describing what you
  want. Running a *migration* is what actually builds the table in Postgres. Describe, then apply.

---

## 1. Project Setup (Milestone 0)

### The Express server — `src/server.js` (the skeleton)

```js
const express = require("express")
const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json())

app.get("/", (req, res) => {
  res.status(200).json({ message: "Student Store API is running 🚀" })
})

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`)
})
```

| Line | What it does |
|------|--------------|
| `require("express")` | Imports the Express library (CommonJS module system). |
| `express()` | Creates the application object — the hub you attach routes/middleware to. |
| `process.env.PORT \|\| 3001` | Use the host's port (Render sets one) **or** fall back to 3001 locally. One line, works everywhere. |
| `app.use(express.json())` | **Middleware** that parses incoming JSON bodies into `req.body`. Every POST/PUT needs it. |
| `app.get("/", (req, res) => …)` | Registers a route. `req` = incoming request, `res` = response. |
| `res.status(200).json(...)` | Sets the HTTP status and sends a JSON body. |
| `app.listen(PORT, …)` | Starts the server listening. The callback runs once it's up. |

**Mental model — the walkie-talkie:** `node ./src/server.js` turns the radio ON and makes it *listen* on
channel 3001. Visiting `localhost:3001` is pressing "talk." The terminal looks frozen because the server
runs forever on purpose. `Ctrl+C` turns it off.

### The shared Prisma client — `src/db/db.js`

```js
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
module.exports = prisma
```

One `PrismaClient` instance, exported once and imported everywhere. This is the single database connection
the whole app shares — you never create a second one.

### Spec-first development — `planning.md`

Before any code, we wrote the **system spec**: all three data models + cascade rules, the full API
contract (every endpoint with request/response shapes + error cases), and the `POST /orders` transaction
flow. Every later milestone just translated a section of that plan into code. This is the discipline the
whole project is built to teach: **decide what the system does in writing, then make the code match.**

---

## 2. The Product Model (Milestone 1)

### Schema — `prisma/schema.prisma`

```prisma
model Product {
  id          Int     @id @default(autoincrement())
  name        String
  description String
  price       Float
  imageUrl    String? @map("image_url")
  category    String

  orderItems  OrderItem[]   // back-relation (added in M4)

  @@map("products")
}
```

| Syntax | Meaning |
|--------|---------|
| `model Product` | One model = one table + the object shape you work with in code. |
| `@id` | Marks the primary key (the unique identifier per row). |
| `@default(autoincrement())` | DB auto-assigns 1, 2, 3… You never set `id` manually. → SQL `SERIAL`. |
| `String?` | The `?` makes it **optional** (column allows NULL). A product can have no image. |
| `@map("image_url")` | Code calls it `imageUrl`; the DB **column** is `image_url`. The camelCase↔snake_case bridge. |
| `@@map("products")` | The **table** is named `products`. (`@` = one field, `@@` = whole model.) |

**The key design decision of the whole project:** Prisma fields are camelCase (JS convention + the
committed `seed.js` uses them), but DB columns are snake_case (the rubric requires them). `@map`/`@@map`
satisfy both at once.

### What the migration generated (the SQL Prisma wrote for us)

```sql
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "image_url" TEXT,                       -- no NOT NULL → optional (our String?)
    "category" TEXT NOT NULL,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);
```

We never wrote this SQL — `npx prisma migrate dev --name init_products_table` translated the schema into
it. Notice `Float`→`DOUBLE PRECISION`, `@id @default(autoincrement())`→`SERIAL ... PRIMARY KEY`. Those are
**Postgres's words**, produced by Prisma's translation.

### The model class — `src/models/product.js`

```js
const prisma = require("../db/db")

class Product {
  static async list({ category, sort } = {}) {            // READ ALL (+ M2 filter/sort)
    const query = {}
    if (category) query.where = { category }
    if (sort === "price" || sort === "name") query.orderBy = { [sort]: "asc" }
    const products = await prisma.product.findMany(query)
    return products.map(withImageUrl)                     // M6: add image_url alias
  }

  static async getById(id) {                              // READ ONE
    const product = await prisma.product.findUnique({ where: { id: Number(id) } })
    return withImageUrl(product)
  }

  static async create({ name, description, price, imageUrl, category }) {
    return await prisma.product.create({ data: { name, description, price, imageUrl, category } })
  }

  static async update(id, data) {
    return await prisma.product.update({ where: { id: Number(id) }, data })
  }

  static async delete(id) {
    return await prisma.product.delete({ where: { id: Number(id) } })
  }
}
```

| Syntax | Meaning |
|--------|---------|
| `static async list()` | `static` = call it as `Product.list()` (no `new`). `async` = it does slow DB work, returns a Promise. |
| `await prisma.product.findMany()` | Translates to SQL `SELECT * FROM products`. `await` pauses until the DB replies. |
| `findUnique({ where: { id } })` | Fetch one row by unique field. Returns `null` if nothing matches → how we detect 404s. |
| `Number(id)` | **Critical.** URL params arrive as strings (`"1"`); the `id` column is `Int`. Convert or Prisma throws. |
| `{ name, description, ... }` | **Destructuring** — pulls those keys out of the passed object. |

### The 5 routes — `src/server.js`

```js
// GET /products — list (with optional ?category= and ?sort=)
app.get("/products", async (req, res) => {
  try {
    const { category, sort } = req.query
    const products = await Product.list({ category, sort })
    res.status(200).json(products)
  } catch (err) { res.status(500).json({ error: "Failed to fetch products" }) }
})

// GET /products/:id — one by id
app.get("/products/:id", async (req, res) => {
  try {
    const product = await Product.getById(req.params.id)
    if (!product) return res.status(404).json({ error: "Product not found" })
    res.status(200).json(product)
  } catch (err) { res.status(500).json({ error: "Failed to fetch product" }) }
})

// POST /products — create (with validation)
app.post("/products", async (req, res) => {
  try {
    const { name, description, price, imageUrl, category } = req.body
    if (!name || !description || price === undefined || !category) {
      return res.status(400).json({ error: "Missing required field(s): name, description, price, category" })
    }
    const product = await Product.create({ name, description, price, imageUrl, category })
    res.status(201).json(product)
  } catch (err) { res.status(500).json({ error: "Failed to create product" }) }
})

// PUT /products/:id — update;  DELETE /products/:id — remove
// both map Prisma error P2025 (record not found) → 404
```

| Concept | Meaning |
|---------|---------|
| `:id` | A **route parameter** placeholder. `/products/1` → `req.params.id === "1"`. |
| `req.query` | The `?key=value` part of the URL → `{ category, sort }`. |
| `req.body` | The JSON payload (parsed by `express.json()`). |
| `try / catch` | Run risky DB code; on any throw, return 500 instead of crashing the server. |
| `if (!product) return res.status(404)` | `findUnique` returns null when missing → clean 404. The `return` stops the handler early. |
| `err.code === "P2025"` | Prisma's "record to update/delete doesn't exist" code → we map it to 404. |

**Three places data rides into the server** (mixing these up is the #1 Express beginner bug):
`req.params` (the `/:id` path) · `req.query` (the `?...` filters) · `req.body` (the JSON payload).

---

## 3. Query Params — Filtering & Sorting (Milestone 2)

The genius move: **one function handles every combination** by building the query object dynamically.

```js
static async list({ category, sort } = {}) {
  const query = {}                                          // start empty
  if (category) query.where = { category }                  // add filter only if asked
  if (sort === "price" || sort === "name")                  // whitelist! only these two
    query.orderBy = { [sort]: "asc" }                       // [sort] = computed key
  return (await prisma.product.findMany(query)).map(withImageUrl)
}
```

| Syntax | Meaning |
|--------|---------|
| `const query = {}` then conditional adds | Build only the pieces requested. No params → empty query → returns all (backward compatible). |
| `query.where = { category }` | → SQL `WHERE category = 'Apparel'`. |
| `sort === "price" \|\| sort === "name"` | **Whitelist** — ignore any other sort value. Stops arbitrary field names reaching the query (a small security habit). |
| `{ [sort]: "asc" }` | **Computed property key** — `[sort]` uses the *value* of `sort` as the key. `sort="price"` → `{ price: "asc" }`. |

Endpoints supported: `?category=Apparel`, `?sort=price`, `?sort=name`, both combined, and an unknown
category returns an empty array `[]` with `200` (a successful empty result, not an error — standard REST).

**Why this matters:** instead of writing four near-identical functions (all / filter / sort / both), you
realize the query is *just a JavaScript object you assemble at runtime*. This is the foundation of every
search/filter feature you'll ever build.

---

## 4. The Order Model (Milestone 3)

```prisma
model Order {
  id         Int      @id @default(autoincrement()) @map("order_id")
  customer   Int      @map("customer_id")
  totalPrice Float    @map("total_price")
  status     String   @default("pending")
  createdAt  DateTime @default(now()) @map("created_at")
  orderItems OrderItem[]          // back-relation (M4)
  @@map("orders")
}
```

| New syntax | Meaning |
|-----------|---------|
| `status String @default("pending")` | If you create an order without a status, the DB fills in `"pending"`. → SQL `DEFAULT 'pending'`. |
| `createdAt DateTime @default(now())` | `DateTime` = timestamp type. `@default(now())` auto-stamps the current time on insert. → SQL `DEFAULT CURRENT_TIMESTAMP`. |

**Key idea — who owns each field?** Some columns are *your job* (`customer`, `totalPrice` — only you know
them); some are the *database's job* (`id`, `createdAt`, and `status` unless overridden). Letting the DB
own IDs and timestamps means they're always consistent and you can't forget them. `Order.create()` only
needs `customer` and `totalPrice` — status and timestamp fill themselves in.

The `Order` class mirrors `Product` exactly (5 CRUD methods). The routes mirror the product routes, with
two notable choices:

```js
// POST /orders validation — note === undefined, NOT !customer
if (customer === undefined || totalPrice === undefined) {
  return res.status(400).json({ error: "Missing required field(s): customer, totalPrice" })
}
```

**Why `=== undefined` and not `!`?** `customer`/`totalPrice` are numbers, and `0` is *falsy*. `!totalPrice`
would wrongly reject a legitimate `0` total. `=== undefined` only rejects *actually absent* fields. (For
product strings, `!name` was fine since an empty name is genuinely invalid.) This is a real
JavaScript-falsy-value gotcha.

The route param here is `:order_id` (per the API contract), so handlers read `req.params.order_id`.

---

## 5. Relationships & Cascade Delete (Milestone 4) ⭐ the structural heart

This is where `Product` and `Order` stop being islands and get connected by the `OrderItem` join table.

```prisma
model OrderItem {
  id        Int   @id @default(autoincrement()) @map("order_item_id")
  orderId   Int   @map("order_id")        // scalar FK column (just an integer)
  productId Int   @map("product_id")      // scalar FK column
  quantity  Int
  price     Float                          // snapshot: price AT TIME OF PURCHASE

  order   Order   @relation(fields: [orderId],   references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@map("order_items")
}
```

| Syntax | Meaning |
|--------|---------|
| `orderId Int` | The **scalar foreign key** — a literal integer column storing *which* order this belongs to. |
| `order Order @relation(...)` | The **relation field** — a "virtual" handle (no column of its own) that lets you write `orderItem.order` to fetch the parent. |
| `fields: [orderId]` | "The local column that stores the link is my `orderId`." |
| `references: [id]` | "It points at the `id` field on `Order`." |
| `onDelete: Cascade` | **"If my parent is deleted, delete me too."** |
| `orderItems OrderItem[]` (on Product/Order) | The **back-relation** — the other end. Prisma requires both ends declared. |

**The two confusions students hit (and the fix):**

1. **`orderId` vs `order` — why both?** `orderId` is the *real data* (a boring integer Postgres uses).
   `order` is a *lens* Prisma gives you in code to fetch the whole parent object — it adds no column.
   The `@relation(fields: [orderId], references: [id])` line is the wiring connecting the two.
2. **Direction.** Every relation has two ends. If `OrderItem` points to `Order`, then `Order` needs an
   `orderItems` field pointing back. Miss one → cryptic "missing opposite relation field" error.

The cascade `onDelete: Cascade` goes on the **child** (`OrderItem`) but describes what happens when the
**parent** is deleted. Reads backwards until it clicks: *"I will be deleted when my parent goes."*

### What the migration generated (the real foreign keys)

```sql
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE CASCADE ...;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ...;
```

The cascade is enforced by **Postgres itself**, not your JavaScript. Deleting a product *automatically*
removes its order items — proven in testing.

### Fetching nested data — `include`

```js
static async getById(id) {
  return await prisma.order.findUnique({
    where: { id: Number(id) },
    include: { orderItems: { include: { product: true } } },   // order → items → product
  })
}
```

`include` tells Prisma "also fetch related rows and nest them." By default Prisma returns *only* a row's own
columns (relations are opt-in for performance). The result is a 3-level tree: order → its items → each
item's product. That's how the response can show "2 × College Hoodie @ 29.99".

### Referential integrity in action

```js
// POST /orders/:order_id/items
} catch (err) {
  if (err.code === "P2003") {   // FK constraint failed
    return res.status(404).json({ error: "Referenced product does not exist" })
  }
}
```

You don't write "check if product exists" — Postgres's foreign-key constraint **refuses** an insert that
points at a nonexistent product, and Prisma surfaces it as `P2003`. It's *impossible* to create an orphan
order item, no matter what the app code does. That safety net is what relational databases are for.

---

## 6. The Transactional Order Endpoint (Milestone 5) ⭐ the hardest, most important code

`POST /orders` must create an order **and** all its items as **one atomic unit** — if anything fails,
nothing is saved.

```js
static async createWithItems({ customer, status, items }) {
  // 2. Look up every referenced product in ONE query
  const productIds = items.map((item) => Number(item.productId))
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } })

  // Validate BEFORE writing anything: every product must exist
  const priceById = new Map(products.map((p) => [p.id, p.price]))
  for (const item of items) {
    if (!priceById.has(Number(item.productId))) {
      const err = new Error(`Product with id ${item.productId} not found`)
      err.code = "PRODUCT_NOT_FOUND"
      throw err
    }
  }

  // 3. Compute total from DB prices — NEVER from the client
  let totalPrice = 0
  const itemsData = items.map((item) => {
    const unitPrice = priceById.get(Number(item.productId))
    totalPrice += unitPrice * item.quantity
    return { productId: Number(item.productId), quantity: item.quantity, price: unitPrice }
  })

  // 4. Create order + items ATOMICALLY
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({ data: { customer, status, totalPrice } })
    await tx.orderItem.createMany({
      data: itemsData.map((d) => ({ ...d, orderId: order.id })),
    })
    // 5. Return the finished order with items + products nested
    return tx.order.findUnique({
      where: { id: order.id },
      include: { orderItems: { include: { product: true } } },
    })
  })
}
```

| Syntax | Meaning |
|--------|---------|
| `items.map((i) => Number(i.productId))` | Turn `[{productId:1,...}]` into `[1, 4]` — just the IDs. |
| `findMany({ where: { id: { in: productIds } } })` | `{ in: [...] }` → SQL `WHERE id IN (1,4)`. **One** query fetches all referenced products. |
| `new Map(products.map(p => [p.id, p.price]))` | A fast id→price lookup table: `{1 → 29.99, 4 → 1.99}`. |
| `if (!priceById.has(...)) throw` | The validation gate — runs **before** the transaction, so a bad product means nothing is written. |
| `totalPrice += unitPrice * quantity` | Total computed from **DB prices**, never client input (security). |
| `prisma.$transaction(async (tx) => {...})` | **The heart.** Everything inside is one all-or-nothing unit. Use `tx.*` not `prisma.*`. |
| `tx.orderItem.createMany({...})` | Insert many rows at once. |

**Why a transaction?** Without it: create order → create item 1 (ok) → create item 2 (fails). Now you have
a **half-built order** — an order with one item and a wrong total, and the customer got charged. A
transaction treats multiple writes as indivisible: either *all* commit, or the first failure **rolls back
everything**. Mental model: a **pencil draft** — nothing is in ink until the whole block finishes; any error
erases the draft.

**Why compute prices server-side?** If the client sent prices, a malicious request could buy a laptop for
`price: 0.01`. The server is the **source of truth** for anything that matters. We look prices up from our
own DB and ignore whatever the client claims.

**Verified atomicity:** sending an order with a nonexistent product (id 9999) returned `404` and left
**zero** rows — no order, no items. The DB was exactly as before.

---

## 7. Connecting the Frontend (Milestone 6)

### CORS — `src/server.js`

```js
const cors = require("cors")
app.use(cors())
```

The browser **blocks** a page loaded from `localhost:5173` (the React app) from calling an API at
`localhost:3001` unless the API says it's allowed. `app.use(cors())` adds the
`Access-Control-Allow-Origin` header — the browser's permission slip. **CORS is enforced by the browser,
not the server** — which is exactly why every request worked in Postman (not a browser) but the frontend
needed this one line.

### Backward-compatible field alias — `src/models/product.js`

```js
function withImageUrl(product) {
  if (!product) return product
  return { ...product, image_url: product.imageUrl }   // expose BOTH keys
}
```

The frontend reads `product.image_url`; our model field is `imageUrl`. Rather than break either side, we
return **both** — the API stays backward-compatible and the frontend works untouched. `{ ...product, ... }`
is the spread operator: copy all existing fields, then add one more.

### The three frontend API calls — `student-store-ui`

```js
// App.jsx — fetch products once on mount
useEffect(() => {
  const fetchProducts = async () => {
    const response = await axios.get(`${API_BASE_URL}/products`)
    setProducts(response.data)
  }
  fetchProducts()
}, [])                                       // [] = run once

// App.jsx — checkout: transform cart → items, then POST
const handleOnCheckout = async () => {
  const items = Object.keys(cart).map((productId) => ({
    productId: Number(productId),
    quantity: cart[productId],
  }))
  const response = await axios.post(`${API_BASE_URL}/orders`, { customer: 1, items })
  setOrder(response.data)
  setCart({})
}

// ProductDetail.jsx — fetch one product when the URL id changes
useEffect(() => {
  const fetchProduct = async () => {
    const response = await axios.get(`http://localhost:3001/products/${productId}`)
    setProduct(response.data)
  }
  fetchProduct()
}, [productId])                              // re-run when productId changes
```

| Syntax | Meaning |
|--------|---------|
| `useEffect(() => {...}, [])` | React hook; runs code after render. `[]` = run **once** on mount (the place to fetch initial data). |
| `useEffect(() => {...}, [productId])` | Re-runs whenever `productId` changes (navigating product 1 → 2). |
| `axios.get(url)` / `axios.post(url, body)` | Send HTTP requests; `response.data` is the JSON body. |
| `Object.keys(cart).map(...)` | Cart is `{ "1": 2, "4": 1 }` → transform into the API's `items: [{productId, quantity}]` shape. |
| `customer: 1` | Placeholder integer (the `customer` column is `Int`; real accounts are out of scope). |

### A routing bug we fixed — `SubNavbar.jsx`

```js
const navigate = useNavigate()
const handleCategoryClick = (cat) => {
  setActiveCategory(cat)   // app state: which filter
  navigate("/")            // route state: send the user to the home grid
}
```

There are **two kinds of state** in a frontend: *route state* (which URL/page you're on, owned by React
Router) and *app state* (the `activeCategory` filter, owned by `useState`). The original navbar only changed
app state, so clicking a category while parked on a product detail page (`/2`) did nothing visible.
`useNavigate("/")` fixes the route side. Forgetting to update one of the two is an extremely common bug.

---

## 8. The Complete API Reference

| Method | Path | Purpose | Success | Errors |
|--------|------|---------|---------|--------|
| GET | `/products` | List all (optional `?category=`, `?sort=price\|name`) | 200 + array | 500 |
| GET | `/products/:id` | One product | 200 + product | 404 |
| POST | `/products` | Create product | 201 + product | 400 |
| PUT | `/products/:id` | Update product | 200 + product | 404 |
| DELETE | `/products/:id` | Delete product (cascades to its items) | 200 + product | 404 |
| GET | `/orders` | List all orders | 200 + array | 500 |
| GET | `/orders/:order_id` | One order **with nested items** | 200 + order | 404 |
| POST | `/orders` | **Transactional** create order + items | 201 + order | 400, 404 |
| PUT | `/orders/:order_id` | Update order (e.g. status) | 200 + order | 404 |
| DELETE | `/orders/:order_id` | Delete order (cascades to its items) | 200 + order | 404 |
| GET | `/order-items` | List all order items | 200 + array | 500 |
| POST | `/orders/:order_id/items` | Add one item to an order | 201 + item | 400, 404 |

**Consistent error shape across the whole API:** `{ "error": "message" }`.

---

## 9. Glossary — every term in one place

| Term | Plain meaning |
|------|---------------|
| **Express** | The web-server framework. Receives HTTP requests, routes them, sends responses. |
| **Prisma** | The ORM / translator between your JavaScript and SQL. |
| **PostgreSQL** | The actual database that stores the data and only speaks SQL. |
| **ORM** | Object-Relational Mapper — lets you use objects/methods instead of writing raw SQL. |
| **Migration** | A versioned SQL file that changes the database structure. "Apply" step of schema changes. |
| **Schema** | The text file (`schema.prisma`) describing your models. The "describe" step. |
| **CRUD** | Create, Read, Update, Delete — the four basic data operations. |
| **Route / endpoint** | A URL + HTTP verb your server responds to (e.g. `GET /products`). |
| **Middleware** | Code that runs on every request before your handlers (e.g. `express.json()`, `cors()`). |
| **Route param** | The `/:id` placeholder in a path → `req.params`. |
| **Query param** | The `?key=value` part of a URL → `req.query`. |
| **Request body** | The JSON payload sent with POST/PUT → `req.body`. |
| **Foreign key** | A column holding the id of a row in another table (the link). |
| **Cascade delete** | Auto-delete child rows when their parent is deleted. |
| **Transaction** | A group of DB writes that all succeed or all roll back (atomic). |
| **`$transaction`** | Prisma's API for running an atomic transaction. |
| **`include`** | Prisma option to fetch related rows and nest them in the result. |
| **Primary key** | The unique identifier column for a table (`id`). |
| **`@map` / `@@map`** | Prisma annotations mapping a field→column / model→table name. |
| **CORS** | Browser security that controls cross-origin requests; enabled with `cors()` middleware. |
| **async / await** | JS keywords for waiting on slow operations (like DB calls) without freezing. |
| **Promise** | An "IOU" for a value that arrives later; `await` waits for it. |
| **Status codes** | 200 OK · 201 Created · 400 Bad Request · 404 Not Found · 500 Server Error. |
| **Prisma `P2025`** | "Record to update/delete not found" → we map to 404. |
| **Prisma `P2003`** | "Foreign key constraint failed" → we map to 404. |

---

*Built across Milestones 0–6 · Node.js · Express · Prisma · PostgreSQL · React*
