# Library Management System — แนวทางสำหรับผู้พัฒนาและ AI agents

เอกสารนี้ใช้กับทั้ง repository และกำหนดขอบเขตของ Back-end ที่มีอยู่จริง รวมถึงโครงสร้าง Front-end ที่จะพัฒนาต่อ ณ วันที่ 4 ตุลาคม 2026

## 1. สถานะและขอบเขตปัจจุบัน

Back-end เป็น ASP.NET Core Minimal API บน .NET 10 และมีโมดูลที่ใช้งานได้แล้ว 3 โมดูล:

| โมดูล | สถานะ | หน้าที่ |
| --- | --- | --- |
| Auth | ใช้งานแล้ว | Login, JWT และ session validation |
| Books | ใช้งานแล้ว | CRUD หนังสือ ค้นหา pagination และกรองหมวดหมู่ |
| Categories | ใช้งานแล้ว | CRUD หมวดหมู่ ค้นหา pagination และ lookup สำหรับ Books |

Front-end อยู่ในขอบเขตของโปรเจกต์ โดยใช้ Next.js App Router, TypeScript และ Tailwind CSS หน้าที่ของ Front-end ต้องสอดคล้องกับ Back-end ที่มีอยู่ ได้แก่ Login, Books และ Categories พร้อมหน้า Dashboard ที่สรุปข้อมูลจาก APIs เหล่านี้

สิ่งต่อไปนี้ **ไม่ใช่โมดูลธุรกิจหรือ API ในขอบเขตปัจจุบัน**:

- Members
- Loans
- Reservations
- Reports

`Data/Loans/LoanData.cs` และ collection `loans` มีไว้เป็น data shape ที่ Books ใช้คำนวณ `availableCopies` และตรวจประวัติการยืมก่อนลบหนังสือเท่านั้น ยังไม่มี Loan endpoints หรือ Loan service และห้ามสร้างข้อมูลการยืมจำลองเพื่อให้ฟังก์ชันนี้ทำงาน

Collections `bookCopies`, `members` และ `reservations` ที่อาจยังอยู่ใน `library.json` เป็น placeholder เพื่อรักษา schema และข้อมูลเดิม ไม่ได้หมายความว่ามีโมดูลเหล่านั้นแล้ว

Dashboard เป็นหน้า Front-end ไม่ใช่โมดูล Back-end และต้องไม่สมมติว่ามี `/api/dashboard` หากยังไม่มี endpoint ดังกล่าว ให้ประกอบข้อมูลจาก Auth, Books และ Categories ที่มีอยู่เท่านั้น

อย่าเพิ่มโมดูลธุรกิจนอกขอบเขตข้างต้น เว้นแต่ผู้ใช้ร้องขออย่างชัดเจน

## 2. เทคโนโลยีและแนวทางของโปรเจกต์

| ส่วน | เทคโนโลยี/แนวทาง |
| --- | --- |
| Front-end | Next.js App Router + TypeScript + Tailwind CSS |
| Back-end | ASP.NET Core Minimal APIs บน .NET 10 |
| Serialization | `System.Text.Json` |
| Persistence | JSON files ที่อ่านและเขียนได้จริง |
| Architecture | Endpoint → Service → `ILibraryRepository`/JSON Repository |
| Authentication | JWT และ session validation ที่มีอยู่เดิม |
| API contract | REST, JSON, OpenAPI, shared response envelope และ Problem Details |

ขอบเขตปัจจุบันไม่มี database server, EF Core, Dapper, SQL, migrations หรือ database connection ห้ามเพิ่ม dependency หรือ adapter เหล่านี้โดยอัตโนมัติ

## 3. โครงสร้างโปรเจกต์

ส่วน Back-end ด้านล่างมีอยู่และใช้งานจริง ส่วน `frontend/` เป็นโครงสร้างเป้าหมายสำหรับงาน Front-end โดยสร้างเฉพาะไฟล์ที่ต้องใช้เมื่อเริ่มพัฒนา:

