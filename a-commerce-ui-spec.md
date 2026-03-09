# A-Commerce UI Specification

## คำแนะนำสำหรับ AI Agent

เอกสารนี้คือ **UI Spec ของทุกหน้าในระบบ a-commerce** ให้สร้าง UI ตามที่ระบุไว้อย่างเคร่งครัด

Tech: **React + TypeScript + Tailwind CSS + Lucide React Icons + Recharts (กราฟ)**

กฎสำคัญ:
- Mobile-first (ออกแบบสำหรับ 375px ก่อน แล้ว responsive ขึ้น)
- Target user = วัยกลางคน-สูงอายุ → **ตัวอักษรใหญ่ ปุ่มใหญ่ ง่ายมากๆ**
- Base font: 16px ขึ้นไป, ปุ่ม: min height 48px
- ใช้ภาษาไทยทุกที่ที่เป็น label, placeholder, ข้อความ
- ทุก component ต้องมี loading state, error state, empty state

---

## 1. Design Tokens

```tsx
// tailwind.config.ts — ขยาย theme
const config = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        success: {
          50: '#ECFDF5',
          500: '#10B981',
          600: '#059669',
        },
        warning: {
          50: '#FFFBEB',
          500: '#F59E0B',
          600: '#D97706',
        },
        danger: {
          50: '#FEF2F2',
          500: '#EF4444',
          600: '#DC2626',
        }
      }
    }
  }
}
```

### ใช้ Tailwind Classes ตามนี้

```
พื้นหลังหลัก          : bg-gray-50
การ์ด/Container       : bg-white rounded-2xl shadow-sm border border-gray-100
ปุ่ม Primary          : bg-primary-600 hover:bg-primary-700 text-white rounded-xl px-6 py-3 text-lg font-medium
ปุ่ม Success (สั่งซื้อ) : bg-success-600 hover:bg-success-700 text-white rounded-xl px-6 py-3 text-lg font-medium
ปุ่ม Danger (ลบ)      : bg-danger-600 hover:bg-danger-700 text-white rounded-xl px-4 py-2 text-sm
ปุ่ม Ghost            : text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg px-4 py-2
ปุ่ม Disabled         : bg-gray-200 text-gray-400 cursor-not-allowed
Input                 : w-full border border-gray-300 rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500
Label                 : text-sm font-medium text-gray-700 mb-1
Error text            : text-sm text-danger-600 mt-1
Badge (status)        : inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
Heading หน้า          : text-2xl font-bold text-gray-900
Sub heading           : text-lg font-semibold text-gray-800
Body text             : text-base text-gray-700
Caption               : text-sm text-gray-500
Divider               : border-t border-gray-100
```

---

## 2. Shared Components

### 2.1 CustomerLayout

```
┌─────────────────────────────────────────┐
│ HEADER (sticky top)                      │
│ ┌─────────────────────────────────────┐ │
│ │ 🏪 ร้านโชห่วย ABC    👤 สมชาย  🛒3 │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│                                         │
│             PAGE CONTENT                │
│             (children)                  │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│ BOTTOM NAV (mobile only, sticky bottom) │
│ ┌────┬────┬────┬────┐                   │
│ │ 🏠 │ 🛍 │ 📋 │ 👤 │                   │
│ │หน้าแรก│ร้านค้า│คำสั่งซื้อ│โปรไฟล์│            │
│ └────┴────┴────┴────┘                   │
│                                         │
│ FLOATING BUTTONS (fixed bottom-right)   │
│                           ┌────┐        │
│                           │ 💬 │        │
│                           └────┘        │
└─────────────────────────────────────────┘
```

```tsx
// components/layout/CustomerLayout.tsx

<div className="min-h-screen bg-gray-50">
  {/* Header */}
  <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
    <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
      <h1 className="text-lg font-bold text-primary-600">🏪 ร้านโชห่วย ABC</h1>
      <div className="flex items-center gap-3">
        {/* Profile icon */}
        <Link to="/profile">
          <User className="w-6 h-6 text-gray-600" />
        </Link>
        {/* Cart icon + badge */}
        <button onClick={openCart} className="relative">
          <ShoppingCart className="w-6 h-6 text-gray-600" />
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-danger-600 text-white
                             text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </div>
  </header>

  {/* Page Content */}
  <main className="max-w-lg mx-auto pb-20">
    {children}
  </main>

  {/* Bottom Navigation - mobile */}
  <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200
                  md:hidden">
    <div className="max-w-lg mx-auto flex">
      <NavItem icon={Home} label="หน้าแรก" to="/" />
      <NavItem icon={Store} label="ร้านค้า" to="/shop" />
      <NavItem icon={ClipboardList} label="คำสั่งซื้อ" to="/orders" />
      <NavItem icon={User} label="โปรไฟล์" to="/profile" />
    </div>
  </nav>

  {/* Floating Chat Button */}
  <button
    onClick={openChat}
    className="fixed bottom-20 right-4 md:bottom-6 z-50
               w-14 h-14 bg-primary-600 hover:bg-primary-700
               text-white rounded-full shadow-lg
               flex items-center justify-center
               transition-transform hover:scale-110"
  >
    <MessageCircle className="w-6 h-6" />
  </button>
</div>
```

NavItem:
```tsx
<Link to={to} className="flex-1 flex flex-col items-center py-2 text-xs
                          {isActive ? 'text-primary-600' : 'text-gray-400'}">
  <Icon className="w-5 h-5 mb-0.5" />
  <span>{label}</span>
</Link>
```

### 2.2 AdminLayout

```
Desktop (md+):
┌──────────┬──────────────────────────────┐
│ SIDEBAR  │  HEADER                       │
│ (fixed)  │  ┌──────────────────────────┐ │
│          │  │ 📦 จัดการสินค้า    👤 ออก │ │
│ 🏪 A-Commerce │  └──────────────────────────┘ │
│          │                               │
│ 📊 Dashboard │        PAGE CONTENT          │
│ 📦 สินค้า   │                               │
│ 📋 คำสั่งซื้อ│                               │
│ 👥 สมาชิก  │                               │
│ 🤖 แชทบอท │                               │
│ 📈 รายงาน  │                               │
│          │                               │
│          │                               │
│ ──────── │                               │
│ 🚪 ออกจากระบบ│                              │
└──────────┴──────────────────────────────┘

Mobile:
┌─────────────────────────────────────────┐
│ HEADER                                   │
│ ☰ จัดการสินค้า              👤 ออกจากระบบ │
├─────────────────────────────────────────┤
│                                         │
│             PAGE CONTENT                │
│                                         │
├─────────────────────────────────────────┤
│ BOTTOM NAV                              │
│ ┌──────┬──────┬──────┬──────┬──────┐    │
│ │  📊  │  📦  │  📋  │  👥  │  ⋯   │    │
│ │  หลัก │ สินค้า│คำสั่งซื้อ│สมาชิก│ เพิ่มเติม│   │
│ └──────┴──────┴──────┴──────┴──────┘    │
└─────────────────────────────────────────┘
```

