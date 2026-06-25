# Student Store — System Spec (planning.md)

This document is the **source of truth** for the Student Store backend. It is written
*before* implementation. Every later milestone references the section below that matches it.

**Tech stack:** Node.js + Express (API layer), Prisma ORM (data-access layer), PostgreSQL (database).

> **Naming note (read once):** The Prisma *model* field names below are camelCase
> (`imageUrl`, `totalPrice`, `createdAt`) because that is the JavaScript convention and
> because the committed `seed.js` already uses those exact names. The underlying *database
> columns/tables* are snake_case (`image_url`, `order_items`) to match the project's required
> attribute names. We bridge the two with Prisma's `@map` (column) and `@@map` (table)
> annotations. So: code says `product.imageUrl`, the DB column is `image_url`.

---

## Section 1: Data Models

Three models: `Product`, `Order`, `OrderItem`. `OrderItem` is the **join model** that sits
between an order and the products it contains.

### Product  → table `products`

| Field        | Prisma type | DB column     | Required? | Default            | Notes                                  |
|--------------|-------------|---------------|-----------|--------------------|----------------------------------------|
| id           | Int         | id            | yes (PK)  | autoincrement      | Primary key, auto-generated            |
| name         | String      | name          | yes       | —                  | Product display name                   |
| description  | String      | description   | yes       | —                  | Long-form description                  |
| price        | Float       | price         | yes       | —                  | Unit price in dollars                  |
| imageUrl     | String?     | image_url     | optional  | —                  | Image link; optional (display only)    |
| category     | String      | category      | yes       | —                  | Used by the Milestone 2 category filter|

- **Primary key:** `id`, auto-increments.
- **Relationships:** one Product has many OrderItems (`orderItems OrderItem[]`).
- **Cascade behavior:** Deleting a Product **deletes every OrderItem that references it**
  (cascade enforced on the `OrderItem.product` relation, not here).

### Order  → table `orders`

| Field       | Prisma type | DB column   | Required? | Default          | Notes                                       |
|-------------|-------------|-------------|-----------|------------------|---------------------------------------------|
| id          | Int         | order_id    | yes (PK)  | autoincrement    | Primary key, auto-generated                 |
| customer    | Int         | customer_id | yes       | —                | Customer identifier (matches seed.js)       |
| email       | String?     | email       | optional  | —                | Email of the person who placed the order (stretch: filter by email) |
| totalPrice  | Float       | total_price | yes       | —                | Computed server-side at order creation      |
| status      | String      | status      | yes       | `"pending"`      | e.g. "pending", "completed"                 |
| createdAt   | DateTime    | created_at  | yes       | `now()`          | Auto-stamped when the row is created        |

- **Primary key:** `id` (column `order_id`), auto-increments.
- **Relationships:** one Order has many OrderItems (`orderItems OrderItem[]`).
- **Cascade behavior:** Deleting an Order **deletes every OrderItem that references it**.

### OrderItem  → table `order_items`

| Field      | Prisma type | DB column     | Required? | Default       | Notes                                          |
|------------|-------------|---------------|-----------|---------------|------------------------------------------------|
| id         | Int         | order_item_id | yes (PK)  | autoincrement | Primary key, auto-generated                    |
| orderId    | Int         | order_id      | yes (FK)  | —             | Foreign key → orders.order_id                  |
| productId  | Int         | product_id    | yes (FK)  | —             | Foreign key → products.id                      |
| quantity   | Int         | quantity      | yes       | —             | How many of this product in the order          |
| price      | Float       | price         | yes       | —             | Unit price **captured at purchase time**       |

- **Primary key:** `id` (column `order_item_id`), auto-increments.
- **Relationships:** belongs to one Order (`order`) and one Product (`product`).
- **`price` is snapshotted:** we store the price *at time of purchase* so that later editing a
  Product's price does not silently rewrite the cost of past orders.

### Cascade Rules (the most important part of this section)

Plain language — what happens when a *parent* row is deleted:

1. **Delete a Product** → every `OrderItem` whose `productId` points at that product is also
   deleted. (Without this, order items would point at a product that no longer exists.)
2. **Delete an Order** → every `OrderItem` whose `orderId` points at that order is also deleted.
   (An order item has no meaning without its parent order.)

Both are implemented in Prisma with `onDelete: Cascade` on the two `@relation` lines inside
`OrderItem`. The dependency chain: `Product → OrderItem ← Order`. `OrderItem` is the child in
*both* relationships, which is why it carries both foreign keys and both cascade rules.

---

## Section 2: API Contract

**Global error response shape (used by every endpoint):**

```json
{ "error": "Human-readable message describing what went wrong" }
```

