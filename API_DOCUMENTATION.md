# Admin Backend API Documentation

Base URL: `http://localhost:5001/api/admin`

**Authentication**:
All endpoints require a Bearer Token in the Authorization header.
`Authorization: Bearer <jwt_token>`
User must have `role: 'admin'`.

## 1. Authentication

### Admin Login
**POST** `/login`

**Input**:
```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

**Output**:
```json
{
  "success": true,
  "message": "Admin Login Successful",
  "token": "jwt_token...",
  "user": { ... }
}
```

## 2. Moderator Management

### Create Moderator Direct
**POST** `/moderators`

**Input**:
```json
{
  "full_name": "Moderator Name",
  "email": "mod@example.com",
  "password": "securepassword",
  "phone_number": "+966500000000"
}
```

**Output (Success 201)**:
```json
{
  "success": true,
  "message": "Moderator created successfully",
  "data": { ...user_object }
}
```

**Errors**:
- `400`: Email or Phone already registered.

---

### Approve Moderator Request
**POST** `/moderator-requests/:id/approve`

**Description**: changes the generic user's role to `moderator`.

**Output (Success 200)**:
```json
{
  "success": true,
  "message": "User approved as Moderator",
  "user": "User Name"
}
```

### Reject Moderator Request
**POST** `/moderator-requests/:id/reject`

**Output (Success 200)**:
```json
{
  "success": true,
  "message": "Request rejected"
}
```

### Get Pending Requests
**GET** `/moderator-requests`

**Output**:
```json
{
  "success": true,
  "count": 5,
  "data": [ ...list_of_requests ]
}
```

## 2. God Mode (System Management)

### Get All Users
**GET** `/users`
**Query Params**: `?role=pilgrim` or `?role=moderator`

### Soft Delete User (Deactivate)
**DELETE** `/users/:id` or `/moderators/:id`

**Description**: Sets `active: false`. User cannot login.

**Output**:
```json
{
  "success": true,
  "message": "User deactivated (Soft Delete)"
}
```

### Hard Delete User (Permanent)
**DELETE** `/users/:id/force`

**Description**: Permanently removes user from database.

### Hard Delete Group
### Hard Delete Group
**DELETE** `/groups/:id`

### Get All Groups
**GET** `/groups`

**Output**:
```json
{
  "success": true,
  "count": 5,
  "data": [ ...list_of_groups ]
}
```

## 3. Statistics
**GET** `/stats`

**Output**:
```json
{
  "success": true,
  "stats": {
    "total_users": 100,
    "moderators": 10,
    "users_as_pilgrims": 90,
    "groups": 5,
    "pending_moderator_requests": 2
  }
}
```

## Error Codes Glossary

| Error Message | Meaning |
| :--- | :--- |
| `Email already registered` | The provided email exists in the User collection. |
| `Phone number already registered` | The provided phone exists in the User collection. |
| `Request not found` | The Moderator Request ID provided is invalid. |
| `User not found` | The User ID provided is invalid. |
| `Request already approved` | You are trying to approve a request that is already settled. |