```tsx
// components/layout/AdminLayout.tsx

// Sidebar items
const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/admin' },
  { icon: Package, label: 'จัดการสินค้า', to: '/admin/products' },
  { icon: ClipboardList, label: 'คำสั่งซื้อ', to: '/admin/orders' },
  { icon: Users, label: 'สมาชิก', to: '/admin/members' },
  { icon: Bot, label: 'ตั้งค่าแชทบอท', to: '/admin/chatbot' },
  { icon: BarChart3, label: 'รายงาน', to: '/admin/reports' },
]

// Desktop sidebar:
<aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0
                   bg-white border-r border-gray-200">
  {/* Logo */}
  <div className="h-16 flex items-center px-6 border-b border-gray-100">
    <span className="text-xl font-bold text-primary-600">🏪 A-Commerce</span>
  </div>

  {/* Menu */}
  <nav className="flex-1 py-4 px-3 space-y-1">
    {menuItems.map(item => (
      <NavLink
        to={item.to}
        className={({isActive}) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
           transition-colors
           ${isActive
             ? 'bg-primary-50 text-primary-700'
             : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
        }
      >
        <item.icon className="w-5 h-5" />
        {item.label}
      </NavLink>
    ))}
  </nav>

  {/* Logout */}
  <div className="p-3 border-t border-gray-100">
    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                        text-sm text-gray-600 hover:bg-gray-50">
      <LogOut className="w-5 h-5" />
      ออกจากระบบ
    </button>
  </div>
</aside>

// Content area:
<div className="md:ml-60">
  {/* Top header */}
  <header className="sticky top-0 z-30 bg-white border-b border-gray-200 h-16
                      flex items-center justify-between px-4 md:px-6">
    <div className="flex items-center gap-3">
      <button className="md:hidden" onClick={toggleMenu}>
        <Menu className="w-6 h-6" />
      </button>
      <h2 className="text-lg font-semibold text-gray-900">{pageTitle}</h2>
    </div>
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <span>ผู้ดูแลระบบ</span>
    </div>
  </header>

  <main className="p-4 md:p-6">
    {children}
  </main>
</div>
```

### 2.3 StatusBadge Component

```tsx
// components/common/StatusBadge.tsx

const STATUS_STYLES = {
  // Order status
  pending:    'bg-warning-50 text-warning-600',
  confirmed:  'bg-blue-50 text-blue-600',
  preparing:  'bg-orange-50 text-orange-600',
  shipping:   'bg-indigo-50 text-indigo-600',
  delivered:  'bg-success-50 text-success-600',
  cancelled:  'bg-danger-50 text-danger-600',

  // Payment status
  unpaid:      'bg-gray-100 text-gray-600',
  paid:        'bg-success-50 text-success-600',
  cod_pending: 'bg-warning-50 text-warning-600',
  refunded:    'bg-purple-50 text-purple-600',

  // General
  active:   'bg-success-50 text-success-600',
  inactive: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'รอดำเนินการ',
  confirmed: 'ยืนยันแล้ว',
  preparing: 'กำลังเตรียมสินค้า',
  shipping: 'กำลังจัดส่ง',
  delivered: 'จัดส่งสำเร็จ',
  cancelled: 'ยกเลิก',
  unpaid: 'รอชำระเงิน',
  paid: 'ชำระแล้ว',
  cod_pending: 'เก็บเงินปลายทาง',
  refunded: 'คืนเงินแล้ว',
  active: 'ใช้งาน',
  inactive: 'ระงับ',
}

<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full
                   text-xs font-medium ${STATUS_STYLES[status]}`}>
  {STATUS_LABELS[status]}
</span>
```

### 2.4 EmptyState Component

```tsx
// components/common/EmptyState.tsx
// ใช้ทุกที่ที่รายการว่าง

<div className="flex flex-col items-center justify-center py-16 px-4">
  <Icon className="w-16 h-16 text-gray-300 mb-4" />
  <p className="text-lg text-gray-500 mb-1">{title}</p>
  <p className="text-sm text-gray-400 mb-6">{description}</p>
  {action && (
    <button className="bg-primary-600 text-white px-6 py-2.5 rounded-xl text-sm">
      {action.label}
    </button>
  )}
</div>

// ตัวอย่างใช้งาน:
<EmptyState
  icon={ShoppingBag}
  title="ยังไม่มีคำสั่งซื้อ"
  description="เลือกซื้อสินค้าและสั่งซื้อได้เลย"
  action={{ label: "ไปหน้าร้านค้า", onClick: () => navigate('/shop') }}
/>
```

### 2.5 LoadingSkeleton

```tsx
// components/common/Skeleton.tsx

// Product card skeleton
<div className="animate-pulse">
  <div className="bg-gray-200 rounded-xl aspect-square mb-3" />
  <div className="bg-gray-200 h-4 rounded w-3/4 mb-2" />
  <div className="bg-gray-200 h-5 rounded w-1/2" />
</div>

// Table row skeleton
<div className="animate-pulse flex items-center gap-4 py-3">
  <div className="bg-gray-200 h-4 rounded flex-1" />
  <div className="bg-gray-200 h-4 rounded w-20" />
  <div className="bg-gray-200 h-4 rounded w-16" />
</div>
```

### 2.6 ConfirmDialog

```tsx
// components/common/ConfirmDialog.tsx

// Modal overlay:
<div className="fixed inset-0 z-50 flex items-center justify-center p-4
                bg-black/50 backdrop-blur-sm">
  <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
    {/* Icon */}
    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-danger-50
                    flex items-center justify-center">
      <AlertTriangle className="w-6 h-6 text-danger-600" />
    </div>

    <h3 className="text-lg font-semibold text-center text-gray-900 mb-2">
      {title}
    </h3>
    <p className="text-sm text-gray-500 text-center mb-6">
      {message}
    </p>

    <div className="flex gap-3">
      <button onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-gray-300
                         text-gray-700 text-sm font-medium hover:bg-gray-50">
        ยกเลิก
      </button>
      <button onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl bg-danger-600
                         text-white text-sm font-medium hover:bg-danger-700">
        {confirmLabel}
      </button>
    </div>
  </div>
</div>
```

---

## 3. Auth Pages

### 3.1 AuthPage (Container)

```
┌─────────────────────────────────────────┐
│              bg-gray-50                  │
│                                         │
│    ┌───────────────────────────────┐    │
│    │         bg-white              │    │
│    │         rounded-2xl           │    │
│    │         shadow-lg             │    │
│    │         max-w-md              │    │
│    │                               │    │
│    │    🏪 (logo/icon ร้านค้า)     │    │
│    │    "ร้านโชห่วย ABC"           │    │
│    │                               │    │
│    │    ┌─ Step Content ──────┐    │    │
│    │    │  PhoneStep          │    │    │
│    │    │  หรือ OTPStep       │    │    │
│    │    │  หรือ ProfileStep   │    │    │
│    │    └─────────────────────┘    │    │
│    │                               │    │
│    └───────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

### 3.2 PhoneStep

```
┌───────────────────────────────┐
│                               │
│       🏪 (48px icon)          │
│                               │
│   "ร้านโชห่วย ABC"            │
│   text-2xl font-bold          │
│   text-primary-600            │
│                               │
│   "กรอกเบอร์โทรศัพท์เพื่อ      │
│    เข้าใช้งาน"                 │
│   text-base text-gray-500     │
│                               │
│   ┌─────────────────────────┐ │
│   │  0812345678              │ │
│   │  text-2xl text-center    │ │
│   │  tracking-widest         │ │
│   │  inputMode="numeric"     │ │
│   └─────────────────────────┘ │
│                               │
│   ❌ "เบอร์โทรศัพท์ไม่ถูกต้อง"  │  ← error (ซ่อนถ้าไม่มี)
│   text-sm text-danger-600     │
│                               │
│   ┌─────────────────────────┐ │
│   │        ถัดไป              │ │  ← disabled ถ้ายังไม่ครบ 10 หลัก
│   │  bg-primary-600          │ │
│   │  py-4 text-lg            │ │
│   └─────────────────────────┘ │
│                               │
│                               │
│  ──── หลังกด ถัดไป (ถ้ามีบัญชี) ──── │
│                               │
│   "สวัสดี คุณสม***"           │  ← masked name
│   text-lg text-gray-700       │
│                               │
│   ┌─────────────────────────┐ │
│   │     ขอรหัส OTP           │ │
│   │  bg-primary-600          │ │
│   └─────────────────────────┘ │
│                               │
│  ──── หลังกด ถัดไป (ไม่มีบัญชี) ──── │
│                               │
│   "ยังไม่มีบัญชี สมัครเลย!"    │
│                               │
│   ┌─────────────────────────┐ │
│   │  ขอรหัส OTP เพื่อสมัคร    │ │
│   │  bg-success-600          │ │
│   └─────────────────────────┘ │
│                               │
└───────────────────────────────┘
```

