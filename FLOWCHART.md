# A-Commerce Flowchart (Complete System Architecture)

---

## 1. System Overview

```mermaid
graph TB
    subgraph Frontend["Frontend (React + Vite 7 + TypeScript)"]
        Pages[Pages]
        Components[Components]
        Stores["Zustand Stores"]
        Services["API Services (Axios)"]
    end

    subgraph Backend["Backend (FastAPI + Python)"]
        Routers[API Routers]
        BServices["Business Services"]
        Middleware["Auth Middleware"]
        DB["Database Module"]
    end

    subgraph External["External Services"]
        Typhoon["Typhoon LLM (Thai AI)"]
        Gemini["Gemini API (Embeddings)"]
        Omise["Omise (PromptPay)"]
        SMS["SMS Gateway (OTP)"]
        Supabase["Supabase Storage"]
    end

    subgraph Database["PostgreSQL + pgvector"]
        Tables["Tables (users, products, orders, cart, chat, etc.)"]
    end

    Pages --> Components
    Components --> Stores
    Stores --> Services
    Services -->|HTTP REST API| Routers
    Routers --> Middleware
    Routers --> BServices
    BServices --> DB
    DB --> Tables
    BServices --> Typhoon
    BServices --> Gemini
    BServices --> Omise
    BServices --> SMS
    Routers --> Supabase
```

---

## 2. Frontend Routes & Page Flow

```mermaid
graph LR
    subgraph Customer["Customer Pages"]
        Home["/ (HomePage)\nProduct Catalog"]
        Auth["/auth (AuthPage)\nOTP Login/Register"]
        Checkout["/checkout\nAddress + Payment"]
        Orders["/orders\nOrder History"]
        OrderDetail["/orders/:id\nOrder Detail"]
        OrderPayment["/orders/:id/payment\nPayment QR"]
        Profile["/profile\nUser Profile"]
    end

    subgraph Admin["Admin Pages (/admin/*)"]
        Dashboard["/admin\nDashboard Stats"]
        Members["/admin/members\nUser Management"]
        AdminProducts["/admin/products\nProduct CRUD"]
        AdminOrders["/admin/orders\nAll Orders"]
        AdminOrderDetail["/admin/orders/:id\nOrder Fulfillment"]
        Chatbot["/admin/chatbot\nAI Prompt Config"]
        Reports["/admin/reports\nSales Analytics"]
    end

    Home -->|"Login"| Auth
    Home -->|"Cart Icon"| CartDrawer["CartDrawer (Slide-out)"]
    Home -->|"Chat Icon"| ChatPopup["ChatPopup (Floating)"]
    CartDrawer -->|"Checkout"| Checkout
    Checkout -->|"Order Created"| OrderDetail
    Auth -->|"Success"| Home
    Home -->|"Profile Icon"| Profile
    Home -->|"Orders Icon"| Orders
    Orders --> OrderDetail
    OrderDetail --> OrderPayment
```

---

## 3. Authentication Flow (OTP-based)

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend (AuthPage)
    participant API as Backend (/api/auth)
    participant DB as Database
    participant SMS as SMS Gateway

    U->>FE: Enter phone number
    FE->>API: POST /check-phone {phone}
    API->>DB: SELECT FROM users WHERE phone = ?
    DB-->>API: exists / not exists
    API-->>FE: {exists, masked_name?}

    FE->>API: POST /request-otp {phone, purpose}
    API->>DB: Check rate limit (3 per 10min)
    API->>DB: INSERT INTO otp_requests
    alt DEMO_MODE = true
        API-->>FE: OTP = "123456" (skip SMS)
    else Production
        API->>SMS: Send OTP via SMS
        SMS-->>U: SMS with 6-digit code
    end

    U->>FE: Enter OTP code
    FE->>API: POST /verify-otp {phone, otp_code, purpose}
    API->>DB: Validate OTP (not expired, not used, attempts < 5)

    alt New User (register)
        API->>DB: INSERT INTO users
    else Existing User (login)
        API->>DB: UPDATE users SET last_login_at
    end

    API->>DB: Generate access_token (JWT, 60min)
    API->>DB: Generate refresh_token (JWT, 30days)
    API->>DB: INSERT INTO refresh_tokens (hashed)
    API-->>FE: {access_token, refresh_token, user}

    FE->>FE: authStore.setTokens() + setUser()
    FE->>FE: Redirect to HomePage