```text
Library-Management/
├── AGENTS.md
├── README.md
├── frontend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── package.json
│   ├── package-lock.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── eslint.config.mjs
│   ├── postcss.config.mjs
│   ├── .env.example
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── globals.css
│   │   │   ├── page.tsx
│   │   │   ├── (auth)/
│   │   │   │   └── login/page.tsx
│   │   │   └── (library)/
│   │   │       ├── layout.tsx
│   │   │       ├── dashboard/page.tsx
│   │   │       ├── books/page.tsx
│   │   │       ├── books/[id]/page.tsx
│   │   │       ├── categories/page.tsx
│   │   │       └── categories/[id]/page.tsx
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── login-form.tsx
│   │   │   │   ├── auth.api.ts
│   │   │   │   └── auth.types.ts
│   │   │   ├── books/
│   │   │   │   ├── book-list.tsx
│   │   │   │   ├── book-form.tsx
│   │   │   │   ├── books.api.ts
│   │   │   │   └── books.types.ts
│   │   │   ├── categories/
│   │   │   │   ├── category-list.tsx
│   │   │   │   ├── category-form.tsx
│   │   │   │   ├── categories.api.ts
│   │   │   │   └── categories.types.ts
│   │   │   └── dashboard/
│   │   │       └── dashboard-overview.tsx
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   └── layout/
│   │   └── lib/
│   │       └── api-config.ts
│   └── tests/
├── backend/
│   ├── LibraryManagement.slnx
│   ├── global.json
│   ├── LibraryManagement.Api.postman_collection.json
│   ├── data/                              # runtime data; ไม่ใช้เป็น seed
│   │   ├── library.json
│   │   ├── user.json
│   │   └── userSession.json
│   └── src/LibraryManagement.Api/
│       ├── Program.cs
│       ├── LibraryManagement.Api.csproj
│       ├── LibraryManagement.Api.http
│       ├── Common/
│       │   ├── Configuration/
│       │   ├── Contracts/
│       │   └── Middleware/
│       ├── Data/
│       │   ├── Auth/
│       │   ├── Books/
│       │   ├── Categories/
│       │   ├── Loans/                     # data shape สำหรับ Books เท่านั้น
│       │   └── Library/
│       ├── Features/
│       │   ├── Auth/
│       │   ├── Books/
│       │   └── Categories/
│       └── Seed/
│           ├── library.seed.json
│           ├── user.seed.json
│           └── userSession.seed.json
└── docs/
    └── api-contract.md
```

สร้างเฉพาะไฟล์ที่งานปัจจุบันจำเป็นต้องใช้ ไม่สร้างโฟลเดอร์หรือ scaffold ของ Members, Loans, Reservations หรือ Reports ล่วงหน้า

## 4. กฎเส้นทางการทำงานไม่เกิน 3 ไฟล์

นับ implementation files ตั้งแต่ entry point ของหนึ่ง use case ถึงปลายทางได้ไม่เกิน 3 ไฟล์ต่อฝั่ง โดย HTTP เป็นขอบเขตระหว่าง Front-end และ Back-end

### Front-end

```text
app/(library)/books/page.tsx
  → features/books/book-list.tsx
  → features/books/books.api.ts
  → native fetch → Back-end
```

- `page.tsx` รับผิดชอบ routing, search parameters และ page composition
- Feature component รับผิดชอบ UI, interaction, state และ validation เพื่อช่วยผู้ใช้
- `<feature>.api.ts` สร้าง HTTP request, ตรวจ response และแปลง API data
- Server Component อาจเรียก feature API module โดยตรง แล้วส่งข้อมูลหรือ callbacks ให้ presentation component
- หน้า Dashboard ให้ `dashboard/page.tsx` เรียก `books.api.ts` และ `categories.api.ts` โดยตรง แล้วส่งข้อมูลให้ `dashboard-overview.tsx`; component ที่แสดงผลอย่างเดียวไม่นับเป็นชั้นส่งต่อของ use case
- ถ้าต้องมี shared HTTP helper ให้จัดเส้นทางไม่เกิน 3 implementation files เช่น `page.tsx → books.api.ts → lib/http.ts`
- ห้ามสร้างเส้นทาง `page → component → hook → api → http-client` โดยไม่ปรับให้สั้นลง