General conventions:
- Success bodies return the resource(s) as JSON.
- `404` when a requested resource ID does not exist.
- `400` when the request body is missing required fields or is otherwise invalid.
- `500` for unexpected server/database errors.

### Product Endpoints

| Method | Path            | Purpose                          |
|--------|-----------------|----------------------------------|
| GET    | /products       | List all products                |
| GET    | /products/:id   | Get one product by ID            |
| POST   | /products       | Create a new product             |
| PUT    | /products/:id   | Update an existing product       |
| DELETE | /products/:id   | Delete a product                 |

**GET /products**
- Request: no body.
- Query Parameters (all optional):
  - `category` — return only products in that category, e.g. `?category=Apparel`.
  - `sort` — order results. `?sort=price` (low → high) or `?sort=name` (A → Z).
  - Default (no params): return all products, unordered.
  - Params can combine: `?category=Snacks&sort=price`.
  - An unknown category simply returns an empty array `[]` (not an error).
- Success: `200` → `[ {Product}, {Product}, ... ]`
- Error: `500` → `{ "error": "..." }`

**GET /products/:id**
- Request: route param `id` (integer).
- Success: `200` → `{Product}`
- Error: `404` → `{ "error": "Product not found" }`

**POST /products**
- Request body:
  ```json
  { "name": "Sticker Pack", "description": "Vinyl stickers", "price": 4.99,
    "imageUrl": "https://...", "category": "Accessories" }
  ```
- Success: `201` → `{Product}` (the created product, including its new `id`)
- Error: `400` → `{ "error": "Missing required field: name" }`

**PUT /products/:id**
- Request: route param `id` + a body with any updatable fields (same shape as POST).
- Success: `200` → `{Product}` (the updated product)
- Error: `404` → `{ "error": "Product not found" }`

**DELETE /products/:id**
- Request: route param `id`.
- Success: `200` → `{ "message": "Product deleted", "product": {Product} }`
  (deletes associated OrderItems via cascade)
- Error: `404` → `{ "error": "Product not found" }`

### Order Endpoints

| Method | Path                | Purpose                                       |
|--------|---------------------|-----------------------------------------------|
| GET    | /orders             | List all orders                               |
| GET    | /orders/:order_id   | Get one order **including its order items**   |
| POST   | /orders             | Create an order + its items (transactional)   |
| PUT    | /orders/:order_id   | Update an order (e.g. change status)          |
| DELETE | /orders/:order_id   | Delete an order (cascades to its items)       |

**GET /orders**
- Query Parameters (optional):
  - `email` — return only orders placed with that email, e.g. `?email=sam@school.edu`.
    Default (no param): return all orders. An email with no matching orders returns `[]`.
- Success: `200` → `[ {Order}, ... ]`
- Error: `500` → `{ "error": "..." }`

**GET /orders/:order_id**
- Request: route param `order_id`.
- Success: `200` → `{ ...Order, "orderItems": [ {OrderItem}, ... ] }`
- Error: `404` → `{ "error": "Order not found" }`

**POST /orders** — see Section 3 for the full transactional flow.
- Request body:
  ```json
  {
    "customer": 101,
    "email": "sam@school.edu",
    "status": "pending",
    "items": [
      { "productId": 1, "quantity": 2 },
      { "productId": 4, "quantity": 1 }
    ]
  }
  ```
- Success: `201` → the created order with `totalPrice` computed and `orderItems` included.
- Errors:
  - `400` → `{ "error": "Order must include at least one item" }`
  - `404` → `{ "error": "Product with id 999 not found" }` (an item references a missing product)

**PUT /orders/:order_id**
- Request: route param `order_id` + body, typically `{ "status": "completed" }`.
- Success: `200` → `{Order}` (the updated order)
- Error: `404` → `{ "error": "Order not found" }`

**DELETE /orders/:order_id**
- Request: route param `order_id`.
- Success: `200` → `{ "message": "Order deleted", "order": {Order} }` (cascades to items)
- Error: `404` → `{ "error": "Order not found" }`

---

## Section 3: Transactional Flow — POST /orders

`POST /orders` is the most important endpoint in the project. It must create an order **and**
all of its items as one atomic unit: if any step fails, nothing is saved.

**Request body shape**
```json
{
  "customer": 101,
  "status": "pending",
  "items": [
    { "productId": 1, "quantity": 2 },
    { "productId": 4, "quantity": 1 }
  ]
}
```
Note: the client sends *which* products and *how many*, but NOT the prices or the total.
The server is the source of truth for price — it looks each price up from the `products` table.

