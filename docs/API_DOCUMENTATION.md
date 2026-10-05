# API Documentation — Phase 1 Foundation

## Base URL
- Development: `http://localhost:8000/api`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`

---

## 1. Health & Status
### `GET /api/health`
- **Description**: Returns backend operational status.
- **Access**: Public
- **Response**: `{"status": "healthy", "service": "lab-management-api"}`

---

## 2. Authentication
### `POST /api/auth/login`
- **Description**: Authenticates user and issues JWT bearer token.
- **Access**: Public
- **Body**:
  ```json
  {
    "email": "admin@lab.edu",
    "password": "admin123"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user_id": 1,
    "name": "System Administrator",
    "email": "admin@lab.edu",
    "role": "admin",
    "status": "active"
  }
  ```

### `GET /api/auth/me`
- **Description**: Returns authenticated profile for token in `Authorization: Bearer <token>`.
- **Access**: Authenticated users

---

## 3. Users Management
### `GET /api/users`
- **Description**: Retrieves user directory.
- **Access**: `admin` role only.