### Back-end

หนึ่ง use case ของ Back-end ใช้รูปแบบดังนี้:

```text
Features/Books/BookEndpoints.cs
  → Features/Books/BookService.cs
  → Data/Library/JsonLibraryRepository.cs
  → System.Text.Json → library.json
```

- Endpoint รับผิดชอบ routing, binding, validation ระดับ HTTP และแปลงผลลัพธ์เป็น response
- Service รับผิดชอบ business rules และ workflow โดยไม่รู้ file path หรือรายละเอียด serialization
- Repository รับผิดชอบ lock, load, clone/update และบันทึก JSON โดยไม่กำหนด HTTP status
- `ILibraryRepository.cs`, DTOs และ data model files เป็น declarations จึงไม่นับเป็น implementation step
- `Program.cs` เป็น composition root สำหรับ DI, middleware และ endpoint registration ห้ามใส่ business logic หรือ query
- Authentication, logging และ exception middleware เป็น cross-cutting infrastructure จึงไม่นับเป็นเส้นทางธุรกิจ
- ห้ามเพิ่ม Handler, Mediator, repository wrapper รายฟีเจอร์ หรือ generic repository จนทำให้เส้นทางลึกเกินจำเป็น

Use case ที่ไม่มีกฎธุรกิจอาจใช้ Endpoint → Repository ได้ แต่ไม่สร้าง Service ที่มีเพียงการส่งต่อเมธอด

## 5. ขอบเขตและแนวทาง Front-end

- ใช้ Next.js App Router, TypeScript strict mode และ Tailwind CSS
- ใช้ Server Components เป็นค่าเริ่มต้น เพิ่ม `"use client"` เฉพาะส่วนที่ต้องใช้ state, events หรือ browser APIs
- `app/` ดูแล routes และ page composition; `features/` ดูแล UI และ API access รายฟีเจอร์; `components/` มีเฉพาะส่วนที่ใช้ร่วมกันจริง
- Front-end มี routes สำหรับ Login, Dashboard, Books และ Categories เท่านั้น
- Dashboard เป็นหน้าสรุปและทางลัดเข้าสู่ Books/Categories โดยใช้ข้อมูลจาก endpoints ที่มีอยู่ ห้ามสร้าง mock totals หรืออ้าง endpoint ที่ Back-end ไม่มี
- เรียก Back-end ผ่าน feature API modules เช่น `auth.api.ts`, `books.api.ts` และ `categories.api.ts`; UI component ห้ามประกอบ URL หรือเรียก `fetch` โดยตรง
- ตรวจ HTTP status และ response envelope ก่อนใช้ข้อมูล; TypeScript type assertion ไม่ถือเป็น runtime validation
- ใช้ contract จาก `docs/api-contract.md` และรักษาชื่อ fields, pagination และ error shape ให้ตรงกับ Back-end
- จัดการ loading, empty, error, disabled และ unauthenticated states ให้ครบ
- ฟอร์มต้องมี label, validation feedback, keyboard support และ focus behavior ที่เหมาะสม
- ซ่อนหรือ disable action ใน UI เพื่อช่วย UX ได้ แต่ Back-end ยังคงเป็นผู้ตรวจ authentication, validation และ business rules
- แยก server-only configuration และ credentials ออกจาก code ที่ Client Component import; `NEXT_PUBLIC_*` ใช้ได้เฉพาะค่าที่เปิดเผยได้ เช่น public API base URL
- ห้ามเพิ่มหน้าหรือ feature folders ของ Members, Loans, Reservations และ Reports จนกว่า Back-end modules เหล่านั้นจะมีอยู่หรือผู้ใช้ร้องขอโดยตรง

