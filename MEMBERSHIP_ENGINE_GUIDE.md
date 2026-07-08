# The Palace Membership Engine - Implementation Guide

## Overview

The Palace Membership Engine is a complete tier-based subscription system integrated into The Palace application. It includes membership plans, subscription management, payment processing, and role-based access control.

## Architecture

### Database Layer (Migrations 017-021)

**Tables:**
- `membership_plans` - Tiered membership offerings (Visitor, Member, Circle, Council, Authority)
- `subscriptions` - Member subscription records with status and payment tracking
- `permissions` - Named permissions for role-based access control
- `role_permissions` - Junction table mapping roles to permissions
- `approval_requests` - Tracks membership applications requiring approval
- `members` (altered) - Added subscription_id, membership_plan_id, access_level, membership_status

### Business Logic Layer

#### `lib/engine/membership.js`
Core subscription management functions:
- `createSubscription(memberId, planId)` - Create new subscription
- `getMembershipStatus(memberId)` - Get current membership details
- `updateSubscription(subscriptionId, updates)` - Modify subscription
- `renewSubscription(subscriptionId, months)` - Extend expiring subscription
- `cancelSubscription(subscriptionId, reason)` - Terminate subscription
- `getMembershipPlans(activeOnly)` - List available plans
- `isExpiringSoon(subscriptionId, daysThreshold)` - Check renewal urgency

#### `lib/engine/permissions.js`
Role-based access control:
- `hasPermission(memberId, permissionName)` - Check single permission
- `getMemberPermissions(memberId)` - Get all permissions for member
- `getRolePermissions(roleId)` - Get permissions assigned to role
- `canAccessChamber(memberId, chamberId)` - Verify chamber access
- `grantPermissionToRole(roleId, permissionName)` - Admin function
- `revokePermissionFromRole(roleId, permissionName)` - Admin function
- `canPerformChamberAction(memberId, chamberId, action)` - Combined check

#### `lib/engine/treasury.js`
Payment and billing operations:
- `createPaymentIntent(memberId, planId)` - Prepare payment
- `recordPayment(subscriptionId, paymentId, amountPaid)` - Confirm payment
- `recordPaymentFailure(subscriptionId, failureReason)` - Handle failures
- `getPaymentHistory(memberId)` - List member transactions
- `generateInvoice(subscriptionId)` - Create invoice
- `refundPayment(subscriptionId, reason)` - Process refund

### Entry Point Updates

**`lib/engine/entry.js`** - Enhanced with membership validation:
- Now checks membership status during entry
- Rejects expired subscriptions with redemption prompt
- Tracks membership status for guest flows
- Maintains backward compatibility for visitors

**`app/enter/page.js`** - Updated entry interface:
- Better error handling
- Integration with new payment flow
- Redirect to renewal for expired members

## User Flows

### 1. New Member Entry Flow

```
Entry Page (/enter)
  ↓
Verify Identity & Royal Pass
  ↓
Check Membership Status
  ↓
No Subscription → Redirect to Membership Selection
  ↓
Select Plan (/payment)
  ↓
Free Plan? → Activate & Redirect to Throne
Paid Plan? → Process Payment & Activate
Requires Approval? → Submit & Wait
```

### 2. Payment Flow

```
Select Membership (/payment)
  ↓
Checkout (/payment/checkout/[id]/[planId])
  ↓
Process Payment (Stripe/Processor)
  ↓
Confirmation (/payment/confirm/[id]/[planId])
  ↓
Redirect to Throne
```

### 3. Approval Flow (for premium tiers)

```
Select Tier (requires_approval = true)
  ↓
Submit Application (/payment/approval/...)
  ↓
Create approval_request record
  ↓
Admin Reviews in /butler/approvals
  ↓
Approve → Create subscription → Member upgraded
Reject → Member notified → Retry or select different tier
```

## API Endpoints

### Membership

**GET** `/api/membership/plans`
- Returns all active membership plans
- Response: `{ plans: [...] }`

**GET** `/api/membership/status/[id]`
- Get member's current subscription and plan
- Response: `{ subscription, plan, isActive, status, daysRemaining }`

**POST** `/api/membership/subscribe`
- Create new subscription for member
- Body: `{ memberId, planId }`
- Response: `{ subscription }`

### Payments

**POST** `/api/payment/checkout`
- Initialize payment for a plan
- Body: `{ memberId, planId }`
- Response: Payment intent details or complimentary confirmation