```

---

## 4. Token Refresh Flow

```mermaid
sequenceDiagram
    participant FE as Frontend (Axios Interceptor)
    participant API as Backend
    participant DB as Database

    FE->>API: API Request (expired access_token)
    API-->>FE: 401 Unauthorized

    FE->>FE: Queue failed request
    FE->>API: POST /api/auth/refresh {refresh_token}
    API->>DB: Validate refresh_token (hash match, not revoked, not expired)
    API->>DB: Revoke old refresh_token
    API->>DB: Create new refresh_token
    API-->>FE: {access_token, refresh_token}

    FE->>FE: authStore.setTokens()
    FE->>FE: Replay queued requests with new token
    FE->>API: Retry original request
    API-->>FE: Success response
```

---

## 5. Product Browsing & Search Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend (HomePage)
    participant API as Backend (/api/products)
    participant DB as Database

    U->>FE: Open HomePage
    FE->>API: GET /categories
    API->>DB: SELECT categories + product counts
    API-->>FE: [{category_id, name, product_count}]

    FE->>API: GET /products?category_id=&search=&limit=20
    API->>DB: SELECT products JOIN variants (with filters)
    API-->>FE: [{product_id, name, min_price, max_price, image_url, ...}]

    FE->>FE: Render ProductCard grid

    U->>FE: Click "Add to Cart" on ProductCard
    FE->>API: GET /products/{id} (fetch variants)
    API->>DB: SELECT product + variants
    API-->>FE: {product, variants[]}

    alt Single variant
        FE->>FE: Add directly to cart
    else Multiple variants
        FE->>FE: Show variant selector modal
        U->>FE: Select variant
    end
```

---

## 6. Cart Management Flow (Dual Mode)

```mermaid
flowchart TB
    Start([User adds item]) --> AuthCheck{Authenticated?}

    AuthCheck -->|No| GuestCart["addToGuestCart()\nStore in localStorage"]
    AuthCheck -->|Yes| DBCart["addToCart()\nPOST /api/cart/items"]

    DBCart --> StockReserve["Backend:\n1. Check stock\n2. Deduct stock_quantity\n3. Add cart_item with reserved_at"]
    StockReserve --> UpdateStore["Update Zustand store:\nitems, totalItems, totalAmount"]

    GuestCart --> UpdateLocal["Update localStorage:\nguestCart[]"]

    subgraph Login["On User Login"]
        SyncCheck{Guest cart\nhas items?}
        SyncCheck -->|Yes| SyncCart["POST /api/cart/sync\nMerge guest items into DB cart"]
        SyncCheck -->|No| FetchCart["GET /api/cart\nLoad DB cart into store"]
        SyncCart --> FetchCart
    end

    subgraph Cleanup["Background Task (every 60s)"]
        CheckExpired["Find cart_items\nwhere reserved_at < NOW() - 30min"]
        CheckExpired --> RestoreStock["Restore stock_quantity\nto product_variants"]
        RestoreStock --> RemoveItems["DELETE expired cart_items"]
    end

    subgraph CartDrawer["CartDrawer Component"]
        OpenDrawer([User clicks cart icon]) --> FetchOnOpen["useEffect: fetchCart()\nRefresh from DB"]
        FetchOnOpen --> DisplayItems["Show items with:\nimage, name, price, quantity\n+/- buttons, delete"]
        DisplayItems --> CheckoutBtn([Checkout button])
    end
```

---