### 3.3 OTPStep

```
┌───────────────────────────────┐
│                               │
│   "กรอกรหัส OTP"              │
│   text-xl font-bold           │
│                               │
│   "ส่งไปที่ 081****678"       │
│   text-sm text-gray-500       │
│                               │
│   ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐  │
│   │  │ │  │ │  │ │  │ │  │ │  │  │  ← 6 ช่อง แยกกัน
│   └──┘ └──┘ └──┘ └──┘ └──┘ └──┘  │    w-12 h-14 text-2xl text-center
│   gap-2                       │    border-2 rounded-lg
│                               │    focus:border-primary-500
│   ❌ "รหัส OTP ไม่ถูกต้อง      │
│      (เหลืออีก 3 ครั้ง)"       │  ← error
│                               │
│   ⏱ "รหัสจะหมดอายุใน 4:32"   │  ← countdown สีเทา
│   text-sm text-gray-500       │
│                               │
│   หรือ (ถ้าหมดเวลา):          │
│   🔄 "ส่งรหัส OTP ใหม่"       │  ← text-primary-600 underline
│                               │
│   ← "เปลี่ยนเบอร์โทร"         │  ← text-sm text-gray-400
│                               │
│   กำลังตรวจสอบ...             │  ← spinner (ขณะ verify)
│                               │
└───────────────────────────────┘
```

OTP Input behavior:
- พิมพ์ตัวเลข → auto-focus ช่องถัดไป
- Backspace ช่องว่าง → focus ช่องก่อนหน้า
- กรอกครบ 6 หลัก → auto-submit
- Paste 6 ตัวเลข → กระจายลงทุกช่อง + auto-submit
- กรอกผิด → clear ทุกช่อง + focus ช่องแรก + แสดง error + เขย่าช่อง (shake animation)

### 3.4 ProfileStep

```
┌───────────────────────────────┐
│                               │
│   ✅ "ยืนยันตัวตนสำเร็จ!"     │
│   text-success-600            │
│                               │
│   "กรอกข้อมูลเพื่อเริ่มใช้งาน" │
│                               │
│   ชื่อ-นามสกุล *              │
│   ┌─────────────────────────┐ │
│   │ สมชาย ใจดี               │ │
│   └─────────────────────────┘ │
│                               │
│   ── ที่อยู่จัดส่ง (เพิ่มทีหลังได้) ── │
│                               │
│   ที่อยู่                      │
│   ┌─────────────────────────┐ │
│   │ 123/4 ซ.5 ถ.สุขุมวิท    │ │ ← textarea rows=2
│   └─────────────────────────┘ │
│                               │
│   ┌───────────┐ ┌───────────┐ │
│   │ ตำบล      │ │ อำเภอ     │ │  ← grid grid-cols-2 gap-2
│   └───────────┘ └───────────┘ │
│   ┌───────────┐ ┌───────────┐ │
│   │ จังหวัด   │ │ รหัส ปณ.  │ │
│   └───────────┘ └───────────┘ │
│                               │
│   ┌─────────────────────────┐ │
│   │    เริ่มใช้งาน 🎉        │ │  ← bg-success-600 py-4 text-lg
│   └─────────────────────────┘ │
│                               │
│   "ข้ามไปก่อน"                │  ← text-sm text-gray-400 underline
│                               │
└───────────────────────────────┘
```

---

## 4. Customer Pages

### 4.1 HomePage / ShopPage

```
┌─────────────────────────────────────┐
│ HEADER (จาก CustomerLayout)          │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 🔍 ค้นหาสินค้า...           │    │  ← rounded-xl bg-gray-100
│  └─────────────────────────────┘    │    px-4 py-3 text-base
│                                     │
│  ┌──────┬──────┬──────┬──────┐      │
│  │ ทั้งหมด│เครื่องดื่ม│ ขนม │ของใช้│      │  ← horizontal scroll
│  └──────┴──────┴──────┴──────┘      │    overflow-x-auto
│  Category tabs:                     │    whitespace-nowrap
│  Active: bg-primary-600 text-white  │
│          rounded-full px-4 py-2     │
│  Inactive: bg-gray-100 text-gray-600│
│            rounded-full px-4 py-2   │
│                                     │
│  ┌──────────────┬──────────────┐    │  ← grid grid-cols-2 gap-3
│  │  ┌────────┐  │  ┌────────┐  │    │    md:grid-cols-3
│  │  │  📷    │  │  │  📷    │  │    │    lg:grid-cols-4
│  │  │ (รูป)  │  │  │ (รูป)  │  │    │
│  │  │ aspect │  │  │ aspect │  │    │
│  │  │ square │  │  │ square │  │    │
│  │  └────────┘  │  └────────┘  │    │
│  │  โค้ก 330ml  │  เป๊ปซี่ 330ml│    │  ← text-sm font-medium
│  │  ขวด         │  ขวด         │    │     text-xs text-gray-400
│  │  ┌─────────┐ │  ┌─────────┐ │    │
│  │  │฿15      │ │  │฿15      │ │    │  ← text-lg font-bold
│  │  └─────────┘ │  └─────────┘ │    │     text-primary-600
│  │  ┌─────────┐ │  ┌─────────┐ │    │
│  │  │ ใส่ตะกร้า│ │  │ ใส่ตะกร้า│ │    │  ← bg-primary-600 text-white
│  │  └─────────┘ │  └─────────┘ │    │     rounded-lg py-2 text-sm
│  │              │              │    │     w-full
│  ├──────────────┼──────────────┤    │
│  │  ┌────────┐  │  ┌────────┐  │    │
│  │  │ สินค้า  │  │  │  หมด   │  │    │  ← หมดสต็อก:
│  │  │  ...    │  │  │ สต็อก  │  │    │    opacity-50
│  │  │         │  │  │ (เทา)  │  │    │    ปุ่ม disabled
│  │  └────────┘  │  └────────┘  │    │    badge "หมดสต็อก"
│  └──────────────┴──────────────┘    │
│                                     │
│  [Loading: skeleton 6 cards]        │
│  [Empty: "ไม่พบสินค้าในหมวดนี้"]     │
│                                     │
├─────────────────────────────────────┤
│ BOTTOM NAV + FLOATING CHAT          │
└─────────────────────────────────────┘
```

ProductCard component:
```tsx
<div className="bg-white rounded-2xl border border-gray-100 overflow-hidden
                shadow-sm hover:shadow-md transition-shadow">
  {/* Image */}
  <div className="aspect-square bg-gray-100 relative">
    <img src={image} className="w-full h-full object-cover" />
    {stock === 0 && (
      <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
        <span className="bg-gray-800 text-white text-xs px-3 py-1 rounded-full">
          หมดสต็อก
        </span>
      </div>
    )}
  </div>

  {/* Info */}
  <div className="p-3">
    <p className="text-sm font-medium text-gray-900 line-clamp-2">{name}</p>
    <p className="text-xs text-gray-400 mt-0.5">{unit}</p>
    <p className="text-lg font-bold text-primary-600 mt-1">฿{price}</p>
    <button
      disabled={stock === 0}
      className="w-full mt-2 py-2 rounded-lg text-sm font-medium
                 bg-primary-600 text-white hover:bg-primary-700
                 disabled:bg-gray-200 disabled:text-gray-400"
    >
      {stock === 0 ? 'สินค้าหมด' : 'ใส่ตะกร้า'}
    </button>
  </div>
</div>
```

