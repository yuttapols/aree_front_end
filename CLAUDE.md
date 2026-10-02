# CLAUDE.md

คำแนะนำนี้ให้ Claude Code ใช้เป็นบริบทเวลาทำงานกับโปรเจกต์นี้

## ภาพรวมโปรเจกต์
- ชื่อโปรเจกต์: aree-front-end (ร้านโรตี5ดาว / 5-Star Roti)
- คำอธิบายสั้น ๆ: ระบบหน้าร้าน + สมาชิก + สะสมแต้ม + โปรโมชั่น + หลังร้าน (POS, คิวครัว, ตรวจสลิป, จัดการเมนู, Dashboard) รองรับ 2 ภาษา (ไทย/อังกฤษ) และธีมสว่าง/มืด ดีไซน์โทนม่วง-ส้ม ทำครบทั้ง 4 Phase ตามเอกสาร requirement แล้ว (ใช้ mock backend)
- Stack หลัก: Angular 21 (standalone, zoneless, signals), TypeScript, Tailwind CSS v4, PrimeNG 21 + @primeuix/themes (Aura preset), PrimeIcons, chart.js (ผ่าน `p-chart`), qrcode

## Requirement (อ่านก่อนเริ่มทำฟีเจอร์ใหม่ทุกครั้ง)
- เอกสาร requirement / system design อยู่ที่ **`C:\GIT\DOCUMENT\aree_document\roti-5dao`**
  - `README.md` — สรุป 4 Phase และรายการ Flyway migration
  - `docs/01-overview.md` — Actor/Role (GUEST, CUSTOMER, STAFF, ADMIN), business rules (สมาชิก, walk-in, ออเดอร์, การชำระเงิน, แต้ม, โปรโมชั่น)
  - `docs/02-database.md` + `db/migration/*.sql` — โครงสร้างตาราง (ใช้ออกแบบ model ฝั่ง FE ให้ตรงกับ BE)
  - `docs/03-backend.md` — API ทั้งหมดแยก Phase, `ApiResponse` format, `ErrorCode`
  - `docs/04-frontend.md` — โครงสร้าง FE, shared components, routes, หน้าจอแต่ละ Phase
  - `docs/05-phase-plan.md` — แผน Phase + Definition of Done
- ก่อนทำฟีเจอร์ใหม่ให้เปิดเอกสารที่เกี่ยวข้องก่อนเสมอ แล้วทำให้ตรง business rule / API / ชื่อฟิลด์ในเอกสาร
- **UI ให้คงแบบปัจจุบันของโปรเจกต์นี้** (โทนม่วง-ส้ม ฟอนต์ Kanit/Prompt, layout ตามหัวข้อ "การตัดสินใจด้านดีไซน์") ถ้าเอกสารระบุธีม/ฟอนต์ต่างออกไป (เช่น amber, Noto Sans Thai) ให้ยึด UI ปัจจุบัน
- ถ้า requirement ขัดกับสิ่งที่ผู้ใช้สั่งไว้ในโปรเจกต์นี้ ให้ถามผู้ใช้ก่อน อย่าเปลี่ยนเอง

