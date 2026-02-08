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

**Description**: Creates a User entry with role `moderator` for the pilgrim and updates the pilgrim's role field.

**Requirements:**
- Pilgrim must have verified email

**Output (Success 200)**:
```json
{
  "success": true,
  "message": "Pilgrim approved as Moderator",
  "user": "Pilgrim Name"
}
```

**Errors**:
- `400`: Pilgrim email must be verified before approval
- `404`: Request not found or Pilgrim not found

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
  "data": [
    {
      "_id": "request_id",
      "pilgrim_id": {
        "full_name": "Pilgrim Name",
        "email": "pilgrim@example.com",
        "phone_number": "+966500000000",
        "national_id": "1234567890",
        "email_verified": true
      },
      "status": "pending",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## 2. God Mode (System Management)

### Get All Users
**GET** `/users`

**Description**: Fetches all users from both User (admins/moderators) and Pilgrim collections.

**Query Params**: 
- `?role=pilgrim` - Only pilgrims
- `?role=moderator` - Only moderators  
- `?role=admin` - Only admins
- No param - All users (pilgrims, moderators, admins)

**Output**:
```json
{
  "success": true,
  "count": 150,
  "data": [
    {
      "_id": "user_id",
      "full_name": "User Name",
      "email": "user@example.com",
      "role": "moderator",
      "phone_number": "+966500000000",
      "active": true
    },
    {
      "_id": "pilgrim_id",
      "full_name": "Pilgrim Name",
      "email": "pilgrim@example.com",
      "national_id": "1234567890",
      "role": "pilgrim",
      "phone_number": "+966500000001",
      "email_verified": true
    }
  ]
}
```

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
    "pilgrims": 90,
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