## 7. Checkout & Order Creation Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend (Checkout Page)
    participant API as Backend
    participant DB as Database

    U->>FE: Click "Checkout" from CartDrawer
    FE->>FE: Navigate to /checkout

    par Load data
        FE->>API: GET /api/addresses
        FE->>API: GET /api/cart (cartService.getCart)
    end
    API-->>FE: addresses[] + cart items[]

    U->>FE: Select shipping address
    U->>FE: Select payment method (PromptPay / COD)
    U->>FE: Click "Place Order"

    FE->>API: POST /api/orders/ {shipping_address_id, payment_method}

    API->>DB: Validate address belongs to user
    API->>DB: Get cart items + variant info
    API->>DB: Check stock availability

    API->>DB: BEGIN TRANSACTION
    API->>DB: INSERT INTO orders
    API->>DB: INSERT INTO order_items (for each item)
    API->>DB: INSERT INTO payments (status: pending)
    API->>DB: INSERT INTO shipments (status: preparing)
    API->>DB: DELETE FROM cart_items (clear cart)
    API->>DB: COMMIT

    API-->>FE: {order_id, total_amount, status, items[]}

    alt PromptPay
        FE->>FE: Navigate to /orders/{id}/payment
    else COD
        FE->>FE: Navigate to /orders/{id} (confirmation)
    end
```

---

## 8. Payment Flow (PromptPay QR + COD)

```mermaid
flowchart TB
    OrderCreated([Order Created]) --> PaymentMethod{Payment Method?}

    PaymentMethod -->|PromptPay| GenQR["POST /api/payments/{id}/generate-qr"]
    PaymentMethod -->|COD| ConfirmCOD["POST /api/payments/{id}/confirm-cod"]

    GenQR --> OmiseAPI["Omise API:\nCreate PromptPay source\nGenerate QR code URL"]

    OmiseAPI -->|Demo Mode| DemoQR["Return inline SVG\n(Demo QR placeholder)"]
    OmiseAPI -->|Production| RealQR["Return Omise QR URL\n+ source_id"]

    DemoQR --> ShowQR["Frontend:\nDisplay QR image\n+ amount + order ID"]
    RealQR --> ShowQR

    ShowQR --> Polling["Auto-polling every 15s\n(max 40 attempts = 10min)"]
    Polling --> VerifyAPI["POST /api/payments/{id}/verify"]

    VerifyAPI --> CheckOmise{"Check payment\nvia Omise API"}
    CheckOmise -->|Paid| UpdatePaid["UPDATE orders\nSET payment_status='paid'\nstatus='confirmed'"]
    CheckOmise -->|Not Paid| ContinuePoll["Continue polling"]

    UpdatePaid --> SuccessMsg["Show: Payment successful!"]

    Polling -->|Max attempts reached| Expired["Show: QR expired\nPlease reorder"]

    ConfirmCOD --> UpdateCOD["UPDATE orders\nSET payment_status='cod_pending'\nstatus='confirmed'"]
    UpdateCOD --> CODSuccess["Show: Order confirmed\nPay on delivery"]
