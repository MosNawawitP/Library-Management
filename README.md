# Library Management System

ระบบจัดการห้องสมุดแบบ Full-stack สำหรับดูภาพรวม จัดการหนังสือ และจัดการหมวดหมู่หนังสือ พร้อมระบบเข้าสู่ระบบด้วย JWT และการเก็บข้อมูลลงไฟล์ JSON ที่ใช้งานจริง

## ความสามารถหลัก

- เข้าสู่ระบบและตรวจสอบ session ด้วย JWT
- Dashboard แสดงจำนวนหนังสือ จำนวนเล่มทั้งหมด จำนวนหมวดหมู่ และหนังสือล่าสุด
- จัดการหนังสือแบบ CRUD พร้อมค้นหา กรองหมวดหมู่ และ pagination
- จัดการหมวดหมู่แบบ CRUD พร้อมค้นหาและ pagination
- ตรวจสอบข้อมูลซ้ำ ความสัมพันธ์ระหว่างหนังสือกับหมวดหมู่ และจำนวนหนังสือที่พร้อมใช้งาน
- รองรับ API response envelope, Problem Details, OpenAPI, health checks และ rate limiting
- เก็บข้อมูลแบบ persistent JSON โดยแยก seed data ออกจาก runtime data
- รันทั้งระบบได้ด้วย Docker Compose

> ขอบเขตปัจจุบันมีเฉพาะ Auth, Dashboard, Books และ Categories เท่านั้น ข้อมูล Loans ใช้ประกอบการคำนวณจำนวนหนังสือที่พร้อมใช้งานและกฎการลบหนังสือ โดยยังไม่มี Loans API รวมถึงยังไม่มีโมดูล Members, Reservations และ Reports

## เทคโนโลยี

| ส่วน | เทคโนโลยี |
| --- | --- |
| Front-end | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Auth.js |
| Back-end | ASP.NET Core Minimal API, .NET 10, JWT Bearer Authentication |
| Persistence | JSON files และ System.Text.Json |
| Deployment | Docker และ Docker Compose |
| API documentation | OpenAPI, HTTP request collection และ Postman collection |

## สถาปัตยกรรมโดยย่อ

```text
Browser
  -> Next.js App Router
  -> Feature API modules
  -> ASP.NET Core Minimal API
  -> Services
  -> Shared JSON repositories
  -> Runtime JSON files
```

Front-end เรียก Back-end ผ่าน HTTP เท่านั้น ส่วน Back-end แยกหน้าที่เป็น Endpoint, Service และ Repository โดยใช้ repository เดียวกันเพื่อควบคุมการอ่านและเขียน snapshot ของข้อมูลอย่างปลอดภัย

## เริ่มต้นใช้งานด้วย Docker Compose

### สิ่งที่ต้องติดตั้ง

- Docker Desktop หรือ Docker Engine พร้อม Docker Compose

### 1. สร้างไฟล์ environment

รันจาก root ของ repository:

```powershell
Copy-Item ./backend/.env.example ./backend/.env
Copy-Item ./frontend/.env.example ./frontend/.env
```

แก้ค่าต่อไปนี้ก่อนเริ่มระบบ:

- backend/.env: เปลี่ยน Jwt__SigningKey เป็นค่าสุ่มที่ปลอดภัยอย่างน้อย 32 bytes
- frontend/.env: เปลี่ยน AUTH_SECRET เป็นค่าสุ่มที่ปลอดภัย และเก็บค่าเดิมไว้ตลอดอายุ environment

ห้ามใช้ JWT signing key และ Auth.js secret เป็นค่าเดียวกัน และห้าม commit ไฟล์ .env ที่มี secret จริง

### 2. Build และรันระบบ

```powershell
docker compose --env-file ./frontend/.env up -d --build
```

เมื่อระบบพร้อมใช้งาน:

| Service | URL |
| --- | --- |
| Front-end | http://localhost:3000 |
| Back-end API | http://localhost:5088 |
| Liveness check | http://localhost:5088/health/live |
| Readiness check | http://localhost:5088/health/ready |

หยุดระบบด้วยคำสั่ง:

```powershell
docker compose --env-file ./frontend/.env down
```

Docker volume ชื่อ backend-data จะเก็บ runtime JSON data ไว้หลัง container restart การใช้ docker compose down โดยไม่ระบุ -v จะไม่ลบข้อมูลนี้

## บัญชีเริ่มต้น

Seed data มีบัญชีสำหรับการพัฒนา:

| Username | Password |
| --- | --- |
| admin | Library@123 |