**Step-by-step at the data layer**
1. **Validate** the body: `items` exists and is a non-empty array → else `400`.
2. **Look up every product** referenced in `items` (one `prisma.product.findMany` with the list
   of `productId`s). If any requested `productId` is missing from the result → `404`,
   `{ "error": "Product with id X not found" }`, and **stop before writing anything**.
3. **Compute line prices and total**: for each item, `linePrice = product.price * quantity`;
   `totalPrice = sum(linePrice)`. Prices come from the DB, never from the client.
4. **Open a transaction** (`prisma.$transaction`). Inside it:
   a. Create the `Order` row with `customer`, `status`, computed `totalPrice`.
   b. Create each `OrderItem` row, linking it to the new order's `id`, storing `productId`,
      `quantity`, and the snapshotted unit `price`.
   (With Prisma we can do a–b in a single nested-create `prisma.order.create({ data: { ...,
   orderItems: { create: [...] } } })`, which Prisma runs atomically on its own.)
5. **Return** `201` with the created order, `orderItems` included.

**Atomicity guarantee:** if creating any order item throws, the whole transaction rolls back —
no order row, no partial items. The DB ends up exactly as it was before the request.

**What if an item references a nonexistent product?** We catch it in step 2 *before* the
transaction opens, so we return `404` and never create a half-built order.

---

## Decisions Log

_(Filled in as milestones are completed — schema translation notes, route behavior changes, etc.)_

### Decisions Log — Product Model (Milestone 1)

- **Schema translation that went smoothly**: `price` as `Float` mapped cleanly to Postgres
  `DOUBLE PRECISION`, and `id Int @id @default(autoincrement())` became `SERIAL PRIMARY KEY` —
  no manual ID handling needed. The `@map("image_url")` / `@@map("products")` annotations let
  the camelCase code coexist with the rubric's required snake_case columns exactly as planned.

- **Field decision made during implementation that wasn't in the spec**: kept `imageUrl`
  optional (`String?`) so a product can be created without an image. POST validation therefore
  checks `name`, `description`, `price`, and `category` but intentionally **not** `imageUrl`.

- **Route behavior that needed handling beyond the spec**: PUT/DELETE on a nonexistent id throws
  Prisma error code `P2025`. The spec said "return 404," but didn't say how to detect it — so
  the handlers catch `err.code === "P2025"` and translate it into the documented 404 response.

- **Tooling note**: had to pin the Prisma CLI to `^6.7.0` (`npm i -D prisma@^6.7.0`) because
  `npx prisma` auto-fetched Prisma 7, which rejects the v6-style `datasource { url = ... }`.
  The CLI must match `@prisma/client@^6`.

### Decisions Log — Query Params (Milestone 2)

- **One `list()` handles every combination**: instead of separate functions, `Product.list()`
  builds a Prisma query object dynamically — adding `where`/`orderBy` only when the param is
  present. No params → empty query → returns all (backward compatible).
- **Sort fields are whitelisted**: only `price` and `name` are honored; any other `sort` value
  is ignored. Prevents arbitrary field names from reaching the query.

### Decisions Log — Order Model (Milestone 3)

- **DB owns defaults**: `status` and `createdAt` are not required on create — the schema
  defaults (`@default("pending")` and `@default(now())`) fill them in. `Order.create()` only
  needs `customer` and `totalPrice`.
- **Validation uses `=== undefined`, not `!`**: `customer`/`totalPrice` are numbers, and `0` is
  falsy. `!totalPrice` would wrongly reject a `0` total, so presence is checked with
  `=== undefined` instead.
- **Route param is `:order_id`** (per the API contract), so handlers read `req.params.order_id`.

### Decisions Log — Order Creation Transaction (Milestone 5)

- **What the Transactional Flow spec got right**: the step order (validate → look up products →
  compute total → write inside a transaction) translated almost directly into code. Pre-checking
  products *before* opening the transaction kept the error path clean.
- **What the spec refined during implementation**: the spec said "look up products" but not how to
  detect a missing one. Implemented as a `Map` of id→price plus a presence check that throws a
  typed `PRODUCT_NOT_FOUND` error, which the route maps to 404. Items are inserted with `createMany`
  rather than one-by-one. Prices/total are computed from DB prices, never the client.
- **How the transaction error handling works**: everything inside
  `prisma.$transaction(async (tx) => {...})` uses the `tx` client; if any write throws, Prisma
  rolls back every write in the block, so a failure leaves zero rows. The nonexistent-product case
  is caught *before* the transaction opens, so no order is ever started.
- **One thing I'd design differently**: also re-validate product existence inside the transaction
  (belt-and-suspenders) to guard the race where a product is deleted between the lookup and the
  write. For this project scope the pre-check is sufficient.

## Spec Reconciliation

### Spec Reconciliation — Milestone 4 (Schema Audit)