### 4.2 ProductDetail (Modal)

```
┌─────────────────────────────────────┐
│ (Modal overlay: bg-black/50)         │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │                            ✕    │ │  ← slide up from bottom (mobile)
│ │  ┌───────────────────────────┐  │ │
│ │  │                           │  │ │
│ │  │     📷 รูปสินค้า (ใหญ่)    │  │ │  ← aspect-video, rounded-xl
│ │  │                           │  │ │
│ │  └───────────────────────────┘  │ │
│ │                                 │ │
│ │  โค้ก ออริจินัล                   │ │  ← text-xl font-bold
│ │  น้ำอัดลม > เครื่องดื่ม           │ │  ← text-sm text-gray-400
│ │                                 │ │
│ │  ฿15.00                        │ │  ← text-2xl font-bold text-primary
│ │  ต่อขวด                         │ │  ← text-sm text-gray-500
│ │  🟢 มีสินค้า (50 ชิ้น)          │ │  ← text-sm text-success-600
│ │                                 │ │
│ │  "น้ำอัดลมรสชาติดั้งเดิมที่      │ │
│ │   คุ้นเคย ดื่มเย็นๆ สดชื่น       │ │  ← text-sm text-gray-600
│ │   ตลอดวัน"                      │ │     (marketing_copy)
│ │                                 │ │
│ │  ── Variants (ถ้ามีหลายตัวเลือก) ── │
│ │  ┌──────┐ ┌──────┐ ┌──────┐    │ │
│ │  │330ml │ │500ml │ │1.5L  │    │ │  ← toggle buttons
│ │  │ ฿15  │ │ ฿22  │ │ ฿35  │    │ │    active: border-primary ring-2
│ │  └──────┘ └──────┘ └──────┘    │ │
│ │                                 │ │
│ │  ── จำนวน ──                    │ │
│ │        ┌──┐ ┌────┐ ┌──┐       │ │
│ │        │ - │ │ 1  │ │ + │       │ │  ← w-10 h-10 rounded-full
│ │        └──┘ └────┘ └──┘       │ │    border, text-lg
│ │                                 │ │
│ │  ┌───────────────────────────┐  │ │
│ │  │  ใส่ตะกร้า  ฿15.00        │  │ │  ← bg-primary-600 w-full
│ │  └───────────────────────────┘  │ │    py-4 text-lg rounded-xl
│ │                                 │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 4.3 CartDrawer

```
┌─────────────────────────────────────┐
│ (Overlay: bg-black/50)               │
│                    ┌────────────────┐│
│                    │ ตะกร้าสินค้า  ✕ ││  ← slide-in from right
│                    │ (3 รายการ)     ││    w-full max-w-md
│                    ├────────────────┤│
│                    │                ││
│                    │ ┌────────────┐ ││
│                    │ │📷│โค้ก 330ml│ ││  ← flex gap-3
│                    │ │  │฿15 × 2  │ ││    img: w-16 h-16 rounded-lg
│                    │ │  │= ฿30    │ ││
│                    │ │  │ [-][2][+]│ ││
│                    │ │  │    🗑   │ ││  ← ปุ่มลบ: text-gray-400
│                    │ └────────────┘ ││
│                    │                ││
│                    │ ┌────────────┐ ││
│                    │ │📷│เลย์ ฿22 │ ││
│                    │ │  │× 1 = ฿22│ ││
│                    │ │  │ [-][1][+]│ ││
│                    │ └────────────┘ ││
│                    │                ││
│                    │ ⚠️ "สินค้า     ││  ← warning box (ถ้ามี)
│                    │ บางรายการหมด   ││    bg-warning-50
│                    │ สต็อก"         ││    text-warning-700
│                    │                ││
│                    ├────────────────┤│
│                    │ รวม    ฿52.00  ││  ← text-lg font-bold
│                    │                ││
│                    │┌──────────────┐││
│                    ││  สั่งซื้อ     │││  ← bg-success-600 py-4
│                    │└──────────────┘││    text-lg w-full
│                    │                ││
│                    │ "ช้อปต่อ"      ││  ← text-sm text-gray-500
│                    └────────────────┘│
└─────────────────────────────────────┘
```

Cart item เมื่อสินค้าหมดสต็อก:
```tsx
<div className="opacity-50">
  {/* ...content... */}
  <span className="text-xs text-danger-600">สินค้าหมดสต็อก</span>