บัญชีจะถูกล็อก 10 นาทีเมื่อกรอกรหัสผ่านผิดติดต่อกัน 10 ครั้ง และ JWT มีอายุเริ่มต้น 8 ชั่วโมง

## รันสำหรับการพัฒนาแบบ Local

### Back-end

ต้องใช้ .NET SDK 10.0.401 ตาม backend/global.json

```powershell
Copy-Item ./backend/.env.example ./backend/.env
# เปลี่ยน Jwt__SigningKey ก่อนรัน
Set-Location ./backend
dotnet restore LibraryManagement.slnx --configfile NuGet.Config
dotnet run --project src/LibraryManagement.Api
```

เมื่อ ASPNETCORE_ENVIRONMENT เป็น Development สามารถเปิด OpenAPI document ได้ที่ http://localhost:5088/openapi/v1.json

### Front-end

ต้องใช้ Node.js 22 หรือเวอร์ชันที่รองรับ Next.js 16

```powershell
Set-Location ./frontend
Copy-Item .env.development.example .env.development
# เปลี่ยน AUTH_SECRET ก่อนรัน
npm install
npm run dev
```

Front-end จะทำงานที่ http://localhost:3000 และเชื่อมต่อ Back-end ที่ http://localhost:5088

## API หลัก

ทุก endpoint ของ Dashboard, Books และ Categories ต้องส่ง Authorization header แบบ Bearer token

| Method | Path | รายละเอียด |
| --- | --- | --- |
| POST | /api/auth/login | เข้าสู่ระบบและรับ JWT |
| GET | /api/auth/validate-token | ตรวจสอบ token และ session |
| GET | /api/dashboard | อ่านข้อมูลสรุป Dashboard |
| GET, POST | /api/books | ค้นหา แสดงรายการ และเพิ่มหนังสือ |
| GET, PUT, DELETE | /api/books/{id} | อ่าน แก้ไข และลบหนังสือตาม ID |
| GET, POST | /api/categories | ค้นหา แสดงรายการ และเพิ่มหมวดหมู่ |
| GET, PUT, DELETE | /api/categories/{id} | อ่าน แก้ไข และลบหมวดหมู่ตาม ID |

รายละเอียด request, response, validation, pagination และ status code ทั้งหมดอยู่ใน [API contract](docs/api-contract.md)

## การจัดเก็บข้อมูล

- Seed files อยู่ใน backend/src/LibraryManagement.Api/Seed
- Runtime files อยู่ใน backend/data เมื่อรันแบบ Local
- เมื่อรันด้วย Docker ข้อมูลอยู่ใน volume backend-data ที่ mount ไปยัง /app/data
- Seed ใช้สร้าง runtime file เฉพาะเมื่อไฟล์ยังไม่มี และจะไม่เขียนทับข้อมูลเดิมเมื่อ restart
- library.json เก็บ Categories, Books และ collections สำหรับ compatibility ใน snapshot เดียวกัน

## โครงสร้างโปรเจกต์

```text
Library-Management/
├── frontend/                     # Next.js application
│   ├── src/app/                  # Routes และ page composition
│   ├── src/features/             # Auth, Dashboard, Books และ Categories
│   ├── src/components/           # Shared UI และ layout
│   ├── src/lib/                  # API client และ utilities
│   └── tests/                    # Front-end tests
├── backend/
│   ├── src/LibraryManagement.Api/
│   │   ├── Common/               # Contracts, middleware และ configuration
│   │   ├── Data/                 # JSON repositories และ data models
│   │   ├── Features/             # Minimal API endpoints และ services
│   │   └── Seed/                 # Initial JSON data
│   └── data/                     # Runtime data สำหรับ Local development
├── docs/api-contract.md          # API contract สำหรับ consumers
└── docker-compose.yml            # Local container orchestration
```

## การตรวจสอบคุณภาพ

Front-end:

```powershell
Set-Location ./frontend
npm test
npx eslint .
npx tsc --noEmit
npm run build
```

Back-end:

```powershell
Set-Location ./backend
dotnet build LibraryManagement.slnx
dotnet test LibraryManagement.slnx
dotnet format LibraryManagement.slnx --verify-no-changes
```

## เอกสารเพิ่มเติม

- [Front-end setup](frontend/README.md)
- [Back-end setup](backend/README.md)
- [API contract](docs/api-contract.md)
- [Postman collection](backend/LibraryManagement.Api.postman_collection.json)
- [HTTP request examples](backend/src/LibraryManagement.Api/LibraryManagement.Api.http)