```

---

## 9. AI Chatbot Flow (Complete)

```mermaid
flowchart TB
    Start([User opens chat]) --> InitSession["POST /api/chat/sessions\n(guest: session_token / logged-in: user_id)"]
    InitSession --> LoadHistory["GET /sessions/{id}/messages\nLoad previous messages"]

    LoadHistory --> UserInput([User types message])
    UserInput --> SendMsg["POST /sessions/{id}/messages"]

    SendMsg --> SaveUser["1. Save user message to DB"]
    SaveUser --> DetectIntent["2. Detect Intent (keyword matching)"]

    DetectIntent --> IntentType{Intent?}

    IntentType -->|NEGATION| General["General response\n(cancel, don't want)"]
    IntentType -->|CHECKOUT| Checkout["Fetch real cart from DB\nShow address selector"]
    IntentType -->|GENERAL| GeneralInfo["Answer info question\n+ cart data if asked"]
    IntentType -->|ORDER| OrderFlow["Find product\nCheck variants"]
    IntentType -->|SEARCH| SearchFlow["Semantic search\n(Gemini embedding + pgvector)"]

    SearchFlow --> EmbeddingGen["Generate query embedding\n(Gemini text-embedding-004)"]
    EmbeddingGen --> PGVector["pgvector cosine similarity\nsearch product_embeddings"]
    PGVector --> FilterResults["Filter by similarity > 0.55\nExpand to variant-level"]

    OrderFlow --> CheckVariants{Multiple\nvariants?}
    CheckVariants -->|Yes| SelectVariant["action: select_variant\nShow variant picker"]
    CheckVariants -->|No| AddToCart["action: add_to_cart\nAuto-add to cart"]

    FilterResults --> BuildPrompt
    General --> BuildPrompt
    Checkout --> BuildPrompt
    GeneralInfo --> BuildPrompt

    BuildPrompt["3. Build LLM Prompt:\n- System prompt\n- Intent hint + cart data\n- Product search results\n- Chat history (last 6)"]

    BuildPrompt --> CallLLM["4. Call Typhoon LLM\n(OpenAI-compatible API)"]
    CallLLM --> ParseResponse["5. Parse response\n+ attach metadata"]
    ParseResponse --> SaveAssistant["6. Save assistant message to DB"]

    SaveAssistant --> ReturnToFE["7. Return to Frontend:\n{content, products[], action, variants[]}"]

    ReturnToFE --> FEAction{Frontend Action?}

    FEAction -->|"show_addresses"| ShowAddr["ChatAddressSelector\n(fetch real addresses)"]
    FEAction -->|"show_payment_method"| ShowPay["ChatPaymentSelector\n(QR / COD buttons)"]
    FEAction -->|"show_qr"| ShowQR2["ChatQRCode\n(QR image + polling)"]
    FEAction -->|"show_cod_confirm"| ShowCOD["ChatCODConfirm\n(order confirmed)"]
    FEAction -->|"add_to_cart"| AutoAdd["autoAddToCart()\nAdd to DB cart"]
    FEAction -->|"select_variant"| ShowVariant["ChatVariantSelector\n(size/unit picker)"]
    FEAction -->|"none (search)"| ShowCards["ChatProductCard[]\n(product recommendations)"]

    ShowAddr --> UserSelect([User selects address])
    UserSelect --> ShowPay
    ShowPay --> UserPay([User selects payment])
    UserPay -->|PromptPay| ShowQR2
    UserPay -->|COD| ShowCOD
```

---

## 10. In-Chat Checkout Flow (Detailed)

```mermaid
sequenceDiagram
    participant U as User
    participant Chat as ChatPopup
    participant API as Backend
    participant DB as Database
    participant Cart as CartStore

    Note over U,Cart: Step 1: Add item via chat
    U->>Chat: "เอามาม่าต้มยำ 1 ซอง"
    Chat->>API: POST /sessions/{id}/messages
    API->>API: detect_intent() → "order"
    API->>DB: Semantic search → find product
    API->>API: Call Typhoon LLM
    API-->>Chat: {action: "add_to_cart", orderProduct, quantity: 1}
    Chat->>Cart: addToCart(variantId, 1)
    Cart->>API: POST /api/cart/items
    API->>DB: Deduct stock + add cart_item
    Chat->>Chat: Show confirmation message

    Note over U,Cart: Step 2: Checkout
    U->>Chat: "ชำระเงิน"
    Chat->>API: POST /sessions/{id}/messages
    API->>API: detect_intent() → "checkout"
    API->>DB: get_cart_summary() (real cart data)
    API->>API: Call Typhoon LLM (with real cart context)
    API-->>Chat: {action: "show_addresses", content: "...real cart items..."}

    Note over U,Cart: Step 3: Select address
    Chat->>API: GET /api/addresses
    API-->>Chat: addresses[]
    U->>Chat: Select address + confirm

    Note over U,Cart: Step 4: Select payment
    Chat->>Chat: Show ChatPaymentSelector
    U->>Chat: Click "QR PromptPay"
    Chat->>Cart: fetchCart() (verify cart not empty)
    Chat->>API: POST /api/orders/ {address_id, payment_method}
    API->>DB: Create order + clear cart
    API-->>Chat: {order_id, total_amount}

    Chat->>API: POST /api/payments/{id}/generate-qr
    API-->>Chat: {qr_code_url, amount, demo_mode}
    Chat->>Chat: Show ChatQRCode (polling starts)

    Note over U,Cart: Step 5: Payment verification
    loop Every 15s (max 40 attempts)
        Chat->>API: POST /api/payments/{id}/verify
        API-->>Chat: {paid: false}
    end
    Chat->>API: POST /api/payments/{id}/verify
    API-->>Chat: {paid: true}
    Chat->>Chat: Show "Payment successful!"