## คำสั่งที่ใช้บ่อย
- ติดตั้ง dependency: `npm install`
- รันเซิร์ฟเวอร์ dev: `npm start` (http://localhost:4200)
- รันเทส: `npm test` (ยังไม่มีไฟล์เทส สร้างโปรเจกต์ด้วย `--skip-tests`)
- build โปรเจกต์: `npm run build`
- lint / format: `npx prettier --write "src/**/*.{ts,html,css}"`

## Backend / Mock API
- FE เรียก API จริงตาม path/contract ใน `docs/FRONTEND_API_PROMPT.md` (backend repo `aree_back_end`) ผ่าน `ApiClient` เสมอ — ตอนนี้ยังไม่มี backend จริงจึงมี **mock backend เป็น HTTP interceptor** (`core/mock-api/`) ตอบแทน โดยปรับ field name/endpoint/shape ของ mock ให้ตรงกับคอนแทร็กต์นั้นแล้ว (ดู `D:\GIT\DOCUMENT\aree_document\roti-5dao\docs\06-frontend-status.md` สำหรับรายการที่ยังต่างกัน/ต้องคุยกับ BE)
- สวิตช์อยู่ที่ `src/environments/environment.ts`: `{ apiHost, apiBaseUrl, useMockApi, mockLatencyMs }` — ตั้ง `useMockApi: false` และ `apiHost` เป็น URL backend จริงเมื่อพร้อม (โค้ดหน้าจอไม่ต้องแก้)
- mock ทำ business rule ตามเอกสาร: pricing pipeline (subtotal → โปร → แลกแต้ม → total → แต้มที่จะได้), โปร 4 ประเภท (auto-apply / โค้ด, ซ้อน POINT_MULTIPLIER ได้), แต้ม ledger + FIFO + หมดอายุ + คืนแต้มตอนยกเลิก, state machine ออเดอร์ (`CONFIRMED`/`PREPARING` อนุญาตกระโดดตรงไป `COMPLETED` ได้เพื่อรองรับปุ่ม "เสร็จสิ้น" ของหน้าวันนี้ — ไม่ต้องผ่านคิวครัวทีละสถานะ), จ่ายผสม, ตรวจสลิป (อัปโหลดจริงแบบ multipart, ดูรูปผ่าน blob + Bearer), `order_no` `R5D-YYMMDD-NNNN` + เลขคิวรายวัน, JWT mock (access CUSTOMER 5 นาที / STAFF-ADMIN 15 นาที + refresh session + idle timeout ตาม role), role STAFF/ADMIN, บังคับเปลี่ยนรหัสผ่านครั้งแรก (`passwordChangeRequired`) สำหรับบัญชีที่สร้างด้วยรหัสชั่วคราว
- ข้อมูล mock เก็บใน localStorage `roti.mock.db` (seed ใหม่อัตโนมัติเมื่อเปลี่ยน `SCHEMA_VERSION` ใน `mock-db.ts`, ตอนนี้ = 6) — seed มีเมนู (รวมหมวด `roti` 6 เมนู + กลุ่ม "ท็อปปิ้ง" 12 รายการ 0–10 ตาม `V10__default_roti_menu.sql`), โปร 6 ตัว, ออเดอร์ย้อนหลัง 30 วัน, ออเดอร์วันนี้ในคิวครัว + สลิปรอตรวจ
- บัญชีทดลอง (`core/data/demo-accounts.ts`, แสดงบนหน้า login เมื่อ `useMockApi`): ลูกค้า `0812345678` / `roti1234`, พนักงาน `0800000002` / `staff1234`, เจ้าของร้าน `0800000001` / `admin1234`
- หน้า "วันนี้" ดึงคิวรอ (`PENDING_PAYMENT`) จาก `GET /admin/orders?status=PENDING_PAYMENT&date=...` โดยตรง ไม่ได้พึ่ง field พิเศษใน `TodayResponse` อีกต่อไป (ตอนนี้ `TodayResponse` = `{ date, ordersByStatus, completedCount, netSales, pendingPayments, lastQueueNo }` ตรงตามคอนแทร็กต์)
- จุดที่ FE ยังต่างจากเอกสาร BE (ต้องคุยกับ BE — รายละเอียดใน `06-frontend-status.md`): ชื่อ/คำอธิบายภาษาอังกฤษ (`nameEn`, `descriptionEn`), สีจาน `palette`, `rating/reviews`, `badge`, `originalPrice` ใน product; `guestPhone` ไม่บังคับตอน checkout (ต่างจากคอนแทร็กต์); `OrderResponse.customer` ขอเพิ่ม `memberCode`; `PaymentMethodResponse` ขอเพิ่ม `bankAccount`; field `preparingAt`/`readyAt`/`appliedPromotions`/`paymentMethodCode`/`pointsToEarn` บน `OrderResponse` ที่ FE ใช้อยู่แต่สรุปคอนแทร็กต์ไม่ได้เอ่ยถึง

## โครงสร้างโค้ด
- `src/environments/environment.ts` — `apiBaseUrl`, `useMockApi`, `mockLatencyMs`
- `src/app/core/` — singleton ระดับแอป
  - `api/api-client.ts` — `get/post/put/patch/delete/upload` unwrap `ApiResponse<T>`, option `{ silent, background, skipAuthRetry }`
  - `api/models/` — DTO ตามเอกสาร (`common`, `user`, `catalog`, `order`, `loyalty`, `dashboard`) + `ErrorCode`, `ApiException`
  - `api/services/` — `CatalogApi`, `OrderApi`, `UserApi`, `PromotionApi`, `DashboardApi` (แทน generated client จาก OpenAPI)
  - `http/` — `loadingInterceptor` (+ `LoadingService` แถบโหลดด้านบน), `errorInterceptor` (map `error.code` → ข้อความ i18n → toast, ข้ามได้ด้วย `silent`)
  - `auth/` — `AuthStore` (signals: user, token ใน memory, role), `AuthService` (login/register/refresh/logout, `landingPathFor(role)`), `authInterceptor` (แนบ Bearer, 401 `TOKEN_EXPIRED` → refresh แล้ว retry 1 ครั้ง), `guards.ts` (`authGuard`, `guestOnlyGuard`, `roleGuard(...roles)` — ทั้ง `authGuard`/`roleGuard` เด้งไป `/change-password` ก่อนถ้า `user.passwordChangeRequired` เป็น true), `token-expiry.ts` — AuthService ตั้งเวลา refresh ก่อน token หมด 1 นาที (+ เช็กตอนกลับมาที่แท็บ) และ 401 ใด ๆ ที่มี token จะลอง refresh ก่อน; นอกจากนี้ยังมี idle-timeout ตาม role (CUSTOMER 15 นาที, STAFF/ADMIN 12 ชม. ไม่มีการคลิก/พิมพ์) ถ้าเกินจะ clear session ทันทีแม้ token ยังไม่หมดอายุ ถ้า session หลุดจะ clear store (navbar กลับเป็นปุ่ม "ลงทะเบียน") และพาไป `/login` เฉพาะตอนอยู่ `/profile` หรือ `/backoffice` — `provideAppInitializer` เรียก `restoreSession()`
  - `mock-api/` — `mock-api.interceptor.ts` (โหลด mock แบบ lazy `import()` เฉพาะตอน `useMockApi` — ห้าม import `mock-backend` ตรงจากโค้ดอื่น), `mock-backend.ts` (router), `mock-db.ts`, `mock-domain.ts` (business logic), `mock-seed.ts`, `seed/catalog.seed.ts`, `handlers/*`
  - `catalog/` — `CatalogStore` (โหลด `/public/menu` + โปร → `MenuItem`), `catalog.mapper.ts`
  - `cart/cart.service.ts` — ตะกร้า signals + persist `roti.cart` + `requestItems` (`CartItemRequest[]`)
  - `shop/shop-info.store.ts` — ข้อมูลร้าน/เวลาเปิด
  - `menu/` — `MenuFilterService`, `FavoritesService`
  - `i18n/` — `I18nService` (`t`, `text`, `pick(th, en)`, `name(entity)`, `error(code)`), `translations.ts` รวม `dictionaries/*` (storefront, common, errors, ordering, loyalty, backoffice)
  - `data/` — `menu.data.ts` (hero slides, palette สำรอง), `demo-accounts.ts`
  - `theme/` — `ThemeService`, `roti-preset.ts`
- `src/app/shared/`
  - `components/` — `price`, `qty-stepper`, `food-plate`, `chip`, `rating`, `icon-button`, `lang-switch`, `cta-link`, `order-line`, `summary-row`, `breadcrumbs`, `page-header`, `form-field`, `auth-card`, `points-chip`, `stat-card` (มี delta), `panel`, `empty-state`, `loading-skeleton`, `status-tag`, `avatar`, `search-box`, `category-tabs`, `phone-input`, `password-input`, `image-upload`, `data-table`, `option-selector`, `item-options-dialog`, `order-summary`, `payment-method-picker` (+ PromptPay QR), `cash-calculator`, `order-timeline`, `member-lookup`, `promo-card`, `promo-code-input`, `point-redeem`, `date-range-filter`, `chart-card`, `side-nav` (sidebar แบบการ์ดลอย พับได้ด้วยปุ่มวงกลมที่ขอบ, `SideNavItem.group` = หัวข้อหมวด, `tone: 'danger'` = ปุ่มสีแดง, slot `[sideNavHeader]` / `[sideNavHeaderCompact]`, ลิงก์ไป `/` ต้องใส่ `exact: true`), `qr-code`, `product-tile`, `receipt`, `receipt-dialog`, `receive-payment-dialog`, `quick-register-dialog`, `account-menu` (ปุ่มบัญชี + dropdown ใหญ่หัวการ์ดม่วง ใช้ร่วมกันทั้ง navbar หน้าร้านและ topbar หลังร้าน ส่ง `items` + `showRole`). `shop-status` (ป้ายเปิด/ปิดรับออเดอร์ = `acceptOnlineOrder && openNow` จาก `ShopInfoStore.acceptingOrders`), `step-progress` (แถบขั้นตอน checkout), `product-image` (รูปสินค้า lazy + fallback เป็น `food-plate` เมื่อไม่มีรูป/รูปเสีย — ใช้แทน `<img>` ของสินค้าทุกที่), `brand-logo` (โลโก้ร้านจริง `public/brand/logo.webp` ใช้ใน navbar, topbar หลังร้าน, footer, auth-card, settle-confirm-dialog — กำหนดขนาดด้วย class ความสูงบน host เช่น `h-16`)
  - `pipes/` — `money` (฿1,234.00), `thaiDate`
  - `services/confirm.service.ts` — `ConfirmService.ask()` (ครอบ ConfirmationService)
  - `services/sign-out.service.ts` + `components/sign-out-dialog` — **ออกจากระบบทุกจุดต้องเรียก `SignOutService.request()`** (เปิด Modal ยืนยันหัวม่วง ไอคอนแดง ที่วางไว้ครั้งเดียวใน `app.ts`) ห้ามเรียก `AuthService.logout()` ตรงจากปุ่ม; เมนูออกจากระบบใน dropdown ใช้ `styleClass: 'menu-danger'` และใน sidebar ใช้ `tone: 'danger'` (สีแดงตลอด)
  - `utils/` — `sanitize` (`TEXT_LIMITS` ตามคอนแทร็กต์, `cleanText`, `cleanCode`, `containsMarkup`, `safeInternalPath`, `isTrackingToken`), `password` (`generateTemporaryPassword`), `format` (`formatMoney`, `formatDate`, `formatPhone`, `percentChange`, ...), `validators` (`textField(max, required)` = maxLength + `safeText`, `safeText`, `productCode`, `paymentMethodCode`, `requiredText`, `thaiPhone`, `optionalEmail`, `phoneOrEmail`, `matchField`, `validationMessage`), `options`, `order-lines`, `promotion`, `promptpay`, `image` (บีบอัดรูป), `crud-store` (`createCrudStore`), `price`, `storage`
- `src/app/layout/` — `public-layout` (navbar + outlet + cart drawer), `backoffice-layout` (topbar + side-nav ตาม role), `navbar`, `footer`
- `src/app/features/`
  - `landing/` — หน้าแรก + `/menu/:categorySlug`
  - `login/`, `register/` — (guestOnly)
  - `cart/` — `cart-panel`, `cart-actions.service` (เมนูที่มีตัวเลือกบังคับจะเปิด dialog แทนการเพิ่มตรง)
  - `checkout/` — `/checkout`, `/track/:token` (ติดตามออเดอร์ + แนบสลิป + polling 10 วิ)
  - `promotions/` — `/promotions`, `/promotions/:id`
  - `profile/` — `/profile` (authGuard): แดชบอร์ด, รายละเอียดสมาชิก (แก้โปรไฟล์ / avatar / QR member code / เปลี่ยนรหัสผ่าน), ออเดอร์ของฉัน, แต้มของฉัน
  - `backoffice/` — `/backoffice` (roleGuard STAFF/ADMIN): today, pos (+ `PosStore`), kitchen, orders, payments/pending, customers — ADMIN เท่านั้น: dashboard, catalog (products / categories / option-groups), promotions, staff, settings
  - `errors/status-page.ts` — `/forbidden`, 404
- `public/` — `favicon.ico` (16/32/48), `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png`, `brand/logo.webp` — ตัดพื้นหลังออกจากชุดแบรนด์ `C:GITFRONT-ENDRotee5Stars_Branding` (ไฟล์ในชุดนั้นส่วนใหญ่เป็นภาพ crop จาก brand board มีป้ายกำกับติดมา ใช้ตรง ๆ ไม่ได้; palette เหลือง-น้ำตาลในชุดนั้นยังไม่ได้นำมาใช้ UI ยังเป็นม่วง-ส้ม)
- `src/styles.css` — Tailwind, CSS variables ของธีม, utility (`animate-float`, `animate-pop`, `animate-loading-bar`, `bg-royal`), print style (`.print-area` สำหรับใบเสร็จ)

## Coding Style / Convention
- **ห้ามเขียน comment ในโค้ด** ทุกไฟล์ (ts, html, css) ตั้งชื่อตัวแปร/ฟังก์ชันให้สื่อความหมายแทน
- **ฟังก์ชันหรือ UI ที่ใช้บ่อย / ใช้มากกว่า 1 ที่ ต้องแยกเป็น shared** — UI ไว้ที่ `shared/components/`, ฟังก์ชันไว้ที่ `shared/utils/` ก่อนเขียนใหม่ให้เช็กของเดิมใน `shared/` ก่อนเสมอ
- TypeScript strict mode, standalone component เท่านั้น (ไม่ใช้ NgModule ของตัวเอง)
- ใช้ signals (`signal`, `computed`, `input()`, `output()`, `model()`) และ `inject()` ไม่ใช้ constructor injection / `@Input` / `@Output`
- ใช้ `ChangeDetectionStrategy.OnPush` และ control flow ใหม่ (`@if`, `@for`, `@else`)
- ไฟล์ component ตั้งชื่อ kebab-case ไม่มี suffix `.component` (เช่น `menu-card.ts` → class `MenuCard`), service ใช้ `.service.ts`
- เรียก backend ผ่าน `core/api/services/*` เท่านั้น ห้ามใช้ HttpClient ตรงในหน้าจอ; route param/query ใช้ `input()` (เปิด `withComponentInputBinding` แล้ว)
- ข้อความที่แสดงผลทุกข้อความต้องผ่าน i18n: เพิ่ม key ใน dictionary ที่เกี่ยวข้อง (`core/i18n/dictionaries/*`) ทั้ง th และ en แล้วใช้ `i18n.t('key')` ข้อมูลเมนูใช้ `LocalizedText` + `i18n.text()` ข้อมูลจาก API ที่มี `name/nameEn` ใช้ `i18n.name(entity)` / `i18n.pick(th, en)`
- **ทุกช่องกรอกข้อความต้องมี validate**: ใช้ `textField(TEXT_LIMITS.xxx, required)` (จำกัดความยาว + บล็อก HTML/สคริปต์/อักขระควบคุม) ช่องที่ไม่ใช่ form ให้ส่งผ่าน `cleanText`/`cleanCode` ก่อนยิง API, `returnUrl` ต้องผ่าน `safeInternalPath`, ไฟล์รูปต้องผ่าน `hasImageSignature` (เช็ก magic bytes) — ห้ามใช้ `innerHTML`/`bypassSecurityTrust*`
- อ้างอิงสินค้าใน logic ด้วย `id` เท่านั้น ห้ามใช้ `code` (แอดมินแก้ได้) — ตัวเลือก/ท็อปปิ้งที่ `available:false` ต้องแสดงแบบ disable + ขีดฆ่า ไม่ซ่อน และห้ามเลือกซ้ำ
- error จาก API แสดงด้วย `i18n.error(code)` — ถ้าจะแสดงแบบ inline ให้เรียก API ด้วย `{ silent: true }`
- สีให้ใช้ token ของโปรเจกต์ผ่าน Tailwind (`bg-canvas`, `bg-card`, `text-ink`, `text-ink-muted`, `border-line`, `bg-brand` = ม่วง, `text-on-brand`, `bg-accent` = ส้ม, ...) ห้าม hardcode สีที่ต้องเปลี่ยนตามธีม (ถ้าจำเป็นต้องใส่ `dark:` คู่กัน)
- dark mode ใช้ variant `dark:` (ผูกกับ class `.app-dark`) และ PrimeNG ใช้ `darkModeSelector: '.app-dark'`
- ใช้ component ของ PrimeNG เมื่อมี (Button, Dialog, Drawer, Table, Select, MultiSelect, DatePicker, InputNumber, Tabs, Menu, Tag, Toast, ConfirmDialog, Chart, ...) ปรับหน้าตาด้วย Tailwind / `[dt]`
- หน้าใหม่ที่ไม่ใช่หน้าแรกให้ใช้ `app-page-header` พร้อม breadcrumbs (`Crumb[]`) หัวข้อหน้าเป็น `sr-only`; เนื้อหาเป็นการ์ดใช้ `app-panel`
- `app-page-header` **ไม่มีแถบสีม่วงแล้ว** (breadcrumbs วางบนพื้นปกติ) ความกว้างกำหนดด้วย token `PAGE_HEADER_CONTAINER` หรือ input `container` ของแต่ละหน้า (หน้าที่เนื้อหาแคบต้องส่งให้ตรงกับเนื้อหา) — หน้า login / register **ไม่มี breadcrumbs** (มีแค่ `h1` sr-only) — layout ที่มี sidebar ต้อง provide ค่าให้ตรงกับเนื้อหา (backoffice และ profile ใช้ `px-4 md:px-8`) และทุกหน้าใน layout ที่มี sidebar ต้องใช้ container **เต็มความกว้าง ไม่ใส่ max-w** (`px-4 py-6 md:px-8`) เพื่อให้เนื้อหาขยายตามตอนพับ sidebar
- navbar และ banner ใช้พื้นม่วง `bg-royal` ปุ่มบนพื้นม่วงให้ใช้ `variant="glass"` ของ `app-icon-button` / `app-lang-switch`
- ข้อความที่มีตัวแปรใช้ placeholder `{n}` ใน translations แล้วเรียก `i18n.t(key, { n })`
- รูปแบบ commit message: Conventional Commits เช่น `feat: add checkout page`, `fix: cart total rounding`

## สิ่งที่ควรทำ / ไม่ควรทำ
- ห้ามแก้ไฟล์ใน `node_modules/`, `dist/`, `.angular/`
- ต้องรัน `npm run build` ให้ผ่านก่อน commit ทุกครั้ง
- ห้ามเพิ่ม comment ในโค้ด
- ใช้ branch naming แบบ `feature/<ชื่อสั้น>`, `fix/<ชื่อสั้น>`
- ไฟล์เก่าที่เลิกใช้แล้วแต่ยังไม่ได้ลบ (ถูก exclude ใน `tsconfig.app.json`): `core/member/`, `core/models/member.model.ts`, `core/data/member.data.ts`, `core/order/`, `features/member/`, `features/order-success/`, `shared/components/tier-chip/`, `features/landing/components/item-options-dialog.ts`, `features/backoffice/today/queue-order-dialog.ts` — ห้าม import กลับมาใช้ ลบได้เมื่อผู้ใช้อนุญาต

## สรุปงานที่ทำ

### หน้าร้าน (ลูกค้า)
- **Navbar**: โลโก้, ลิงก์ หน้าแรก / เมนู / โปรโมชั่น (`/promotions`) / ติดต่อ, สลับภาษา, สลับธีม, ตะกร้า, ปุ่มสมาชิก**ขวาสุด** (ยังไม่ login = "ลงทะเบียน" → `/login`; CUSTOMER = avatar + ชื่อ + แต้ม + dropdown ขนาดใหญ่ (หัวเป็นการ์ดม่วง ชื่อ/รหัสสมาชิก/แต้ม) มี 2 รายการ: "รายละเอียดสมาชิก" + รายการที่เปลี่ยนตามหน้า — อยู่ใน `/profile/*` = "กลับไปสั่งอาหาร", อยู่หน้าสั่งอาหาร = "ออกจากระบบ" (สีแดง, class `menu-danger`); STAFF/ADMIN = dropdown "หลังร้าน" + ออกจากระบบ)
- **หน้าแรก**: Banner สไลด์ (โปรโมชั่นจาก API ก่อน แล้วตามด้วย `HERO_SLIDES`) → ช่องค้นหา (อยู่ใน `#menu` เหนือหมวดหมู่) → หมวดหมู่วงกลม + รายการเมนู (ป้าย "โปร" บนเมนูที่ร่วมโปร) → Banner โปรโมชั่น → Footer (ข้อมูลร้านจาก `/public/shop-info` + สถานะเปิด/ปิด)
- **Dialog ตัวเลือก**: `option-selector` ตาม option group (min/max, radio/checkbox) เช่น เครื่องดื่มต้องเลือกความหวาน 1
- **Checkout**: รายการ + ปรับจำนวน, ข้อมูลผู้รับ (ชื่อบังคับ, guest ต้องใส่เบอร์ด้วย), หมายเหตุ, เลือกช่องทางจ่าย (PromptPay มี QR), แนบสลิปได้เลยหรือทีหลัง, โค้ดโปร, แลกแต้ม (สมาชิก), สรุปยอดจาก `/public/orders/quote`
- **ติดตามออเดอร์** `/track/:token`: เลขคิว, สถานะ, timeline, แนบสลิป/ดูผลตรวจสลิป, แต้มที่จะได้เมื่อรับอาหาร
- **โปรโมชั่น** `/promotions`, `/promotions/:id` (เงื่อนไข + เมนูที่ร่วมรายการ + คัดลอกโค้ด)
- **Login** (เบอร์หรืออีเมล + บัญชีทดลอง + checkbox "จดจำบัญชี" = เก็บเบอร์/อีเมลไว้กรอกให้ครั้งหน้า ใน `roti.login.remembered`, ไม่ได้เก็บรหัสผ่าน) / **Register** (ชื่อ-นามสกุล → `nickname`, เบอร์, รหัสผ่าน + ยืนยัน) — login แล้ว CUSTOMER กลับหน้าสั่งอาหาร, STAFF/ADMIN ไป `/backoffice`
- **โปรไฟล์** `/profile` (sidebar พับได้): แดชบอร์ด, รายละเอียดสมาชิก, ออเดอร์ของฉัน, แต้มของฉัน

### หลังร้าน `/backoffice`
- **วันนี้** (`/backoffice/today`): ส่วนบนแบ่งครึ่ง — ซ้ายเป็นการ์ดม่วง "ลำดับที่ถึง" (เลขคิวตัวโต + เลขออเดอร์ + ชื่อ-นามสกุลถ้าเป็นสมาชิก), ขวาเป็น `today/queue-order-panel.ts` แสดงรายการอาหารของคิวนั้น + ยอดรวม + ติ๊กว่าลูกค้าจ่ายด้วย **เงินสด / โอน** → กด **"เสร็จสิ้น"** → Modal ยืนยันขนาดใหญ่ `today/settle-confirm-dialog.ts` (หัวม่วง โลโก้ร้าน (`app-brand-logo`) — ห้ามใช้ไอคอนติ๊กถูกเพราะยังไม่ได้ยืนยัน, แยกบรรทัด คิวที่ / จ่ายด้วย / จำนวนเงิน) → ยืนยันแล้วยิง API มาตรฐานเรียงกัน (ไม่มี endpoint `settle` เฉพาะแล้ว): อนุมัติ/ปฏิเสธสลิป `PENDING` เดิมถ้ามีผ่าน `/admin/payments/{id}/verify` → รับยอดคงเหลือผ่าน `/admin/orders/{id}/payments` (ไม่ส่ง `amount` = จ่ายเต็มยอด) ถ้ายังไม่ครบ → ปิดเป็น COMPLETED ผ่าน `/admin/orders/{id}/status` (ให้แต้มอัตโนมัติ), ใต้ปุ่มเสร็จสิ้นมีปุ่มแดง **"ยกเลิกรายการ"** → Modal `today/cancel-order-dialog.ts` (เลือกเหตุผล: ลูกค้าไม่เอาแล้ว (ค่าเริ่มต้น) / สั่งผิด / ของหมด / อื่น ๆ + ช่องพิมพ์) → `POST /admin/orders/{id}/cancel` (คืนแต้ม/สิทธิ์โปรอัตโนมัติ) แล้วคิวเลื่อนไปคิวถัดไป; ถัดลงมาเป็น "คิวถัดไป" (ไม่รวมคิวที่กำลังทำ กดเพื่อเรียกคิวนั้นขึ้นมาทำก่อน) แล้วเป็น **ขายหน้าร้าน** (`PosPage` แบบ `[embedded]="true"`) ต่อท้ายหน้าเดียวกัน — ปุ่ม "ขายหน้าร้าน" มุมขวาบนแค่เลื่อนลงไปที่ส่วนนี้ (ไม่แยกหน้า), กด "เปิดบิล & เข้าคิว" = สร้างออเดอร์ walk-in (PENDING_PAYMENT) เข้าคิวแล้วรีโหลดคิว ไม่รับเงินตอนนี้ (ไปจ่ายตอนกดเสร็จสิ้น); **ไม่มีส่วนออเดอร์ล่าสุด** — แสดงเฉพาะออเดอร์ที่ยังรอคิว (PENDING_PAYMENT), **ไม่มีการ์ดสถิติ, ไม่มีป้ายช่องทาง (ออนไลน์/หน้าร้าน) ในส่วนคิว, ไม่ยุ่งกับการชำระเงิน (ไม่มี QR / สลิป / ขั้นตอนอนุมัติ)** — `queue-order-dialog.ts` เลิกใช้แล้ว (exclude ใน tsconfig)
- เมนู **คิวครัว ถูกซ่อน** จาก sidebar (`hidden: true` ใน `SideNavItem`) แต่หน้า `/backoffice/kitchen` ยังอยู่
- เมนู **ขายหน้าร้าน ถูกซ่อน** จาก sidebar (`hidden: true`) — route `/backoffice/pos` ยังอยู่ (ถ้าเปิดตรงจะสร้างออเดอร์เข้าคิวแล้วกลับไป `/backoffice/today`); ชื่อเมนูคือ "ขายหน้าร้าน" ไม่มี "(POS)"
- เมนู **ตรวจสลิป ถูกซ่อน** จาก sidebar เช่นกัน (`hidden: true`) — route `/backoffice/payments/pending` ยังอยู่ ใช้งานได้ถ้าลิงก์ตรง
- STAFF: วันนี้, POS (เลือกเมนู, ค้นหาสมาชิก/สมัครให้, โค้ดโปร, แลกแต้ม, รับเงินสด+ทอน/จ่ายผสม, พิมพ์ใบเสร็จ), คิวครัว (Kanban + polling 5 วิ + เสียงแจ้งเตือน), ออเดอร์ (filter + รายละเอียด + เปลี่ยนสถานะ/ยกเลิก/รับเงิน), ตรวจสลิป (เมนูซ่อนแต่หน้ายังอยู่), สมาชิก (ค้นหา, quick register, ประวัติออเดอร์/แต้ม)
- ADMIN เพิ่ม: Dashboard (stat cards เทียบช่วงก่อน, แนวโน้มยอดขาย, ช่วงเวลาขายดี, สินค้าขายดี, ช่องทางจ่าย, หน้าร้าน vs ออนไลน์, สมาชิก vs ทั่วไป), จัดการเมนู (สินค้า + รูป + เปิด/ปิดของหมด, หมวดหมู่ลากจัดลำดับ, กลุ่มตัวเลือก), โปรโมชั่น (ฟอร์มเปลี่ยนตามประเภท + preview + ประวัติการใช้), พนักงาน (เพิ่ม/ระงับ/รีเซ็ตรหัส), ตั้งค่า (ข้อมูลร้าน, กติกาแต้ม, ช่องทางชำระเงิน), ปรับแต้มลูกค้า

### การตัดสินใจด้านดีไซน์ (อย่าเพิ่มกลับโดยไม่ได้รับคำสั่ง)
- **ผู้ใช้สั่งให้คง UI แบบปัจจุบันไว้** — ทำฟีเจอร์ใหม่ตาม requirement แต่ใช้หน้าตา/สี/component style เดิม
- ดีไซน์อ้างอิงแอปสั่งอาหารโทน **ม่วง (brand) + ส้ม (accent)** พื้นหลังครีมอมชมพู ฟอนต์หัวข้อ Kanit ตัวหนา เนื้อหา Prompt
- **ไม่มี**หัวข้อ "เมนูของเรา / เมนูทั้งหมด" — รายการเมนูแสดงต่อจากหมวดหมู่วงกลมเลย
- **ไม่มี**ตะกร้าแบบ sidebar ข้างเมนู — ใช้ปุ่มตะกร้าบน navbar แทน
- **ไม่มี**ส่วน "เมนูยอดนิยม" (Popular Picks), ส่วน "ทำไมต้องโรตี5ดาว / เกี่ยวกับเรา", คำทักทาย "สวัสดี คนรักโรตี" บน navbar
- **ไม่มี**แถบสีม่วงใต้ navbar ในหน้าอื่น ๆ และไม่มีหัวข้อตัวใหญ่ (เหลือแค่ breadcrumbs, `h1` เป็น `sr-only`)
- การ์ดเมนูมีแบบเดียวคือแนวตั้ง (`menu-card`)
- ปุ่มบน navbar ต้องสูงเท่ากันทั้งหมด (`h-12`) และสี navbar ต้องต่างจากพื้น body ชัดเจน (`bg-royal`)
- หน้าสมัคร**ไม่มี**กล่องสิทธิพิเศษ 3 ช่อง และ**ไม่มี**ช่องอีเมล/checkbox PDPA (เอกสาร requirement มีอีเมล optional + PDPA ถ้าจะเพิ่มกลับให้ถามก่อน)
- ระดับสมาชิก bronze/silver/gold **ถูกเอาออก** (ไม่มีในเอกสาร)

## บริบทเพิ่มเติม
- เครื่อง dev ใช้ Windows (PowerShell / Git Bash) ระวังเรื่อง path และ encoding ให้บันทึกไฟล์เป็น UTF-8 (ไม่มี BOM)
- Node ปัจจุบัน v24.14.1 จึงใช้ Angular 21 ได้สูงสุด ถ้าจะอัปเป็น Angular 22 ต้องอัป Node เป็น ≥ 24.15 ก่อน แล้วรัน `ng update @angular/core @angular/cli` และอัป `primeng` ให้ตรง major
- localStorage: `roti.lang`, `roti.theme`, `roti.favorites`, `roti.cart`, `roti.sidebar.profile`, `roti.sidebar.backoffice`, `roti.kitchen.sound`, `roti.login.remembered`, `roti.mock.db` (ฐานข้อมูล mock ทั้งหมด รวม refresh session — ลบ key นี้เพื่อ reset ข้อมูล) — access token เก็บใน memory เท่านั้น
- `qrcode` เป็น CommonJS จึงเพิ่มไว้ใน `allowedCommonJsDependencies` ของ `angular.json`