</div>
```

Empty cart:
```
┌────────────────┐
│                │
│  🛒 (gray)     │
│  "ตะกร้าว่างเปล่า" │
│  "เลือกสินค้าที่ชอบ│
│   แล้วเพิ่มลงตะกร้า│
│   ได้เลย"       │
│                │
│  [ไปหน้าร้านค้า] │
│                │
└────────────────┘
```

### 4.4 CheckoutPage

```
┌─────────────────────────────────────┐
│ ← ย้อนกลับ    ชำระเงิน              │
├─────────────────────────────────────┤
│                                     │
│  ── ที่อยู่จัดส่ง ──                  │
│  ┌─────────────────────────────┐    │
│  │ 📍 สมชาย ใจดี               │    │  ← bg-white rounded-2xl p-4
│  │    081-234-5678             │    │     border border-gray-100
│  │    123/4 ซ.5 ถ.สุขุมวิท     │    │
│  │    แขวงคลองตัน เขตคลองเตย  │    │
│  │    กรุงเทพ 10110           │    │
│  │                    [เปลี่ยน]│    │  ← text-primary-600 text-sm
│  └─────────────────────────────┘    │
│                                     │
│  ถ้ายังไม่มีที่อยู่:                 │
│  ┌─────────────────────────────┐    │
│  │ ➕ เพิ่มที่อยู่จัดส่ง         │    │  ← border-dashed border-2
│  └─────────────────────────────┘    │    border-gray-300
│                                     │
│  ── รายการสินค้า ──                  │
│  ┌─────────────────────────────┐    │
│  │ โค้ก 330ml      ×2    ฿30  │    │  ← bg-white rounded-2xl
│  │ เลย์ คลาสสิค    ×1    ฿22  │    │
│  │ ─────────────────────────  │    │
│  │ รวม 3 รายการ        ฿52   │    │  ← font-bold
│  └─────────────────────────────┘    │
│                                     │
│  ── วิธีชำระเงิน ──                  │
│  ┌─────────────────────────────┐    │
│  │ ◉ PromptPay QR Code        │    │  ← radio button style
│  │   "สแกน QR ชำระผ่านแอปธนาคาร" │   │    active: border-primary-600
│  ├─────────────────────────────┤    │           bg-primary-50
│  │ ○ เก็บเงินปลายทาง (COD)    │    │
│  │   "ชำระเมื่อได้รับสินค้า"    │    │
│  └─────────────────────────────┘    │
│                                     │
│  ── สรุป ──                          │
│  ┌─────────────────────────────┐    │
│  │ ราคาสินค้า           ฿52.00│    │
│  │ ค่าจัดส่ง             ฿0.00│    │
│  │ ─────────────────────────  │    │
│  │ ยอดรวมทั้งสิ้น       ฿52.00│    │  ← text-xl font-bold
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │     ยืนยันคำสั่งซื้อ          │    │  ← bg-success-600 py-4
│  └─────────────────────────────┘    │    text-lg rounded-xl
│                                     │
└─────────────────────────────────────┘
```

### 4.5 PaymentPage (PromptPay QR)

```
┌─────────────────────────────────────┐
│            ชำระเงิน                  │
├─────────────────────────────────────┤
│                                     │
│   ┌───────────────────────────┐     │
│   │                           │     │
│   │                           │     │
│   │       ┌───────────┐      │     │  ← bg-white rounded-2xl
│   │       │           │      │     │    p-8 text-center
│   │       │  QR CODE  │      │     │
│   │       │  (200×200)│      │     │  ← mx-auto
│   │       │           │      │     │
│   │       └───────────┘      │     │
│   │                           │     │
│   │   ยอดที่ต้องชำระ          │     │
│   │   ฿52.00                 │     │  ← text-3xl font-bold
│   │                           │     │    text-primary-600
│   │   ⏱ กรุณาชำระภายใน       │     │
│   │     14:32                │     │  ← text-2xl font-mono
│   │                           │     │    text-danger-600 (< 2 นาที)
│   │   เปิดแอปธนาคารและ        │     │
│   │   สแกน QR Code           │     │
│   │   เพื่อชำระเงิน            │     │
│   │                           │     │
│   │   🔄 กำลังตรวจสอบ         │     │  ← animate-pulse
│   │      การชำระเงิน...       │     │
│   │                           │     │
│   └───────────────────────────┘     │
│                                     │
│   ── สำหรับ Demo ──                  │
│   ┌───────────────────────────┐     │
│   │ 🧪 จำลองชำระเงินสำเร็จ    │     │  ← bg-warning-500 text-white
│   └───────────────────────────┘     │    py-3 rounded-xl
│                                     │
│   "ยกเลิก"                          │
│   text-sm text-gray-400             │
│                                     │
└─────────────────────────────────────┘
```

### 4.6 OrderSuccessPage

```
┌─────────────────────────────────────┐
│                                     │
│            ✅ (64px)                 │  ← text-success-500
│                                     │    animate: scale-in
│        "สั่งซื้อสำเร็จ!"            │  ← text-2xl font-bold
│                                     │
│   ┌───────────────────────────┐     │
│   │ คำสั่งซื้อ #A0042          │     │  ← bg-white rounded-2xl p-4
│   │                           │     │
│   │ วันที่: 17 ก.พ. 2569      │     │
│   │ จำนวน: 3 รายการ           │     │
│   │ ยอดรวม: ฿52.00           │     │
│   │ การชำระเงิน: PromptPay    │     │
│   │ สถานะ: ✅ ชำระแล้ว        │     │
│   └───────────────────────────┘     │
│                                     │
│   ┌───────────────────────────┐     │
│   │     ดูคำสั่งซื้อ            │     │  ← bg-primary-600
│   └───────────────────────────┘     │
│                                     │
│   ┌───────────────────────────┐     │
│   │     กลับหน้าร้าน           │     │  ← border border-gray-300
│   └───────────────────────────┘     │
│                                     │
└─────────────────────────────────────┘
```

### 4.7 OrdersPage (Customer)

```
┌─────────────────────────────────────┐
│ HEADER: คำสั่งซื้อของฉัน              │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │ #A0042           17 ก.พ.   │    │  ← bg-white rounded-2xl p-4
│  │                             │    │    mb-3
│  │ โค้ก 330ml ×2, เลย์ ×1     │    │  ← text-sm text-gray-500
│  │                             │    │    line-clamp-1
│  │ ฿52.00    🟢 จัดส่งสำเร็จ   │    │  ← flex justify-between
│  │                             │    │    StatusBadge
│  │                    ดูรายละเอียด >│   │  ← text-sm text-primary-600
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ #A0041           15 ก.พ.   │    │
│  │                             │    │
│  │ มาม่า ×5, ทิชชู่ ×2        │    │
│  │                             │    │
│  │ ฿120.00  🟡 กำลังจัดส่ง     │    │
│  │                    ดูรายละเอียด >│
│  └─────────────────────────────┘    │
│                                     │
│  [Empty: "ยังไม่มีคำสั่งซื้อ"]       │
│                                     │
└─────────────────────────────────────┘
```

### 4.8 OrderDetailPage (Customer)

```
┌─────────────────────────────────────┐
│ ← ย้อนกลับ   คำสั่งซื้อ #A0042       │
├─────────────────────────────────────┤
│                                     │
│  ── สถานะ (Progress Bar) ──          │
│  ┌─────────────────────────────┐    │
│  │  ●━━━━━●━━━━━●━━━━━○━━━━━○ │    │
│  │  สั่งซื้อ  ยืนยัน  เตรียม  จัดส่ง  สำเร็จ │
│  │                             │    │
│  │  Active step: text-primary  │    │
│  │  Done: text-success         │    │
│  │  Pending: text-gray-300     │    │
│  └─────────────────────────────┘    │
│                                     │
│  ── รายการสินค้า ──                   │
│  ┌─────────────────────────────┐    │
│  │ 📷 โค้ก 330ml      ×2 ฿30  │    │
│  │ 📷 เลย์ คลาสสิค   ×1 ฿22  │    │
│  │ ─────────────────────────  │    │
│  │ รวม                 ฿52.00 │    │
│  └─────────────────────────────┘    │
│                                     │
│  ── การชำระเงิน ──                   │
│  ┌─────────────────────────────┐    │
│  │ วิธี: PromptPay QR          │    │
│  │ สถานะ: ✅ ชำระแล้ว          │    │
│  │ เวลา: 17 ก.พ. 14:30        │    │
│  └─────────────────────────────┘    │
│                                     │
│  ── ข้อมูลจัดส่ง ──                   │
│  ┌─────────────────────────────┐    │
│  │ 📍 สมชาย ใจดี               │    │
│  │    081-234-5678             │    │
│  │    123/4 ซ.5 กรุงเทพ 10110 │    │
│  │                             │    │
│  │ 📦 Tracking: TH123456789   │    │  ← กดได้ (copy)
│  │    ขนส่ง: Kerry Express     │    │
│  └─────────────────────────────┘    │
│                                     │
│  (ถ้า status=pending):              │
│  ┌─────────────────────────────┐    │
│  │     ยกเลิกคำสั่งซื้อ          │    │  ← bg-white border-danger
│  └─────────────────────────────┘    │    text-danger-600
│                                     │
└─────────────────────────────────────┘
```

### 4.9 ProfilePage

```
┌─────────────────────────────────────┐
│ HEADER: โปรไฟล์ของฉัน                │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │  👤 (avatar circle 64px)    │    │  ← bg-primary-100
│  │  สมชาย ใจดี                  │    │    text-primary-600
│  │  081-234-5678               │    │
│  │                    [แก้ไข]  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ── ที่อยู่จัดส่ง ──                  │
│  ┌─────────────────────────────┐    │
│  │ 📍 123/4 ซ.5 กรุงเทพ       │    │
│  │    ⭐ ค่าเริ่มต้น             │    │  ← badge เล็ก
│  │               [แก้ไข] [ลบ]  │    │
│  ├─────────────────────────────┤    │
│  │ 📍 456 ม.7 เชียงใหม่        │    │
│  │          [ตั้งเป็นค่าเริ่มต้น]  │    │
│  │               [แก้ไข] [ลบ]  │    │
│  ├─────────────────────────────┤    │
│  │ ➕ เพิ่มที่อยู่ใหม่            │    │  ← border-dashed
│  └─────────────────────────────┘    │
│                                     │
│  ── เมนู ──                          │
│  ┌─────────────────────────────┐    │
│  │ 📋 คำสั่งซื้อของฉัน         > │    │  ← Link to /orders
│  ├─────────────────────────────┤    │
│  │ 🚪 ออกจากระบบ              > │    │
│  ├─────────────────────────────┤    │
│  │ 🗑 ลบบัญชี                  > │    │  ← text-danger-600
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

---

## 5. Chat Components

### 5.1 ChatWindow