**POST** `/api/payment/confirm`
- Webhook from payment processor (Stripe, etc)
- Body: `{ subscriptionId, paymentId, amountPaid }`
- Response: `{ success, subscription }`

### Approvals

**GET** `/api/approval/requests?status=pending`
- List pending membership applications
- Response: `{ requests: [...] }`

**POST** `/api/approval/requests`
- Create approval request (when plan requires_approval)
- Body: `{ memberId, planId, reason }`
- Response: `{ approvalRequest }`

**POST** `/api/approval/requests/[id]`
- Approve a pending membership request
- Body: `{ decidedBy, decisionNotes }`
- Response: `{ success, subscription }`

**PUT** `/api/approval/requests/[id]`
- Reject a pending membership request
- Body: `{ decidedBy, decisionNotes }`
- Response: `{ success }`

## Membership Tiers

### 1. Royal Visitor (Free, Lifetime)
- `access_level: 1`
- Permissions: Limited viewing
- No approval required
- No payment required

### 2. Royal Member ($9.99/month)
- `access_level: 2`
- Permissions: `view_chamber`, `post_in_chamber`, `view_announcement`
- No approval required
- Standard payment flow

### 3. Royal Circle ($29.99/month)
- `access_level: 3`
- Additional permissions: `create_chamber`
- **Requires approval** from Royal Council
- Standard payment + approval workflow

### 4. Royal Council ($99.99/month)
- `access_level: 4`
- Additional permissions: `manage_members`, `approve_membership`, `view_activity_log`
- **Requires approval** from Palace Authority
- Executive-level access

### 5. Palace Authority ($299.99/month)
- `access_level: 5`
- All permissions including: `manage_permissions`, `manage_settings`, `manage_treasury`
- **Requires approval** (typically by founder)
- Full administrative control

## Permission System

### Core Permissions

**Chamber Permissions:**
- `view_chamber` - Access chamber content
- `post_in_chamber` - Create posts in chambers
- `create_chamber` - Create new chambers

**Announcement Permissions:**
- `view_announcement` - Read announcements
- `create_announcement` - Post announcements

**Member Management:**
- `manage_members` - Add/remove members
- `manage_permissions` - Modify role permissions
- `approve_membership` - Approve tier applications

**Admin:**
- `view_activity_log` - Access audit trails
- `manage_settings` - Palace configuration
- `manage_treasury` - Payment & billing

### Role-Permission Mapping

**Royal Member:**
- ✓ view_chamber, post_in_chamber, view_announcement

**Royal Council:**
- ✓ All above, plus:
- ✓ create_chamber, create_announcement
- ✓ manage_members, approve_membership, view_activity_log

**Palace Authority:**
- ✓ All above, plus:
- ✓ manage_permissions, manage_settings, manage_treasury

## Admin Dashboard - The Butler's Office

**Location:** `/butler`

### Features

1. **Dashboard** (`/butler`)
   - Pending approvals count
   - Active members count
   - Total revenue
   - Quick links to all admin functions

2. **Approval Queue** (`/butler/approvals`)
   - View all pending membership requests
   - Filter by status (pending, approved, rejected)
   - One-click approve/reject
   - Add decision notes
   - Auto-generates subscription on approval

3. **Member Management** (`/butler/members`)
   - List all members with status
   - View subscription details
   - Manually create/modify subscriptions
   - Suspend/unsuspend access
   - Assign roles

4. **Permissions** (`/butler/permissions`)
   - Manage permission assignments
   - Create custom permissions
   - Assign to roles
   - View audit trail

5. **Payment History** (`/butler/payments`)
   - List all transactions
   - Filter by status
   - View invoices
   - Process refunds
   - Revenue reports

## Integration Checklist

### Phase 1: Database ✅
- [x] Create membership_plans table
- [x] Create subscriptions table
- [x] Create permissions system
- [x] Create approval_requests table
- [x] Alter members table
- [x] Seed default plans and permissions
- [x] Configure RLS policies

### Phase 2: Business Logic ✅
- [x] Implement membership.js
- [x] Implement permissions.js
- [x] Implement treasury.js
- [x] Update entry.js

### Phase 3: User Interface ✅
- [x] Update /enter page
- [x] Create membership selection UI
- [x] Create payment flow pages
- [x] Create approval request UI
- [x] Create confirmation page