## 6. ขอบเขตของแต่ละโมดูล Back-end

### Auth

- รักษา login, JWT issuance, token validation และ session behavior เดิม
- ใช้ `Data/Auth/JsonAuthRepository.cs` สำหรับ `user.json` และ `userSession.json`
- เก็บ secrets ผ่าน environment variables, configuration หรือ development user secrets
- ห้าม log password, token, secret หรือข้อมูลยืนยันตัวตนที่ละเอียดอ่อน
- การแก้ Books หรือ Categories ต้องไม่เปลี่ยน contract และพฤติกรรมของ Auth โดยไม่จำเป็น

### Books

Endpoints ที่มีอยู่:

- `GET /api/books?search=&categoryId=&page=1&pageSize=10`
- `GET /api/books/{id}`
- `POST /api/books`
- `PUT /api/books/{id}`
- `DELETE /api/books/{id}`

กฎสำคัญ:

- ทุก endpoint ต้องใช้ authentication เดิม
- `bookCode`, `title` และ `author` ต้อง trim และห้ามว่าง
- `bookCode` ต้อง unique แบบ case-insensitive หลัง trim
- `categoryId` ต้องอ้างถึง Category ที่มีอยู่
- `totalCopies` ต้องเป็นจำนวนเต็มบวก
- การแก้ไขต้องตั้ง `updatedAt` เป็น UTC และไม่เปลี่ยน `createdAt`
- Search ครอบคลุม `bookCode`, `title`, `author` และ `isbn` แบบ case-insensitive
- กรอง search และ category พร้อมกันได้
- Pagination ต้องตรวจ `page >= 1` และ `pageSize` อยู่ระหว่าง 1–100
- เรียงผลลัพธ์แบบ deterministic ด้วย `createdAt` จากใหม่ไปเก่า แล้วตามด้วย `id`
- Response ต้องมี `categoryName` และ `availableCopies`
- `availableCopies = totalCopies - จำนวน loans ของหนังสือที่ returnedAt == null`
- ห้ามลด `totalCopies` ต่ำกว่าจำนวน active loans
- ห้ามลบหนังสือเมื่อมี loan history อ้างถึง ไม่ว่าจะคืนแล้วหรือยัง

### Categories

Endpoints ที่มีอยู่:

- `GET /api/categories?search=&page=1&pageSize=10`
- `GET /api/categories/{id}`
- `POST /api/categories`
- `PUT /api/categories/{id}`
- `DELETE /api/categories/{id}`

กฎสำคัญ:

- ทุก endpoint ต้องใช้ authentication เดิม
- ชื่อต้อง trim, ห้ามว่าง และยาวไม่เกิน 100 ตัวอักษร
- ชื่อต้อง unique แบบ case-insensitive หลัง trim
- การแก้ไขต้องตรวจ duplicate โดยไม่เทียบกับ record ปัจจุบัน
- การแก้ไขต้องตั้ง `updatedAt` เป็น UTC และไม่เปลี่ยน `createdAt`
- Search ชื่อแบบ case-insensitive
- Pagination ต้องตรวจ `page >= 1` และ `pageSize` อยู่ระหว่าง 1–100
- เรียงผลลัพธ์แบบ deterministic ด้วยชื่อ แล้วตามด้วย `id`
- ห้ามลบ Category ที่มี Book อ้างถึง และห้าม cascade-delete หรือแก้ `categoryId` ของ Book โดยอัตโนมัติ
- ต้องรักษา compatibility ของ category lookup ที่ Books และ consumer เดิมใช้อยู่

## 7. API contracts และ error handling