```
Mobile (full screen):
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │ 💬 น้องเอ ผู้ช่วยร้านค้า    ✕  │ │  ← bg-primary-600 text-white
│ │                                 │ │    h-14 px-4
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │ ┌───────────────────┐          │ │  ← Bot: ชิดซ้าย
│ │ │ 🤖 สวัสดีค่ะ       │          │ │    bg-gray-100 rounded-2xl
│ │ │    มีอะไรให้ช่วย    │          │ │    rounded-tl-sm
│ │ │    ไหมคะ?          │          │ │    max-w-[80%] p-3
│ │ └───────────────────┘          │ │
│ │                                 │ │
│ │          ┌───────────────────┐  │ │  ← User: ชิดขวา
│ │          │ มีน้ำอัดลมอะไรบ้าง │  │ │    bg-primary-600 text-white
│ │          └───────────────────┘  │ │    rounded-2xl rounded-tr-sm
│ │                                 │ │
│ │ ┌───────────────────┐          │ │  ← Bot + Product Cards
│ │ │ 🤖 มีหลายยี่ห้อค่ะ │          │ │
│ │ │    แนะนำเลยนะคะ   │          │ │
│ │ └───────────────────┘          │ │
│ │                                 │ │
│ │ ┌─────────────────────────┐    │ │  ← Product card ใน chat
│ │ │ 📷│ โค้ก 330ml           │    │ │    bg-white rounded-xl
│ │ │   │ ฿15.00 / ขวด       │    │ │    border shadow-sm
│ │ │   │ 🟢 มีสินค้า          │    │ │    p-2 flex gap-2
│ │ │   │ [ใส่ตะกร้า]         │    │ │
│ │ └─────────────────────────┘    │ │
│ │ ┌─────────────────────────┐    │ │
│ │ │ 📷│ เป๊ปซี่ 330ml        │    │ │
│ │ │   │ ฿15.00 / ขวด       │    │ │
│ │ │   │ [ใส่ตะกร้า]         │    │ │
│ │ └─────────────────────────┘    │ │
│ │                                 │ │
│ │ ┌──┐┌──┐┌──┐                  │ │  ← Typing indicator
│ │ │ ● ││ ● ││ ● │ (animate)      │ │    แสดงขณะรอ AI ตอบ
│ │ └──┘└──┘└──┘                  │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ ┌───────────────────────┐ ┌──┐ │ │  ← Input area
│ │ │ พิมพ์ข้อความ...        │ │ ➤ │ │ │    bg-white border-t
│ │ └───────────────────────┘ └──┘ │ │    px-4 py-3
│ └─────────────────────────────────┘ │    ปุ่มส่ง: bg-primary-600
└─────────────────────────────────────┘    rounded-full w-10 h-10

Desktop: fixed bottom-right, w-96, h-[600px], rounded-2xl, shadow-2xl
```

### 5.2 Typing Indicator

```tsx
<div className="flex gap-1 p-3 bg-gray-100 rounded-2xl rounded-tl-sm w-16">
  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce
                   [animation-delay:0ms]" />
  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce
                   [animation-delay:150ms]" />
  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce
                   [animation-delay:300ms]" />
</div>
```

---

## 6. Admin Pages

### 6.1 DashboardPage

```
┌─────────────────────────────────────────────────────┐
│ ADMIN LAYOUT                                         │
│ ┌──────────┬────────────────────────────────────────┐│
│ │ SIDEBAR  │  Dashboard                             ││
│ │          │                                        ││
│ │          │  ── Stat Cards (grid 2×2 md:4×1) ──   ││
│ │          │  ┌──────────┐ ┌──────────┐            ││
│ │          │  │ 💰        │ │ 📦        │            ││
│ │          │  │ ยอดขายวันนี้│ │ คำสั่งซื้อใหม่│           ││
│ │          │  │ ฿2,450    │ │ 8 รายการ  │            ││
│ │          │  │ ↑12%      │ │ ↑3        │            ││  ← เทียบเมื่อวาน
│ │          │  └──────────┘ └──────────┘            ││
│ │          │  ┌──────────┐ ┌──────────┐            ││
│ │          │  │ 👥        │ │ ⚠️        │            ││
│ │          │  │ สมาชิก    │ │ สินค้าใกล้หมด│          ││
│ │          │  │ 156 คน   │ │ 5 รายการ  │            ││
│ │          │  └──────────┘ └──────────┘            ││
│ │          │                                        ││
│ │          │  ── กราฟยอดขาย 7 วัน ──                ││
│ │          │  ┌────────────────────────────────┐    ││
│ │          │  │   ╭─╮                          │    ││  ← Recharts: AreaChart
│ │          │  │ ╭─╯ ╰──╮    ╭──╮              │    ││    fill primary-100
│ │          │  │─╯       ╰──╯    ╰─            │    ││    stroke primary-600
│ │          │  │ จ   อ   พ   พฤ  ศ   ส   อา    │    ││
│ │          │  └────────────────────────────────┘    ││
│ │          │                                        ││
│ │          │  ── สินค้าขายดี Top 5 ──               ││
│ │          │  ┌────────────────────────────────┐    ││
│ │          │  │ 1. โค้ก 330ml         42 ชิ้น  │    ││  ← ตาราง simple
│ │          │  │ 2. มาม่า หมูสับ       38 ซอง  │    ││
│ │          │  │ 3. เลย์ คลาสสิค      25 ถุง  │    ││
│ │          │  │ 4. นมหนองโพ          22 กล่อง │    ││
│ │          │  │ 5. ทิชชู่ Scott       18 ม้วน │    ││
│ │          │  └────────────────────────────────┘    ││
│ │          │                                        ││
│ └──────────┴────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

Stat Card component:
```tsx
<div className="bg-white rounded-2xl border border-gray-100 p-5">
  <div className="flex items-center justify-between mb-3">
    <div className="w-10 h-10 rounded-xl bg-primary-50
                    flex items-center justify-center">
      <Icon className="w-5 h-5 text-primary-600" />
    </div>
    {trend && (
      <span className={`text-xs font-medium ${
        trend > 0 ? 'text-success-600' : 'text-danger-600'
      }`}>
        {trend > 0 ? '↑' : '↓'}{Math.abs(trend)}%
      </span>
    )}
  </div>
  <p className="text-sm text-gray-500">{label}</p>
  <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
