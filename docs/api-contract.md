# Library Management API Contract

เอกสารนี้เป็น contract ระหว่าง Back-end และ Front-end สำหรับ API ที่มีอยู่จริงในโปรเจกต์ ณ วันที่ 4 ตุลาคม 2026

## 1. การเชื่อมต่อ

| รายการ | ค่า Local Development |
| --- | --- |
| API base URL | `http://localhost:5088` |
| OpenAPI (Development เท่านั้น) | `http://localhost:5088/openapi/v1.json` |
| Front-end origin ที่ CORS อนุญาต | `http://localhost:3000` |
| Content type สำหรับ request body | `application/json` |
| รูปแบบวันที่ | ISO 8601 UTC เช่น `2026-10-04T11:34:41.4603351+00:00` |
| รูปแบบ ID | UUID/Guid string |

Front-end ต้องเรียก API ผ่าน HTTP เท่านั้น ห้ามอ่าน `backend/data/*.json` หรือไฟล์ใน `Seed/` โดยตรง

## 2. Authentication

ทุก endpoint ของ Dashboard, Books และ Categories รวมถึง `GET /api/auth/validate-token` ต้องส่ง JWT:

```http
Authorization: Bearer <token>
Accept: application/json
```

ไม่ต้องส่ง token ให้:

- `GET /health/live`
- `GET /health/ready`
- `POST /api/auth/login`

Token มีอายุเริ่มต้น 8 ชั่วโมง และจะผ่านก็ต่อเมื่อ session ในระบบยังถูกต้อง

## 3. Response format กลาง

API ใช้ response envelope เดียวกัน:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "meta": null
}
```

| Field | Type | ความหมาย |
| --- | --- | --- |
| `success` | boolean | `true` สำหรับ HTTP 2xx/3xx และ `false` สำหรับ error |
| `message` | string | ข้อความผลลัพธ์หรือสาเหตุของ error |
| `data` | object, array หรือ string | payload หลัก หรือรายละเอียด error |
| `meta` | object หรือ null | pagination metadata |

ข้อยกเว้นคือ `204 No Content` ซึ่งไม่มี response body

### Pagination metadata

```json
{
  "page": 1,
  "pageSize": 10,
  "totalItems": 25,
  "totalPages": 3
}
```

### Validation error

```json
{
  "success": false,
  "message": "One or more validation errors occurred.",
  "data": {
    "message": "One or more validation errors occurred.",
    "errors": {
      "name": [
        "Name is required."
      ]
    }
  },
  "meta": null
}
```

### Authentication error

```json
{
  "success": false,
  "message": "Authorization header with a Bearer token is required.",
  "data": {
    "message": "Authorization header with a Bearer token is required."
  },
  "meta": null
}
```

ข้อความ 401 ที่เป็นไปได้:

- `Authorization header with a Bearer token is required.`
- `Token has expired.`
- `Token is invalid or was not issued by this system.`

## 4. Endpoint summary

| Module | Method | Path | Auth | Success |
| --- | --- | --- | --- | --- |
| Health | GET | `/health/live` | ไม่ใช้ | 200 |
| Health | GET | `/health/ready` | ไม่ใช้ | 200 หรือ 503 |
| Auth | POST | `/api/auth/login` | ไม่ใช้ | 200 |
| Auth | GET | `/api/auth/validate-token` | Bearer | 200 |
| Dashboard | GET | `/api/dashboard` | Bearer | 200 |
| Categories | GET | `/api/categories` | Bearer | 200 |
| Categories | GET | `/api/categories/{id}` | Bearer | 200 |
| Categories | POST | `/api/categories` | Bearer | 201 |
| Categories | PUT | `/api/categories/{id}` | Bearer | 200 |
| Categories | DELETE | `/api/categories/{id}` | Bearer | 204 |
| Books | GET | `/api/books` | Bearer | 200 |
| Books | GET | `/api/books/{id}` | Bearer | 200 |
| Books | POST | `/api/books` | Bearer | 201 |
| Books | PUT | `/api/books/{id}` | Bearer | 200 |
| Books | DELETE | `/api/books/{id}` | Bearer | 204 |

## 5. Health

### GET `/health/live`

ตรวจว่า process ของ API ยังทำงานอยู่

```http
GET /health/live
Accept: application/json
```

ตัวอย่าง response `200`:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": "Healthy",
  "meta": null
}
```

### GET `/health/ready`

ตรวจว่า `library.json` อ่านได้ รูปแบบถูกต้อง และ directory เขียนได้

```http
GET /health/ready
Accept: application/json
```

สถานะที่เกี่ยวข้อง:

- `200 OK`: พร้อมให้บริการ
- `503 Service Unavailable`: JSON storage เสีย อ่านไม่ได้ หรือเขียนไม่ได้

## 6. Authentication endpoints

### POST `/api/auth/login`

Header:

```http
Content-Type: application/json
Accept: application/json
```

Payload:

```json
{
  "username": "admin",
  "password": "Library@123"
}
```

Validation:

- `username` required, whitespace-only ไม่ได้, สูงสุด 100 ตัวอักษร
- `password` required, สูงสุด 1024 ตัวอักษร

Response `200`:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "token": "<jwt>",
    "tokenType": "Bearer",
    "expiresAtUtc": "2026-10-04T19:00:00+00:00"
  },
  "meta": null
}
```

สถานะอื่น:

- `400 Bad Request`: payload ไม่ถูกต้อง
- `401 Unauthorized`: username/password ไม่ถูกต้อง
- `423 Locked`: login ผิดครบจำนวนที่กำหนด พร้อม header `Retry-After` และ `retryAfterSeconds` ใน `data`

### GET `/api/auth/validate-token`

Header:

```http
Authorization: Bearer <token>
Accept: application/json
```

Response `200`:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "isValid": true,
    "userId": "11111111-1111-1111-1111-111111111111",
    "sessionId": "22222222-2222-2222-2222-222222222222"
  },
  "meta": null
}
```

## 7. Dashboard endpoint

### GET `/api/dashboard`

สรุปข้อมูลจาก snapshot เดียวกันของ Books และ Categories โดยไม่มี query parameter:

- `totalBooks` คือจำนวน Book records
- `totalBookCopies` คือผลรวม `totalCopies` ของ Book records ทั้งหมด
- `totalCategories` คือจำนวน Category records ทั้งหมด รวม Category ที่ยังไม่มี Book
- `recentBooks` มีไม่เกิน 5 รายการ เรียง `createdAt` จากใหม่ไปเก่า แล้ว `id` จากน้อยไปมาก

```http
GET /api/dashboard
Authorization: Bearer <token>
Accept: application/json
```

Response `200`:

```json
{
  "success": true,
  "message": "Dashboard retrieved successfully.",
  "data": {
    "summary": {
      "totalBooks": 1,
      "totalBookCopies": 3,
      "totalCategories": 3
    },
    "recentBooks": [
      {
        "id": "33333333-3333-3333-3333-333333333333",
        "bookCode": "BK-001",
        "title": "Clean Code",
        "author": "Robert C. Martin",
        "categoryId": "10000000-0000-0000-0000-000000000003",
        "categoryName": "Technology",
        "totalCopies": 3,
        "createdAt": "2026-10-04T11:30:00+00:00"
      }
    ]
  },
  "meta": null
}
```

เมื่อไม่มีข้อมูล Books ระบบคืนยอด Book และจำนวน copies เป็น `0` พร้อม `recentBooks: []` โดยยังนับ Categories แยกต่างหาก

สถานะอื่น:

- `401 Unauthorized`
- `500 Internal Server Error`: persisted data อ่านไม่ได้หรือไม่ถูกต้อง

## 8. Category models

### CategoryResponse

```json
{
  "id": "10000000-0000-0000-0000-000000000003",
  "name": "Technology",
  "createdAt": "2026-10-04T00:00:00+00:00",
  "updatedAt": null
}
```

## 9. Category endpoints

### GET `/api/categories`

Query parameters:

| Parameter | Type | Default | Rule |
| --- | --- | --- | --- |
| `search` | string? | null | ค้นหา `name` แบบ case-insensitive |
| `page` | integer? | 1 | ต้องมากกว่าหรือเท่ากับ 1 |
| `pageSize` | integer? | 10 | 1–100 |

พฤติกรรม compatibility:

- `GET /api/categories` โดยไม่มี query parameter คืน Category ทั้งหมดและ `meta: null`
- เมื่อส่ง `search`, `page` หรือ `pageSize` อย่างน้อยหนึ่งค่า ระบบเปิด pagination และส่ง metadata
- เรียงตาม `name` แล้ว `id`

ตัวอย่าง request แบบ pagination:

```http
GET /api/categories?search=tech&page=1&pageSize=10
Authorization: Bearer <token>
Accept: application/json
```

Response `200`:

```json
{
  "success": true,
  "message": "Categories retrieved successfully.",
  "data": [
    {
      "id": "10000000-0000-0000-0000-000000000003",
      "name": "Technology",
      "createdAt": "2026-10-04T00:00:00+00:00",
      "updatedAt": null
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

### GET `/api/categories/{id}`

Response `200`: `data` เป็น `CategoryResponse`

สถานะอื่น:

- `401 Unauthorized`
- `404 Not Found`: ไม่พบ Category

### POST `/api/categories`

Payload:

```json
{
  "name": "Science"
}
```

Rules:

- trim `name` ก่อนบันทึก
- required และห้ามเป็น whitespace-only
- สูงสุด 100 ตัวอักษรหลัง trim
- ชื่อต้องไม่ซ้ำแบบ case-insensitive
- `id` และ `createdAt` สร้างโดย server

Response `201`:

- Header `Location: /api/categories/{id}`
- `data` เป็น `CategoryResponse`

สถานะอื่น:

- `400 Bad Request`: validation ไม่ผ่าน
- `401 Unauthorized`
- `409 Conflict`: ชื่อซ้ำ

### PUT `/api/categories/{id}`

Payload:

```json
{
  "name": "Natural Science"
}
```

Response `200`: `data` เป็น `CategoryResponse` และ `updatedAt` เป็น UTC timestamp ล่าสุด

สถานะอื่น:

- `400 Bad Request`: validation ไม่ผ่าน
- `401 Unauthorized`
- `404 Not Found`: ไม่พบ Category
- `409 Conflict`: ชื่อซ้ำกับ Category อื่น

### DELETE `/api/categories/{id}`

Response `204`: ไม่มี body

สถานะอื่น:

- `401 Unauthorized`
- `404 Not Found`: ไม่พบ Category
- `409 Conflict`: มี Book อ้างถึง Category นี้

ระบบไม่ cascade-delete Book และไม่ลบ `categoryId` ออกจาก Book

## 10. Book models

### BookResponse

```json
{
  "id": "33333333-3333-3333-3333-333333333333",
  "bookCode": "BK-001",
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "isbn": "9780132350884",
  "categoryId": "10000000-0000-0000-0000-000000000003",
  "categoryName": "Technology",
  "totalCopies": 3,
  "availableCopies": 3,
  "createdAt": "2026-10-04T11:30:00+00:00",
  "updatedAt": null
}
```

`availableCopies` คำนวณโดย server:

```text
totalCopies - จำนวน loans ที่ returnedAt เป็น null
```

Front-end ห้ามส่ง `id`, timestamps หรือ `availableCopies` ใน create/update payload

## 11. Book endpoints

### GET `/api/books`

Query parameters:

| Parameter | Type | Default | Rule |
| --- | --- | --- | --- |
| `search` | string? | null | ค้นหา `bookCode`, `title`, `author`, `isbn` แบบ case-insensitive |
| `categoryId` | Guid? | null | ต้องอ้างถึง Category ที่มีอยู่ |
| `page` | integer? | 1 | ต้องมากกว่าหรือเท่ากับ 1 |
| `pageSize` | integer? | 10 | 1–100 |

Search และ Category filter ใช้ร่วมกันได้ รายการเรียงตาม `createdAt` จากใหม่ไปเก่า แล้ว `id`

```http
GET /api/books?search=clean&categoryId=10000000-0000-0000-0000-000000000003&page=1&pageSize=10
Authorization: Bearer <token>
Accept: application/json
```

Response `200`:

```json
{
  "success": true,
  "message": "Books retrieved successfully.",
  "data": [
    {
      "id": "33333333-3333-3333-3333-333333333333",
      "bookCode": "BK-001",
      "title": "Clean Code",
      "author": "Robert C. Martin",
      "isbn": "9780132350884",
      "categoryId": "10000000-0000-0000-0000-000000000003",
      "categoryName": "Technology",
      "totalCopies": 3,
      "availableCopies": 3,
      "createdAt": "2026-10-04T11:30:00+00:00",
      "updatedAt": null
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

สถานะอื่น:

- `400 Bad Request`: pagination ไม่ถูกต้อง, `categoryId` ไม่ใช่ Guid หรือไม่พบ Category
- `401 Unauthorized`

### GET `/api/books/{id}`

Response `200`: `data` เป็น `BookResponse`

สถานะอื่น:

- `401 Unauthorized`
- `404 Not Found`: ไม่พบ Book

### POST `/api/books`

Payload:

```json
{
  "bookCode": "BK-001",
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "isbn": "9780132350884",
  "categoryId": "10000000-0000-0000-0000-000000000003",
  "totalCopies": 3
}
```

Rules:

- trim `bookCode`, `title`, `author` และ `isbn`
- `bookCode`, `title`, `author` required และห้ามเป็น whitespace-only
- `isbn` optional และไม่บังคับ unique
- `categoryId` required และต้องมีอยู่จริง
- `totalCopies` ต้องเป็นจำนวนเต็มมากกว่า 0
- `bookCode` ต้อง unique หลัง trim แบบ case-insensitive
- `id` และ `createdAt` สร้างโดย server

Response `201`:

- Header `Location: /api/books/{id}`
- `data` เป็น `BookResponse`

สถานะอื่น:

- `400 Bad Request`: validation ไม่ผ่านหรือไม่พบ Category
- `401 Unauthorized`
- `409 Conflict`: `bookCode` ซ้ำ

### PUT `/api/books/{id}`

Payload ต้องส่งครบเหมือน create:

```json
{
  "bookCode": "BK-001",
  "title": "Clean Code, Second Edition",
  "author": "Robert C. Martin",
  "isbn": "9780132350884",
  "categoryId": "10000000-0000-0000-0000-000000000003",
  "totalCopies": 4
}
```

Response `200`: `data` เป็น `BookResponse` และ `updatedAt` เป็น UTC timestamp ล่าสุด

สถานะอื่น:

- `400 Bad Request`: validation ไม่ผ่านหรือไม่พบ Category
- `401 Unauthorized`
- `404 Not Found`: ไม่พบ Book
- `409 Conflict`: `bookCode` ซ้ำ หรือ `totalCopies` ต่ำกว่าจำนวน active loans

### DELETE `/api/books/{id}`

Response `204`: ไม่มี body

สถานะอื่น:

- `401 Unauthorized`
- `404 Not Found`: ไม่พบ Book
- `409 Conflict`: มี Loan history อ้างถึง Book แม้ loan นั้นคืนแล้ว

## 12. HTTP statuses ส่วนกลาง

| Status | ความหมาย |
| --- | --- |
| `200 OK` | อ่านหรือแก้ไขสำเร็จ |
| `201 Created` | สร้างสำเร็จ พร้อม `Location` header |
| `204 No Content` | ลบสำเร็จ ไม่มี response body |
| `400 Bad Request` | request/query/payload ไม่ถูกต้อง |
| `401 Unauthorized` | ไม่มี token, token หมดอายุ หรือ token/session ไม่ถูกต้อง |
| `404 Not Found` | ไม่พบ resource |
| `409 Conflict` | unique constraint หรือ business rule conflict |
| `423 Locked` | บัญชีถูกล็อกจากการ login ผิดหลายครั้ง |
| `429 Too Many Requests` | เกิน global rate limit 300 requests ต่อ 10 วินาทีต่อ IP |
| `500 Internal Server Error` | unexpected server error |
| `503 Service Unavailable` | readiness check ไม่ผ่าน |

## 13. แนวทางใช้งานจาก Front-end

1. เรียก `POST /api/auth/login` แล้วเก็บ `data.token`
2. ส่ง `Authorization: Bearer <token>` ใน protected requests
3. เมื่อได้รับ `401` ให้ล้าง authentication state และนำผู้ใช้กลับหน้า login
4. ใช้ `data` เป็น payload และ `meta` สำหรับ pagination
5. สำหรับ Category list ในหน้าจัดการ ให้ส่ง `page` และ `pageSize` เสมอ; bare request สงวนไว้สำหรับ lookup compatibility
6. หลัง `204` ห้ามเรียก `response.json()` เพราะไม่มี body
7. แสดง validation จาก `data.errors` และใช้ `message` เป็นข้อความสรุป
8. ใช้ `availableCopies` จาก response ห้ามคำนวณหรือแก้จาก Front-end
9. หลังแก้ชื่อ Category ให้ refresh Book ที่เกี่ยวข้องเพื่อรับ `categoryName` ล่าสุด
10. วันที่ทั้งหมดเป็น string UTC; แปลง timezone เฉพาะตอนแสดงผล

ตัวอย่าง helper แบบย่อ:

```ts
type ApiResponse<T, TMeta = null> = {
  success: boolean;
  message: string;
  data: T;
  meta: TMeta;
};

async function apiFetch<T>(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  if (response.status === 204) {
    return null;
  }

  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok) {
    throw new Error(body.message);
  }

  return body;
}
```

## 14. ไฟล์ที่เกี่ยวข้อง

- Postman collection: `backend/LibraryManagement.Api.postman_collection.json`
- Manual HTTP requests: `backend/src/LibraryManagement.Api/LibraryManagement.Api.http`
- Runtime OpenAPI: `/openapi/v1.json` เมื่อรันใน Development
- Runtime data: `backend/data/library.json` (ห้าม Front-end อ่านโดยตรง)