- ใช้ request/response DTOs ใน `<Feature>Contracts.cs`; request ห้ามรับ IDs, timestamps หรือ computed fields ที่ server เป็นเจ้าของ
- ใช้ response envelope ที่มีอยู่ใน `Common/Contracts` และ `ApiResponseMiddleware`
- List response ต้องมี `data` และ `pagination` ซึ่งประกอบด้วย `page`, `pageSize`, `totalItems`, `totalPages`
- ใช้ `GlobalExceptionHandler` และ Problem Details conventions ที่มีอยู่ ห้ามสร้างรูปแบบ error ใหม่เฉพาะฟีเจอร์
- ใช้ status code ให้ตรงความหมาย: `200`, `201` พร้อม `Location`, `204`, `400`, `401`, `404`, `409`
- Error ที่คาดหมายจาก business rule ต้องถูกแปลงเป็น status ที่เหมาะสม; unexpected exception ต้องไม่ถูกกลืนหรือคืน success
- เมื่อเปลี่ยน endpoint หรือ contract ให้อัปเดตทั้ง `LibraryManagement.Api.http`, Postman collection และ `docs/api-contract.md`

## 8. JSON persistence

ไฟล์ runtime และไฟล์ seed มีหน้าที่ต่างกัน:

- Runtime: `<Storage:DataDirectory>/library.json`, `user.json`, `userSession.json` เช่น `backend/data/`
- Seed: `backend/src/LibraryManagement.Api/Seed/*.seed.json`
- Seed ใช้สร้าง runtime file เฉพาะเมื่อไฟล์นั้นยังไม่มี ห้ามใช้ seed เป็นที่เก็บ CRUD และห้ามเขียนทับ runtime data เมื่อ restart

`library.json` เป็น snapshot ร่วมของข้อมูลห้องสมุด โครงสร้างที่รองรับอยู่มีลักษณะดังนี้:

```json
{
  "schemaVersion": 1,
  "categories": [],
  "books": [],
  "bookCopies": [],
  "members": [],
  "loans": [],
  "reservations": []
}
```

มีเพียง `categories` และ `books` ที่มี CRUD API ในปัจจุบัน ส่วน `loans` อ่านเพื่อประกอบกฎของ Books ตามที่ระบุไว้เท่านั้น

กฎ persistence:

- Register `ILibraryRepository` ด้วย `JsonLibraryRepository` แบบ singleton เพื่อให้ทุกฟีเจอร์ใช้ lock ชุดเดียวกัน
- งาน read/check/mutate/write ที่ต้อง atomic ต้องอยู่ภายใน `UpdateAsync` และ lock เดียวกัน
- Book creation/update และ Category deletion ต้องใช้ coordination mechanism เดียวกัน เพื่อไม่ให้เกิด dangling references
- ห้ามส่ง mutable shared snapshot ไปแก้นอก lock
- เขียนไฟล์ชั่วคราวใน directory/volume เดียวกันก่อน replace/rename ไฟล์หลัก
- ถ้า validation หรือการเขียนล้มเหลว ไฟล์หลักเดิมต้องยังใช้ได้
- ถ้า JSON เสียหรือ `schemaVersion` ไม่รองรับ ให้แจ้ง error และ readiness failure ห้าม reset เป็นข้อมูลว่างหรือบันทึกทับเงียบ ๆ
- Preserve ข้อมูลเดิม, IDs เดิม และ unknown placeholder collections ที่ schema รองรับ
- ใช้ async file I/O และส่ง `CancellationToken`
- Lock ภายใน process รองรับผู้เขียนเพียง process/container เดียว ไม่ใช่ distributed lock

## 9. Clean Code และการเปลี่ยนแปลง