</div>
```

### 6.2 Admin ProductsPage

```
┌────────────────────────────────────────────────────┐
│ จัดการสินค้า                     [+ เพิ่มสินค้า]    │
│                                                    │
│ ┌──────────────────────────────────────────────┐   │
│ │ 🔍 ค้นหาสินค้า...    หมวดหมู่: [ทั้งหมด ▾]   │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ ┌──────────────────────────────────────────────┐   │
│ │ สินค้า          หมวดหมู่   ราคา  สต็อก สถานะ  │   │  ← Table header
│ ├──────────────────────────────────────────────┤   │    bg-gray-50
│ │ 📷 โค้ก 330ml   เครื่องดื่ม  ฿15   50  🟢    │   │
│ │                              [แก้ไข] [ลบ]   │   │
│ ├──────────────────────────────────────────────┤   │
│ │ 📷 เป๊ปซี่ 330ml เครื่องดื่ม  ฿15   3   🟡    │   │  ← สต็อกต่ำ: text-warning
│ │                              [แก้ไข] [ลบ]   │   │
│ ├──────────────────────────────────────────────┤   │
│ │ 📷 แฟนต้า ส้ม   เครื่องดื่ม  ฿15   0   🔴    │   │  ← หมด: text-danger
│ │                              [แก้ไข] [ลบ]   │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ Mobile: แสดงเป็น card list แทนตาราง                 │
│ ┌──────────────────────┐                           │
│ │ 📷│ โค้ก 330ml        │                           │
│ │   │ เครื่องดื่ม > น้ำอัดลม│                         │
│ │   │ ฿15  สต็อก: 50   │                           │
│ │   │ 🟢 Active        │                           │
│ │   │     [แก้ไข] [ลบ] │                           │
│ └──────────────────────┘                           │
└────────────────────────────────────────────────────┘
```

### 6.3 Admin ProductForm (Modal/Page)

```
┌────────────────────────────────────────────────────┐
│ เพิ่มสินค้าใหม่                                ✕   │
├────────────────────────────────────────────────────┤
│                                                    │
│ ┌──────────────────┬──────────────────┐            │
│ │ 🤖 AI Import     │ ✏️ กรอกเอง       │            │  ← Tabs
│ └──────────────────┴──────────────────┘            │
│                                                    │
│ ── Tab: AI Import ──                               │
│                                                    │
│ อัปโหลดรูปสินค้า                                    │
│ ┌──────────────────────────────────────┐           │
│ │                                      │           │  ← drag-drop zone
│ │    📷 ลากไฟล์มาวาง                    │           │    border-dashed
│ │    หรือกดเพื่อเลือกรูป                 │           │    border-2
│ │                                      │           │
│ └──────────────────────────────────────┘           │
│                                                    │
│ หรือ วางข้อความรายละเอียดสินค้า                      │
│ ┌──────────────────────────────────────┐           │
│ │ paste ข้อมูลจาก supplier...          │           │  ← textarea rows=4
│ └──────────────────────────────────────┘           │
│                                                    │
│ ┌──────────────────────────────────────┐           │
│ │  🤖 Generate with AI                 │           │  ← bg-purple-600
│ └──────────────────────────────────────┘           │    text-white
│                                                    │
│ ── ผลลัพธ์จาก AI (auto-fill ฟอร์มด้านล่าง) ──      │
│                                                    │
│ ── Tab: กรอกเอง (หรือผลจาก AI) ──                   │
│                                                    │
│ ชื่อสินค้า *          [AI Generated] badge          │
│ ┌──────────────────────────────────────┐           │
│ │ โค้ก ออริจินัล 330ml                   │           │
│ └──────────────────────────────────────┘           │
│                                                    │
│ หมวดหมู่ *                                         │
│ ┌──────────────────────────────────────┐           │
│ │ เครื่องดื่ม > น้ำอัดลม            ▾   │           │  ← dropdown
│ └──────────────────────────────────────┘           │
│                                                    │
│ รายละเอียดสินค้า                                    │
│ ┌──────────────────────────────────────┐           │
│ │ น้ำอัดลมรสชาติดั้งเดิม...             │           │
│ └──────────────────────────────────────┘           │
│                                                    │
│ คำโฆษณา                    [AI Generated]          │
│ ┌──────────────────────────────────────┐           │
│ │ ดื่มเย็นๆ สดชื่นตลอดวัน...           │           │
│ └──────────────────────────────────────┘           │
│                                                    │
│ รูปภาพสินค้า                                       │
│ ┌──────┐                                          │
│ │  📷  │  [เปลี่ยน] [ลบ]                           │
│ └──────┘                                          │
│                                                    │
│ ── Variants ──                                     │
│ ┌──────────────────────────────────────────────┐   │
│ │ Variant 1                             [🗑]   │   │
│ │ ราคา*: [15.00]  สต็อก*: [50]                 │   │
│ │ SKU: [COKE-330]  Unit: [ขวด]                 │   │
│ │ ขนาด: [330ml]    สี: [-]                     │   │
│ ├──────────────────────────────────────────────┤   │
│ │ ➕ เพิ่ม Variant                              │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ ┌───────────────────┐ ┌───────────────────┐        │
│ │     ยกเลิก         │ │   บันทึกสินค้า     │        │
│ │ border-gray-300    │ │ bg-success-600    │        │
│ └───────────────────┘ └───────────────────┘        │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 6.4 Admin OrdersPage

```
┌────────────────────────────────────────────────────┐
│ จัดการคำสั่งซื้อ                                     │
│                                                    │
│ ┌──────┬──────┬──────┬──────┬──────┬──────┐        │
│ │ทั้งหมด│รอชำระ│ชำระแล้ว│เตรียม │จัดส่ง │สำเร็จ │        │  ← Filter tabs
│ │ (42) │ (5)  │ (12) │ (3)  │ (8)  │ (14) │        │    active: border-b-2
│ └──────┴──────┴──────┴──────┴──────┴──────┘        │    border-primary
│                                                    │
│ ┌──────────────────────────────────────────────┐   │
│ │ #A0042  สมชาย  ฿52   🟡 รอชำระ  17 ก.พ.     │   │
│ │                                    [จัดการ >]│   │
│ ├──────────────────────────────────────────────┤   │
│ │ #A0041  สมหญิง ฿120  🟢 ชำระแล้ว  15 ก.พ.    │   │
│ │                                    [จัดการ >]│   │
│ └──────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

### 6.5 Admin OrderDetailPage

```
┌────────────────────────────────────────────────────┐
│ ← ย้อนกลับ    คำสั่งซื้อ #A0042                      │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌─ ข้อมูลลูกค้า ──────────────────────────┐      │
│  │ 👤 สมชาย ใจดี                            │      │
│  │    081-234-5678                          │      │
│  │ 📍 123/4 ซ.5 กรุงเทพ 10110              │      │
│  └──────────────────────────────────────────┘      │
│                                                    │
│  ┌─ รายการสินค้า ───────────────────────────┐      │
│  │ โค้ก 330ml           ×2       ฿30.00    │      │
│  │ เลย์ คลาสสิค         ×1       ฿22.00    │      │
│  │ ─────────────────────────────────────── │      │
│  │ รวม                           ฿52.00    │      │
│  └──────────────────────────────────────────┘      │
│                                                    │
│  ┌─ อัปเดตสถานะ ────────────────────────────┐     │
│  │                                           │     │
│  │ สถานะปัจจุบัน: 🟢 ชำระแล้ว                 │     │
│  │                                           │     │
│  │ เปลี่ยนสถานะเป็น:                          │     │
│  │ ┌─────────────────────────────────┐       │     │
│  │ │ เตรียมจัดส่ง                   ▾ │       │     │  ← dropdown
│  │ └─────────────────────────────────┘       │     │
│  │                                           │     │
│  │ หมายเลข tracking:                          │     │
│  │ ┌─────────────────────────────────┐       │     │
│  │ │ TH123456789                     │       │     │
│  │ └─────────────────────────────────┘       │     │
│  │                                           │     │
│  │ ชื่อขนส่ง:                                 │     │
│  │ ┌─────────────────────────────────┐       │     │
│  │ │ Kerry Express                ▾  │       │     │
│  │ └─────────────────────────────────┘       │     │
│  │                                           │     │
│  │ ┌─────────────────────────────────┐       │     │
│  │ │       บันทึกการเปลี่ยนแปลง       │       │     │  ← bg-primary-600
│  │ └─────────────────────────────────┘       │     │
│  │                                           │     │
│  │ ┌─────────────────────────────────┐       │     │
│  │ │       ยกเลิกคำสั่งซื้อ            │       │     │  ← bg-white
│  │ └─────────────────────────────────┘       │     │    border-danger
│  └───────────────────────────────────────────┘     │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 6.6 Admin MembersPage