#### Schema vs. spec gaps found
- No gaps found — the `OrderItem` schema matched the spec exactly: PK `id`→`order_item_id`,
  FK `orderId`→`order_id`, FK `productId`→`product_id`, plus `quantity` and snapshot `price`.
- Both relations declared with reciprocal back-relations (`Product.orderItems`,
  `Order.orderItems`), as Prisma requires. `npx prisma validate` confirmed the schema is valid
  before migrating.

#### Cascade delete verification
- Deleting a Product removes associated OrderItems: ✅ tested (script + via API)
- Deleting an Order removes associated OrderItems: ✅ tested (script + via DELETE /orders/:id)
- Confirmed deleting a Product does NOT delete the Order itself — only the join rows.

#### Notes
- `Order.getById` now uses `include` to eager-load `orderItems` and each item's `product`,
  returning a nested order → items → product shape.
- Added two endpoints to reach order items (also satisfy stretch "Added Endpoints"):
  `GET /order-items` and `POST /orders/:order_id/items` (validates parent order exists;
  maps Prisma `P2003` FK violation to 404 for a nonexistent product).

_(Full-system audit in Milestone 6.)_

### Frontend Requirements Audit — Milestone 6

The provided frontend ships as a skeleton: `axios` is imported but the three API calls are
unimplemented. Audit of every needed call vs. the API contract:

| Need | File | Endpoint | Status in starter |
|------|------|----------|-------------------|
| Load all products | `App.jsx` | `GET /products` | missing (no useEffect) |
| Load one product | `ProductDetail.jsx` | `GET /products/:id` | missing (no useEffect) |
| Place order | `App.jsx` `handleOnCheckout` | `POST /orders` | empty function |

Mismatches found and resolutions:
- **image field**: frontend reads `product.image_url` (`ProductCard.jsx`, `ProductDetail.jsx`);
  API returns `imageUrl`. **Resolution: API returns BOTH** `imageUrl` and `image_url` (add
  `image_url` to product responses) so the frontend works untouched and the API stays
  backward-compatible.
- **API base URL**: not configured in the frontend. **Resolution:** add a constant pointing at
  `http://localhost:3001`.
- **checkout body**: cart is `{ productId: quantity }`; API wants
  `{ customer, items: [{ productId, quantity }] }`. **Resolution:** transform cart → items in
  `handleOnCheckout`.
- **customer type**: form collects name/email (strings); `customer` column is `Int`.
  **Resolution (project scope):** send a hardcoded placeholder integer (e.g. `1`) on checkout.
  Real customer accounts are out of scope.
- **CORS**: browser (`:5173`) → API (`:3001`) is cross-origin. **Resolution:** enable `cors`
  middleware in `server.js`.

## Final Spec Reconciliation: Project Complete

### Full-system audit result
- All 12 endpoints match the API contract (5 product, 5 order, 2 order-item).
- `POST /orders` creates an order + items atomically; verified a bad `productId` returns 404
  with no partial order written.
- Found: spec didn't document CORS — added `app.use(cors())` and noted it here.

### Gaps resolved during frontend integration
- Frontend read `product.image_url`; API returned `imageUrl` → API now returns BOTH keys.
- Frontend had no implemented API calls → wired `GET /products`, `GET /products/:id`,
  and `POST /orders` (cart → items transform, placeholder integer `customer`).
- `SubNavbar` category buttons changed filter state but not the route → added
  `useNavigate("/")` so selecting a category returns to the product grid.

### What the spec enabled during this project
- Writing the data model, API contract, and transaction flow up front meant each milestone was
  "translate the plan into code" rather than "design while coding." The transaction flow in
  particular was implemented almost directly from the Section 3 spec.

## Stretch Features

### Filter Orders by email + Past Orders page
- Added optional `email String?` to the Order model (migration `add_order_email`).
- `GET /orders?email=...` filters via a conditional `where` (same dynamic-query pattern as the
  product category filter); no email → all orders; unknown email → `[]`.
- Checkout (`POST /orders`) now forwards `email` from the cart form.
- Frontend: new `PastOrders` page (list with email filter input + "No orders found" empty state)
  and `OrderDetail` page (line items, quantities, costs, total). Routes for `/orders` and
  `/orders/:orderId` are declared BEFORE the `/:productId` catch-all so they aren't swallowed.
  Reached via a "Past Orders" link in the SubNavbar.

### UI polish
- Introduced a design system in `globals.css` (modern color palette, radius/shadow/transition
  tokens, shared `.btn`/`.card`/`.pill` primitives) and restyled every component CSS against it
  for a cohesive, modern e-commerce look. Existing CSS variable names were kept so nothing broke.