```

---

## 11. Admin Flow

```mermaid
flowchart TB
    AdminLogin([Admin Login]) --> Dashboard

    subgraph Dashboard["Dashboard (/admin)"]
        Stats["Total Users / Orders / Revenue\nLow Stock Alerts"]
    end

    subgraph ProductMgmt["Product Management (/admin/products)"]
        ListProducts["List all products\n+ search + filter"]
        ListProducts --> CreateProduct["Create product\n(name, description, category)"]
        ListProducts --> EditProduct["Edit product\n(update details)"]
        ListProducts --> ManageVariants["Manage variants\n(size, price, stock, image)"]
        ManageVariants --> RegenEmbeddings["Regenerate AI embeddings\n(Gemini API)"]
    end

    subgraph OrderMgmt["Order Management (/admin/orders)"]
        ListOrders["List all orders\n+ status filter"]
        ListOrders --> ViewOrder["View order detail\n(items, address, payment)"]
        ViewOrder --> UpdateStatus["Update status:\npending → confirmed → preparing\n→ shipping → delivered"]
    end

    subgraph UserMgmt["User Management (/admin/members)"]
        ListUsers["List all users\n+ search"]
        ListUsers --> EditUser["Edit user:\nrole (user/admin)\nis_active (true/false)"]
    end

    subgraph ChatbotMgmt["Chatbot Settings (/admin/chatbot)"]
        ViewPrompt["View system prompt"]
        ViewPrompt --> EditPrompt["Edit/Create prompt\n(custom AI instructions)"]
        EditPrompt --> RegenEmbed2["Regenerate embeddings\n(update product search)"]
    end

    subgraph ReportsMgmt["Reports (/admin/reports)"]
        SalesReport["Revenue by period\n(daily/weekly/monthly)"]
        TopProducts["Top selling products"]
        OrderTrends["Order trends chart"]
    end

    Dashboard --> ProductMgmt
    Dashboard --> OrderMgmt
    Dashboard --> UserMgmt
    Dashboard --> ChatbotMgmt
    Dashboard --> ReportsMgmt