```
┌────────────────────────────────────────────────────┐
│ จัดการสมาชิก                                        │
│                                                    │
│ 🔍 ค้นหาชื่อ หรือ เบอร์โทร...                       │
│                                                    │
│ ┌──────────────────────────────────────────────┐   │
│ │ ชื่อ           เบอร์โทร    Role   สถานะ      │   │
│ ├──────────────────────────────────────────────┤   │
│ │ สมชาย ใจดี    081-234-5678  user   🟢 ใช้งาน │   │
│ │                        [เปลี่ยน role] [ระงับ] │   │
│ ├──────────────────────────────────────────────┤   │
│ │ สมหญิง รักดี  089-876-5432  user   🟢 ใช้งาน │   │
│ │                        [เปลี่ยน role] [ระงับ] │   │
│ ├──────────────────────────────────────────────┤   │
│ │ ผู้ดูแล        099-999-9999  admin  🟢 ใช้งาน │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ แสดง 1-10 จาก 156 รายการ   [< 1 2 3 ... 16 >]     │
└────────────────────────────────────────────────────┘
```

### 6.7 Admin ChatbotSettingsPage

```
┌────────────────────────────────────────────────────┐
│ ตั้งค่าแชทบอท                                       │
├────────────────────────────────────────────────────┤
│                                                    │
│ ┌─ เลือกหมวดหมู่ ──────┐ ┌─ ทดสอบแชทบอท ────────┐│
│ │                       │ │                       ││
│ │ ┌───────────────────┐ │ │ (Chat window จำลอง)   ││
│ │ │ 🥤 เครื่องดื่ม  ✓  │ │ │                       ││
│ │ ├───────────────────┤ │ │ 🤖 สวัสดีค่ะ...       ││
│ │ │ 🍪 ขนมขบเคี้ยว    │ │ │                       ││
│ │ ├───────────────────┤ │ │         ทดสอบ 👤      ││
│ │ │ 🧹 ของใช้ในบ้าน   │ │ │                       ││
│ │ ├───────────────────┤ │ │ 🤖 ตอบจาก prompt     ││
│ │ │ 🍜 อาหารสำเร็จรูป │ │ │    ที่ตั้งค่าไว้...     ││
│ │ └───────────────────┘ │ │                       ││
│ │                       │ │ ┌───────────────┐ ┌──┐││
│ │ ── Category Prompt ── │ │ │ พิมพ์ทดสอบ... │ │➤ │││
│ │                       │ │ └───────────────┘ └──┘││
│ │ ┌───────────────────┐ │ │                       ││
│ │ │ ให้แนะนำสินค้า     │ │ └───────────────────────┘│
│ │ │ ด้วยน้ำเสียงสดใส  │ │                          │
│ │ │ เสนอสินค้าขายดี    │ │                          │
│ │ │ ในหมวดนี้ก่อน...   │ │                          │
│ │ └───────────────────┘ │                          │
│ │   textarea rows=6     │                          │
│ │                       │                          │
│ │ ── สินค้าเฉพาะ ──     │                          │
│ │ ┌───────────────────┐ │                          │
│ │ │ ▸ โค้ก 330ml       │ │                          │
│ │ │   "ถ้าถามถึงโค้ก   │ │                          │
│ │ │    แนะนำโปร 2แถม1" │ │                          │
│ │ │                    │ │                          │
│ │ │ ▸ เป๊ปซี่ 330ml    │ │                          │
│ │ │   (ยังไม่มีคำสั่ง)   │ │                          │
│ │ └───────────────────┘ │                          │
│ │                       │                          │
│ │ [คืนค่าเริ่มต้น] [บันทึก]│                         │
│ └───────────────────────┘                          │
└────────────────────────────────────────────────────┘
```

### 6.8 Admin ReportsPage

```
┌────────────────────────────────────────────────────┐
│ รายงานยอดขาย                                        │
├────────────────────────────────────────────────────┤
│                                                    │
│ ┌──────────────────────────────────────────────┐   │
│ │ ช่วงวันที่: [01/02/2569] ถึง [17/02/2569]    │   │
│ │ หมวดหมู่: [ทั้งหมด ▾]                         │   │
│ │                              [🔍 ดึงรายงาน]  │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ ── สรุป ──                                          │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐      │
│ │ ยอดขายรวม  │ │จำนวนคำสั่งซื้อ│ │ ค่าเฉลี่ย/ออเดอร์│     │
│ │ ฿24,500   │ │ 186 รายการ │ │ ฿131.72    │      │
│ └────────────┘ └────────────┘ └────────────┘      │
│                                                    │
│ ── กราฟยอดขายรายวัน ──                               │
│ ┌──────────────────────────────────────────────┐   │
│ │  ▓                                           │   │  ← Recharts: BarChart
│ │  ▓     ▓           ▓                         │   │    fill primary-500
│ │  ▓  ▓  ▓     ▓     ▓  ▓                     │   │
│ │  ▓  ▓  ▓  ▓  ▓  ▓  ▓  ▓  ▓                 │   │
│ │  1  2  3  4  5  6  7  8  9  ...              │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ ── รายละเอียดคำสั่งซื้อ ──                            │
│ ┌──────────────────────────────────────────────┐   │
│ │ เลขที่    ลูกค้า    ยอด    สถานะ    วันที่    │   │
│ ├──────────────────────────────────────────────┤   │
│ │ #A0042  สมชาย    ฿52   ชำระแล้ว  17ก.พ.    │   │
│ │ #A0041  สมหญิง  ฿120  จัดส่งแล้ว 15ก.พ.    │   │
│ │ ...                                          │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ [Empty: "ไม่พบข้อมูลในช่วงเวลาที่เลือก"]             │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## 7. Responsive Rules

```
Mobile (< 768px):
- max-w-lg mx-auto สำหรับ customer pages
- Bottom navigation แทน sidebar
- ตารางเปลี่ยนเป็น card list
- Chat window เต็มจอ
- Cart เป็น full-screen drawer
- Product grid: 2 columns
- Admin sidebar ซ่อน → bottom nav + hamburger menu

Tablet (768px - 1024px):
- Product grid: 3 columns
- Admin sidebar แสดง icons only (collapsed)
- Cart drawer: w-96

Desktop (> 1024px):
- Product grid: 4 columns
- Admin sidebar แสดงเต็ม (w-60)
- Chat window: fixed bottom-right w-96 h-[600px]
- Cart drawer: w-96
```

---

## 8. Animation & Transitions

```tsx
// ใช้ Tailwind transitions:

// Page transition
className="animate-in fade-in duration-200"

// Modal overlay
className="animate-in fade-in duration-200"
// Modal content
className="animate-in slide-in-from-bottom duration-300"

// Cart drawer
className="animate-in slide-in-from-right duration-300"

// Chat window (mobile)
className="animate-in slide-in-from-bottom duration-300"

// Toast notification
className="animate-in slide-in-from-top fade-in duration-300"

// Button press
className="active:scale-95 transition-transform"

// OTP error shake
className="animate-shake"
// @keyframes shake { 0%,100%{translateX(0)} 25%{translateX(-8px)} 75%{translateX(8px)} }

// Success checkmark
className="animate-in zoom-in duration-500"

// Skeleton loading
className="animate-pulse"

// Typing indicator dots
className="animate-bounce"
```

---

## 9. Toast Notifications

```
ตำแหน่ง: fixed top-4 right-4 z-50

Success (เพิ่มตะกร้า, บันทึกสำเร็จ):
┌──────────────────────┐
│ ✅ เพิ่มลงตะกร้าแล้ว  │  bg-success-50 border border-success-200
│                      │  text-success-800 rounded-xl p-3
└──────────────────────┘  auto-dismiss 3 วินาที

Error:
┌──────────────────────┐
│ ❌ เกิดข้อผิดพลาด     │  bg-danger-50 border border-danger-200
│    กรุณาลองใหม่       │  text-danger-800
└──────────────────────┘

Warning:
┌──────────────────────┐
│ ⚠️ สินค้าบางรายการ    │  bg-warning-50 border border-warning-200
│    หมดสต็อก           │  text-warning-800
└──────────────────────┘
```