### Phase 4: API Routes ✅
- [x] Create /api/membership/* endpoints
- [x] Create /api/payment/* endpoints
- [x] Create /api/approval/* endpoints
- [x] Add error handling
- [x] Add request validation

### Phase 5: Admin Interface ✅
- [x] Create Butler dashboard
- [x] Create approval queue UI
- [x] Create basic admin pages
- [x] Create approval workflow

### Phase 6: Testing & Polish (TO DO)
- [ ] Test complete user flows
- [ ] Integrate Stripe/payment processor
- [ ] Implement email notifications
- [ ] Add audit logging
- [ ] Security review
- [ ] Performance optimization
- [ ] UI/UX refinement

## Next Steps - TODO

### 1. Payment Processor Integration
```javascript
// In lib/engine/treasury.js
// Add Stripe/PayPal integration:
- Initialize payment processor
- Create payment intent
- Handle webhooks
- Manage subscriptions at processor level
```

### 2. Email Notifications
```
Notify on:
- Membership approved
- Membership rejected
- Payment received
- Subscription expiring (7 days)
- Subscription expired
```

### 3. Audit Logging
```
Log:
- All membership changes
- All approvals/rejections
- All payment transactions
- All permission assignments
- Admin actions
```

### 4. Enhanced Admin Features
- Member activity dashboard
- Revenue analytics
- Custom permission creation
- Bulk member management
- Subscription lifetime metrics

### 5. User Self-Service
- Manage subscription
- Download invoices
- Request upgrade
- Cancel with reason

## Database Queries for Testing

```sql
-- See all membership plans
SELECT * FROM membership_plans ORDER BY access_level;

-- Check member's current subscription
SELECT s.*, p.name as plan_name, p.access_level
FROM subscriptions s
JOIN membership_plans p ON s.plan_id = p.id
WHERE s.member_id = '[MEMBER_ID]'
ORDER BY s.created_at DESC
LIMIT 1;

-- View pending approvals
SELECT ar.*, m.name, mp.name as plan_name
FROM approval_requests ar
JOIN members m ON ar.member_id = m.id
JOIN membership_plans mp ON ar.plan_id = mp.id
WHERE ar.status = 'pending'
ORDER BY ar.requested_at DESC;

-- Check permissions for role
SELECT rr.name as role, p.name as permission
FROM role_permissions rp
JOIN royal_roles rr ON rp.role_id = rr.id
JOIN permissions p ON rp.permission_id = p.id
WHERE rr.name = 'Royal Member'
ORDER BY p.category, p.name;

-- Member access level report
SELECT m.name, m.email, m.access_level, s.status, mp.name as plan
FROM members m
LEFT JOIN subscriptions s ON m.id = s.member_id
LEFT JOIN membership_plans mp ON s.plan_id = mp.id
WHERE s.status IN ('active', 'pending')
ORDER BY m.created_at DESC;
```

## Security Considerations

1. **RLS Policies**: All tables have row-level security enabled
2. **API Validation**: All endpoints validate input
3. **Admin Auth**: Butler routes should check for admin role
4. **Payment Security**: Never expose full card data (use processor tokens)
5. **Audit Trail**: Log all admin actions
6. **Rate Limiting**: Add to payment endpoints

## Performance Notes

- Subscriptions indexed by member_id and status for fast queries
- Permissions cached at role level to minimize lookups
- Consider caching membership plans in memory
- Add pagination to approval queue and member lists
- Monitor database query performance as tables grow

## Support & Debugging

### Common Issues

**Issue**: Member gets "subscription expired" but should still have access
- Check `subscriptions.expires_at` vs current time
- Verify `subscriptions.status` is 'active'
- Check RLS policy allows read

**Issue**: Approval never shows in queue
- Verify `approval_requests.status = 'pending'`
- Check `approval_requests.requested_at` is set
- Ensure API endpoint is being called

**Issue**: Permission check always returns false
- Verify member has role assignment in `member_roles`
- Check role has permission in `role_permissions`
- Verify permission exists in `permissions` table
- Check for RLS policy issues

### Debug Mode

Add to entry.js for detailed logging:
```javascript
const DEBUG = process.env.DEBUG_MEMBERSHIP === 'true';
if (DEBUG) console.log('Membership Status:', membershipStatus);
```

## Version History

- **v1.0** (2026-07-08): Initial implementation
  - 5 membership tiers
  - Core permission system
  - Approval workflow
  - Admin dashboard
  - Payment foundation (TODO: processor integration)

---

**Questions or Issues?** Check the session logs or create an issue in the repository.