- จำกัดการแก้ไขให้อยู่ในขอบเขตที่ผู้ใช้ร้องขอ และรักษาการเปลี่ยนแปลงเดิมที่ไม่เกี่ยวข้อง
- หนึ่งฟังก์ชันควรมีหน้าที่ชัดเจน ใช้ guard clauses และชื่อที่สื่อ business intent
- แยก HTTP, business rules และ persistence ตามหน้าที่
- ใช้ concrete service เป็นค่าเริ่มต้น และสร้าง abstraction เฉพาะ boundary ที่มีเหตุผลจริง
- ไม่ใช้ `dynamic`, magic flags หรือ copy business rules ซ้ำระหว่าง Endpoint และ Service
- จัด public workflow ไว้ก่อน private implementation details เพื่อให้อ่านเส้นทางหลักได้ง่าย
- Comments ใช้อธิบายเหตุผลหรือข้อจำกัด ไม่บรรยายสิ่งที่ชื่อโค้ดบอกอยู่แล้ว
- ห้ามเพิ่มโมดูลธุรกิจใหม่, database adapter หรือ infrastructure เพิ่มเติมเพื่อเตรียมอนาคตโดยไม่มีคำขอ

## 10. การตรวจสอบและส่งมอบ

เมื่อมี Front-end project แล้ว ใช้คำสั่งจาก `frontend/`:

```powershell
npx eslint .
npx tsc --noEmit
npm run build
```

ใช้คำสั่ง Back-end จาก `backend/`:

```powershell
dotnet build LibraryManagement.slnx
dotnet test LibraryManagement.slnx
dotnet format LibraryManagement.slnx --verify-no-changes
```

รันเฉพาะคำสั่งที่ project/setup รองรับจริง และระบุชัดเจนในการส่งมอบว่าคำสั่งใดรันสำเร็จ ไม่ได้รัน หรือติด blocker

เมื่อแก้ Front-end ให้ตรวจตามความเสี่ยงของงาน:

- Login สำเร็จ/ล้มเหลว และ unauthenticated redirect หรือ state
- Dashboard โหลดข้อมูลจาก Books และ Categories contracts ที่มีอยู่จริง
- รายการ, search, category filter และ pagination ของ Books
- รายการ, search และ pagination ของ Categories
- create/update/delete flows รวม validation และ API errors
- loading, empty, error, disabled states และ keyboard accessibility
- ไม่มีการเรียก `/api/dashboard` หรือ endpoints ของโมดูลที่ยังไม่มี

เมื่อแก้ Books หรือ Categories ให้ตรวจตามความเสี่ยงของงาน:

- authenticated CRUD และ unauthenticated rejection
- validation, missing records และ duplicate แบบ case-insensitive หลัง trim
- search, filter, pagination, totals และ deterministic ordering
- concurrent creation ไม่สร้าง duplicate code/name
- Category ที่ถูก Book อ้างถึงลบไม่ได้ แต่ Category ที่ไม่ถูกใช้งานลบได้
- Book availability และ loan-history conflicts ยังทำงานกับ collection ปัจจุบัน
- runtime data คงอยู่หลัง restart และ seed ไม่เขียนทับข้อมูล
- malformed JSON ไม่ถูก reset เงียบ ๆ
- login และ token validation เดิมยังทำงาน

สรุปส่งมอบต้องระบุ:

- ไฟล์ที่เปลี่ยนและผลกระทบสำคัญ
- checks ที่รันจริงพร้อมผลลัพธ์
- blocker หรือ pending integration ที่มีอยู่จริง
- หากกล่าวถึง Loans ให้ระบุชัดว่าเป็นเพียง data compatibility สำหรับ Books และยังไม่มี Loans API

## 11. แหล่งอ้างอิงของ API

- Contract สำหรับฝั่ง consumer: `docs/api-contract.md`
- ตัวอย่างเรียก API: `backend/src/LibraryManagement.Api/LibraryManagement.Api.http`
- Postman collection: `backend/LibraryManagement.Api.postman_collection.json`
- OpenAPI metadata: กำหนดร่วมกับ Minimal API endpoints

เอกสารเหล่านี้ต้องสอดคล้องกับ endpoints ที่ implement อยู่จริง ได้แก่ Auth, Books และ Categories เท่านั้น