```

---

## 12. Database Schema (ER Diagram)

```mermaid
erDiagram
    users ||--o{ user_addresses : has
    users ||--o{ orders : places
    users ||--o{ carts : has
    users ||--o{ chat_sessions : has
    users ||--o{ refresh_tokens : has
    users ||--o{ otp_requests : requests

    categories ||--o{ products : contains
    categories ||--o{ categories : "parent/child"

    products ||--o{ product_variants : has
    products ||--o{ product_embeddings : has

    product_variants ||--o{ cart_items : "in cart"
    product_variants ||--o{ order_items : ordered

    carts ||--o{ cart_items : contains

    orders ||--o{ order_items : contains
    orders ||--|| payments : has
    orders ||--|| shipments : has
    orders }o--|| user_addresses : "ships to"

    chat_sessions ||--o{ chat_messages : contains
    chatbot_prompts }o--o| categories : "for category"

    users {
        int user_id PK
        string phone_number UK
        string full_name
        string role "user | admin"
        boolean is_active
        boolean is_verified
        timestamp last_login_at
    }

    products {
        int product_id PK
        string name
        string description
        string marketing_copy
        int category_id FK
        boolean is_active
    }

    product_variants {
        int variant_id PK
        int product_id FK
        string sku UK
        decimal price
        int stock_quantity
        string image_url
        string unit
        string size
        string color
    }

    product_embeddings {
        int embedding_id PK
        int product_id FK
        vector embedding "768 dimensions"
        string text_content
    }

    orders {
        int order_id PK
        int user_id FK
        int shipping_address_id FK
        decimal total_amount
        string status "pending|confirmed|preparing|shipping|delivered|cancelled"
        string payment_status "unpaid|paid|cod_pending|refunded"
        string payment_method "promptpay_qr|cod"
    }

    payments {
        int payment_id PK
        int order_id FK
        string method
        decimal amount
        string status "pending|paid|failed"
        string omise_source_id
        string qr_code_url
    }

    cart_items {
        int id PK
        int cart_id FK
        int variant_id FK
        int quantity
        timestamp reserved_at "30-min TTL"
    }

    chat_messages {
        int message_id PK
        int session_id FK
        string role "user|assistant"
        string content
        json metadata "products, action, quantity"
    }
```

---

## 13. Component Hierarchy

```mermaid
graph TB
    App["App.tsx (Router)"]

    App --> CL["CustomerLayout"]
    App --> AL["AdminLayout"]

    subgraph CustomerLayout["CustomerLayout"]
        Navbar["Navbar\n(Logo, Profile, Cart Icon)"]
        Footer["Footer\n(Navigation Links)"]
        CartDrawer2["CartDrawer\n(Slide-out panel)"]
        ChatPopup2["ChatPopup\n(Floating chat window)"]
    end

    CL --> HP["HomePage\n(ProductList + ProductCard[])"]
    CL --> AP["AuthPage\n(PhoneInput + OTPInput)"]
    CL --> CP["Checkout\n(Address + Payment)"]
    CL --> OP["OrderHistory"]
    CL --> OD["OrderDetail"]
    CL --> OPay["OrderPayment"]
    CL --> PP["ProfilePage"]

    subgraph ChatComponents["Chat Components (inside ChatPopup)"]
        CM["ChatMessage"]
        CM --> CPC["ChatProductCard"]
        CM --> CVS["ChatVariantSelector"]
        CM --> CAS["ChatAddressSelector"]
        CM --> CPS["ChatPaymentSelector"]
        CM --> CQR["ChatQRCode"]
        CM --> CCOD["ChatCODConfirm"]
        CM --> COC["ChatOrderCard"]
    end

    subgraph AdminLayout["AdminLayout"]
        Sidebar["Sidebar Navigation"]
    end

    AL --> DP["DashboardPage"]
    AL --> MP["MembersPage"]
    AL --> APP2["AdminProductsPage"]
    AL --> AOP["AdminOrdersPage"]
    AL --> AODP["AdminOrderDetailPage"]
    AL --> CSP["ChatbotSettingsPage"]
    AL --> RP["ReportsPage"]
```

---

## 14. State Management (Zustand Stores)

```mermaid
flowchart LR
    subgraph authStore["authStore (persist: localStorage)"]
        AuthState["user: User | null\naccessToken / refreshToken\nisAuthenticated"]
        AuthActions["setUser() / setTokens()\nlogout() / setLoading()"]
    end

    subgraph cartStore["cartStore (persist: guestCart only)"]
        CartState["items: CartItem[] (DB)\nguestCart: GuestCartItem[] (local)\ntotalItems / totalAmount"]
        CartActions["fetchCart() / addToCart()\nupdateQuantity() / removeItem()\nsyncCart() / clearCart()\naddToGuestCart()"]
    end

    subgraph chatStore["chatStore (persist: sessionId, sessionToken)"]
        ChatState["messages: ChatMessage[]\nsessionId / sessionToken\nisOpen / isLoading"]
        ChatActions["openChat() / closeChat()\nsendMessage() / resetChat()\ninitSession() / addLocalMessage()"]
    end

    authStore -->|"isAuthenticated"| cartStore
    authStore -->|"user_id"| chatStore
    cartStore -->|"cart items"| ChatPaySel["ChatPaymentSelector\n(verify cart before order)"]
    chatStore -->|"messages"| ChatPopup3["ChatPopup\n(render messages)"]
```
