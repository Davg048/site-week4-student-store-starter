# 🏪 Student Store — 5-Minute Demo Script

> Your speaking script + delivery coaching for the CodePath project demo.
> Matches the CodePath template: **Intro → Live demo → Code spotlight → Reflection**.
> Total target: **5:00**. Spoken pace ≈ 140 words/min — talk *with* the app, not at the slides.
>
> ⚠️ **This is a BACKEND project**, so your "wow" isn't a flashy UI — it's the **API, the database
> relationships, and the atomic transaction.** Your demo is split: the **browser** (it works end-to-end)
> *and* **Postman** (proving the API + atomicity directly). That Postman moment is what sets a backend
> demo apart — lean into it.

---

## ⏱️ Timing budget (5:00)

| # | Slide | Time | Running total |
|---|-------|------|---------------|
| 1 | Title / Intro | 0:40 | 0:40 |
| 2 | **Live Demo — browser + Postman** (the star) | 2:20 | 3:00 |
| 3 | Architecture (how it's built) | 0:35 | 3:35 |
| 4 | Code spotlight (the transaction) | 0:50 | 4:25 |
| 5 | Reflection (Favorite / Challenging / Next) | 0:35 | 5:00 |

> Running long? **Cut slide 3 (Architecture)** — the demo, the transaction code slide, and the reflection
> are what matter.

---

## ✅ Pre-flight checklist (do this BEFORE you present)

Live backend demos break in specific ways. Five minutes goes fast.

- [ ] **Backend running:** `cd student-store-api && node ./src/server.js` → see `🚀 Server is running`.
- [ ] **Frontend running** (second terminal): `cd student-store-ui && npm run dev` → browser opens `:5173`.
- [ ] **Database has products** — load `localhost:5173` once and confirm the 9 products show with prices.
- [ ] **Postman ready** with 2 saved requests: a **good** `POST /orders` and a **bad** one (productId 9999). Pre-type them so you don't fumble JSON live.
- [ ] **Clear old test orders** so your `GET /orders` is clean: in a terminal,
      `node -e 'const p=require("./src/db/db");p.order.deleteMany().then(()=>p.$disconnect())'`
- [ ] **Zoom browser + Postman to ~110–125%** so it's readable on a projector.
- [ ] **Backup:** screenshots or a screen recording of the full flow working, in case WiFi/DB dies.
- [ ] **Fill in the blanks** on the slides: your name + pronouns.

### 🛟 If something breaks live
- **Products don't load?** → "The browser blocks cross-origin calls by default — I handle that with CORS
  middleware; let me confirm the backend's up." (Restart Terminal 1.) Don't panic — narrate it.
- **An order errors?** → Pivot to Postman and show the API directly. The API *is* the project; the UI is the wrapper.
- Keep a backup screen recording. A failed live demo with a calm narration still scores well.

---

## 🖥️ SLIDE 1 — Title / Intro  *(0:40)*

**On the slide:** `🏪 Student Store API` · "by [Your Name] ([pronouns])" · one-liner · the stack badges · a screenshot of the running store.

**Say this (≈90 words):**
> "Hi, I'm [name]. My project is the **Student Store** — but the twist is, I built the **backend** from
> scratch. The frontend was provided; my job was the engine behind it: a REST API, a Postgres database with
> three related tables, and the order-processing logic. It's **Node and Express** for the API, **Prisma** to
> talk to **PostgreSQL**, and I connected it all to a **React** storefront. The part I'm proudest of is the
> checkout — placing an order is a single **atomic transaction** across multiple tables. Let me show you."

**Delivery:** Lead with "I built the *backend*" — that frames everything. Then switch to the browser.

---

## 🖥️ SLIDE 2 — LIVE DEMO  *(2:20)*  ⭐ the main event

**On the slide:** the word "Demo" + a fallback screenshot. The content is what you *do*.

### Part A — The browser (≈1:00): "it works end-to-end"
1. **Land on the store** *(15s)* — "Here are the products — these are coming live from my Postgres database
   through my `GET /products` endpoint. Each one was fetched when the page loaded."
2. **Open a product** *(15s)* — Click one. "Clicking a product navigates to its detail page, which fires a
   second call — `GET /products/:id` — to fetch just that one."
3. **Add to cart + checkout** *(30s)* — Add 2–3 items, open the sidebar, click **Submit**. "When I check out,
   the frontend bundles my cart and sends one `POST /orders`. The order just saved to the database — and
   crucially, the **server** calculated the total, not the browser."

### Part B — Postman (≈1:20): "here's the API itself" ⭐ the backend money-shot
4. **GET /orders** *(15s)* — "Let me prove that saved." Send `GET localhost:3001/orders`. "There's the order
   I just placed from the UI."
5. **The transaction success** *(25s)* — Send the good `POST /orders` (customer + items, **no prices**).
   "Watch — I send *which* products and *how many*, but no prices. The server looks up real prices, computes
   the total, and creates the order **and** all its line items together. Notice the response nests the items
   inside the order."
6. **The atomicity proof** *(40s)* — ⭐ **this is your standout moment.** Send the bad `POST /orders` (one
   real item + productId 9999). "Now I'll send an order where one item points to a product that doesn't
   exist. It returns a **404** — and here's the important part —" *(send `GET /orders` again)* "— **no
   partial order was created.** The whole thing rolled back. That's a database transaction: all-or-nothing.
   Without it, I'd have a half-charged customer with a broken order."

**Delivery for the demo:**
- **Talk while you click.** Narrate the *why*.
- **Go slow on step 6** — the atomicity proof is the single best thing in a backend demo. Let it land.
- If the UI lags, jump to Postman early — the API is the real deliverable.

---

## 🖥️ SLIDE 3 — Architecture  *(0:35, optional)*

**On the slide (a simple layered diagram):**
`React UI → Express routes → Model classes → Prisma → PostgreSQL`
- **3 related tables:** Products, Orders, OrderItems (a join table with two foreign keys)
- **Cascade deletes:** delete a product or order → its order items auto-delete
- **Spec-first:** wrote `planning.md` (models, API contract, transaction flow) before any code

**Say this (≈90 words):**
> "Quickly, the architecture: requests flow through layers — Express routes handle HTTP and status codes,
> model classes hold the database logic, and Prisma translates that into SQL for Postgres. The data model is
> three related tables — Products, Orders, and an OrderItems join table that links them with foreign keys. I
> set up cascade deletes, so removing a product or an order automatically cleans up its line items — the
> database enforces that, not my code. And I wrote the whole spec *first*, in a planning doc, before writing
> a single route. The code just had to match the plan."

**Delivery:** Your "I think like an engineer" slide. If short on time, skip it and fold one line into the reflection.

---

## 🖥️ SLIDE 4 — Code Spotlight: the transaction  *(0:50)*  ⭐ shows you understand your own code

**On the slide:** the `$transaction` block (trimmed to ~8 lines) + a "Why it matters" panel.

```js
return await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: { customer, status, totalPrice } })
  await tx.orderItem.createMany({
    data: itemsData.map((d) => ({ ...d, orderId: order.id })),
  })
  return tx.order.findUnique({
    where: { id: order.id },
    include: { orderItems: { include: { product: true } } },
  })
})
```

**Say this (≈110 words):**
> "Here's the heart of the project — order creation. The problem: an order isn't one write, it's *several* —
> the order row, plus a row for every item. If I did them one at a time and the third item failed, I'd have a
> half-created order in the database — a customer charged for a broken order. So I wrap all the writes in
> Prisma's **`$transaction`**. Everything inside uses this `tx` client, and it's all-or-nothing: if *any*
> write throws, the entire thing **rolls back** — zero rows left behind. I also compute the total from
> **database prices**, never the client's — so nobody can send `price: one cent` and buy a laptop. That's the
> difference between code that works and code that's safe."

**⚠️ Be ready for follow-ups:**
- *"What if two items reference the same product?"* → Fine — each is its own order-item row with its own quantity.
- *"Why look prices up server-side?"* → Never trust the client for anything that matters (security). The DB is the source of truth.
- *"What does `tx` do that `prisma` doesn't?"* → `tx` is the transactional client; its writes are provisional until the block finishes, so they can be rolled back together.

**Delivery:** Point at `$transaction` when you say "all-or-nothing." 30 slow seconds beats 15 fast ones here.

---

## 🖥️ SLIDE 5 — Reflection  *(0:35)*

Three boxes: **Favorite** (blue) · **Most Challenging** (green) · **Next Steps** (yellow).

| Box | Content |
|-----|---------|
| **⭐ Favorite** | The **atomic `POST /orders` transaction.** It's the one place all three tables come together, and making it bulletproof — roll back on failure, compute prices server-side — taught me the most about real backend safety. |
| **🧗 Most Challenging** | **Relationships & cascade deletes.** Wrapping my head around foreign keys — the difference between the `orderId` column and the `order` relation field, and that every relation needs *both* ends declared — was the hardest concept. Once it clicked, the cascade "just worked." |
| **🚀 Next Steps** | **Deploy to Render** for a live URL · add a **Past Orders page** + **filter orders by email** (stretch) · add real **customer accounts** so `customer` isn't a placeholder. |

**Say this (≈95 words):**
> "To wrap up — my **favorite** part is the order transaction; it's where everything connects and where I
> learned what 'safe' backend code really means. The **most challenging** was relationships and cascade
> deletes — foreign keys genuinely confused me at first, especially that an order item stores both a raw
> `orderId` column *and* a relation field, and that Prisma needs both ends of every relationship. Once it
> clicked, deleting a product cleanly removing its order items felt like magic. **Next**, I'd deploy it for a
> live link, build a past-orders page, and add real customer accounts. Thanks — happy to take questions!"

**Delivery:** End on "Next Steps" energy. Land the last line, make eye contact, stop talking.

---

## 🎤 General delivery tips

- **Practice with a timer 2–3 times.** The first run is always 90 seconds long.
- **Lead with the problem** (a half-created order), then show the solution (the transaction). People remember problems.
- **The Postman atomicity demo is your differentiator.** Most demos show happy paths; you show a *failure
  that's handled correctly.* That's senior-level instinct — milk it.
- **Don't read slides.** They're billboards for the audience; your voice tells the story.
- **Name-drop the hard parts** (atomic transaction, cascade delete, server-side pricing, CORS) — signals depth.
- **If you blank:** look at Postman and describe the request/response on screen. The demo is your teleprompter.
- **Breathe. Slow down 10%.** Five minutes is plenty.
```
