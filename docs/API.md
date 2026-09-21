# ChatFlow AI - REST API Documentation

Base URL: `http://localhost:5000/api`

---

## 1. Authentication

### `POST /api/auth/register`
Create a new store organization and business owner account.

**Request Body:**
```json
{
  "businessName": "StyleHub Fashion",
  "ownerName": "Priya Sharma",
  "email": "owner@stylehub.com",
  "phone": "+919876543210",
  "password": "Password@123",
  "confirmPassword": "Password@123"
}
```

### `POST /api/auth/login`
Authenticate and obtain JWT access and refresh tokens.

**Request Body:**
```json
{
  "email": "owner@stylehub.com",
  "password": "Password@123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "name": "Priya Sharma", "email": "...", "role": "BUSINESS_OWNER" },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

---

## 2. WhatsApp Webhooks & Simulator

### `GET /api/webhooks/whatsapp`
Meta verification handshake endpoint using `hub.mode`, `hub.verify_token`, and `hub.challenge`.

### `POST /api/webhooks/whatsapp`
Receives live incoming webhook payloads from Meta WhatsApp Cloud API (Graph API v21.0).

### `POST /api/webhooks/simulate`
Simulates incoming WhatsApp message locally without live Meta webhook tunnel requirements.

**Request Body:**
```json
{
  "organizationId": "org_id_here",
  "phone": "+919876543210",
  "name": "Rahul Verma",
  "text": "Show me black shirts under 1500"
}
```

---

## 3. Product Catalog

### `GET /api/products`
List catalog products with pagination, search, category, and price filters.

**Headers:**
`Authorization: Bearer <token>`
`x-organization-id: <orgId>`

**Query Parameters:**
- `search`: Filter by name, SKU, or tags
- `categoryId`: Filter by category ID
- `stockStatus`: `IN_STOCK` | `LOW_STOCK` | `OUT_OF_STOCK`
- `minPrice`, `maxPrice`: Numeric bounds

### `POST /api/products`
Create a new catalog item.

```json
{
  "name": "Royal Oxford Slim Fit Black Shirt",
  "sku": "SH-MS-001",
  "price": 1499,
  "discountPrice": 1199,
  "categoryId": "cat_id",
  "color": "black",
  "size": "M",
  "stock": 35,
  "images": ["https://images.unsplash.com/..."],
  "tags": ["shirt", "black", "cotton"]
}
```

---

## 4. Leads & Kanban Pipeline

### `GET /api/leads/kanban`
Returns leads grouped across all pipeline stages with aggregate count and monetary totals:
- `NEW`
- `CONTACTED`
- `INTERESTED`
- `FOLLOW_UP`
- `NEGOTIATION`
- `CONVERTED`
- `LOST`

### `PUT /api/leads/:id/status`
Update lead pipeline status and record status transition event.

```json
{
  "status": "CONVERTED",
  "note": "Customer completed payment via WhatsApp UPI."
}
```

---

## 5. WhatsApp Inbox & Messaging

### `GET /api/conversations`
List active conversations with unread badges, lead stage pills, and last interaction timestamps.

### `POST /api/messages/send`
Send manual reply or interactive product cards to WhatsApp customer.

```json
{
  "conversationId": "conv_id",
  "content": "Here is the item you requested!",
  "productId": "prod_id"
}
```

---

## 6. AI Engine Sandbox

### `POST /api/ai/test-search`
Test natural language product extraction against PostgreSQL/SQLite database.

```json
{
  "query": "Show me black shirts under 1500"
}
```

### `POST /api/ai/test-faq`
Query business settings to formulate policy answers.

```json
{
  "question": "What is your return and exchange policy?"
}
```
