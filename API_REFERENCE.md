# API Reference

## Membership API

### Get All Membership Plans
```
GET /api/membership/plans
```

**Response**:
```json
{
  "plans": [
    {
      "id": "uuid",
      "name": "Royal Member",
      "description": "Full member access...",
      "price": 9.99,
      "billing_period": "month",
      "access_level": 2,
      "requires_approval": false,
      "active": true
    }
  ]
}
```

### Get Member Subscription Status
```
GET /api/membership/status/:memberId
```

**Response**:
```json
{
  "subscription": {
    "id": "uuid",
    "member_id": "uuid",
    "plan_id": "uuid",
    "status": "active",
    "started_at": "2026-07-08T...",
    "expires_at": "2026-08-08T...",
    "payment_status": "paid"
  },
  "plan": {
    "name": "Royal Member",
    "access_level": 2
  },
  "isActive": true,
  "daysRemaining": 31
}
```

### Create Subscription
```
POST /api/membership/subscribe
Content-Type: application/json

{
  "memberId": "uuid",
  "planId": "uuid"
}
```

**Response**:
```json
{
  "subscription": {
    "id": "uuid",
    "status": "active",
    "created_at": "2026-07-08T..."
  }
}
```

**Errors**:
- 400: Missing memberId or planId
- 404: Plan not found
- 409: Member already has active subscription
- 500: Database error

---

## Payment API

### Initialize Payment
```
POST /api/payment/checkout
Content-Type: application/json

{
  "memberId": "uuid",
  "planId": "uuid"
}
```

**Response (Paid Plan)**:
```json
{
  "type": "stripe",
  "clientSecret": "pi_1234567890",
  "memberId": "uuid",
  "planId": "uuid",
  "amount": 999,
  "currency": "usd",
  "description": "Royal Member - month subscription"
}
```

**Response (Free Plan)**:
```json
{
  "type": "complimentary",
  "memberId": "uuid",
  "planId": "uuid",
  "amount": 0
}
```

### Confirm Payment (Webhook)
```
POST /api/payment/confirm
Content-Type: application/json

{
  "subscriptionId": "uuid",
  "paymentId": "stripe_charge_id",
  "amountPaid": 999
}
```

**Response**:
```json
{
  "success": true,
  "subscription": {
    "id": "uuid",
    "status": "active",
    "expires_at": "2026-08-08T..."
  }
}
```

**Errors**:
- 400: Missing required fields
- 500: Payment processing error

---

## Approval API

### List Pending Approvals
```
GET /api/approval/requests?status=pending
```

**Query Parameters**:
- `status` (optional): pending, approved, rejected

**Response**:
```json
{
  "requests": [
    {
      "id": "uuid",
      "member_id": "uuid",
      "plan_id": "uuid",
      "status": "pending",
      "reason": "Interested in moderation",
      "requested_at": "2026-07-08T...",
      "member": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "plan": {
        "name": "Royal Circle",
        "description": "Inner circle...",
        "access_level": 3
      }
    }
  ]
}
```

### Create Approval Request
```
POST /api/approval/requests
Content-Type: application/json

{
  "memberId": "uuid",
  "planId": "uuid",
  "reason": "I want to help moderate"
}
```

**Response**:
```json
{
  "approvalRequest": {
    "id": "uuid",
    "member_id": "uuid",
    "plan_id": "uuid",
    "status": "pending",
    "reason": "I want to help moderate",
    "requested_at": "2026-07-08T..."
  }
}
```

### Approve Membership Request
```
POST /api/approval/requests/:requestId
Content-Type: application/json

{
  "decidedBy": "uuid",
  "decisionNotes": "Excellent contribution to community"
}
```

**Response**:
```json
{
  "success": true,
  "subscription": {
    "id": "uuid",
    "status": "active",
    "member_id": "uuid",
    "plan_id": "uuid"
  }
}
```

**Side Effects**:
- Creates subscription for member
- Updates member access_level
- Sends notification email
- Logs audit trail

### Reject Membership Request
```
PUT /api/approval/requests/:requestId
Content-Type: application/json

{
  "decidedBy": "uuid",
  "decisionNotes": "Does not meet community standards"
}
```

**Response**:
```json
{
  "success": true
}
```

**Side Effects**:
- Updates request status to 'rejected'
- Sends notification email
- Logs audit trail

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Description of what went wrong"
}
```

### Common Status Codes
- 200: Success
- 201: Created
- 400: Bad Request (validation error)
- 404: Not Found
- 409: Conflict (e.g., duplicate subscription)
- 500: Server Error

### Example Error Response
```json
{
  "error": "Member already has an active subscription"
}
```

---

## Rate Limiting

**Recommended limits**:
- `/api/membership/*`: 100 req/minute per user
- `/api/payment/*`: 10 req/minute per user (payment sensitive)
- `/api/approval/*`: 50 req/minute per admin

---

## Authentication

All endpoints currently use Supabase service role key (server-side).

**TODO**: Implement:
- API key authentication
- JWT token validation
- Rate limiting by user
- Admin role verification

---

## Example Integration: JavaScript Client

```javascript
// Get membership plans
const plans = await fetch('/api/membership/plans')
  .then(r => r.json())
  .then(d => d.plans);

// Check current membership
const status = await fetch(`/api/membership/status/${memberId}`)
  .then(r => r.json());

if (status.isActive) {
  console.log(`Member has ${status.plan.name} until ${status.subscription.expires_at}`);
}

// Initialize payment
const payment = await fetch('/api/payment/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ memberId, planId })
}).then(r => r.json());

if (payment.type === 'stripe') {
  // Initialize Stripe checkout with payment.clientSecret
}

// Submit for approval
const approval = await fetch('/api/approval/requests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    memberId,
    planId,
    reason: 'I would like to join the inner circle'
  })
}).then(r => r.json());
```
