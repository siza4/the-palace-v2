# Testing Guide

## Unit Tests

### Testing membership.js

```javascript
// Test: Create subscription
import { createSubscription, getMembershipStatus } from '@/lib/engine/membership';

test('createSubscription creates active subscription', async () => {
  const memberId = 'test-member-uuid';
  const planId = 'test-plan-uuid';
  
  const result = await createSubscription(memberId, planId);
  
  expect(result.id).toBeDefined();
  expect(result.member_id).toBe(memberId);
  expect(result.status).toBe('active');
});

test('getMembershipStatus returns correct data', async () => {
  const memberId = 'test-member-uuid';
  const result = await getMembershipStatus(memberId);
  
  expect(result.isActive).toBeBoolean();
  expect(result.plan).toBeDefined();
  expect(result.subscription).toBeDefined();
});
```

### Testing permissions.js

```javascript
import { hasPermission, canAccessChamber } from '@/lib/engine/permissions';

test('hasPermission checks role permissions', async () => {
  const memberId = 'member-with-role';
  const permission = 'view_chamber';
  
  const result = await hasPermission(memberId, permission);
  
  expect(result).toBeBoolean();
});

test('canAccessChamber validates chamber access', async () => {
  const memberId = 'test-member';
  const chamberId = 'test-chamber';
  
  const result = await canAccessChamber(memberId, chamberId);
  
  expect(result).toBeBoolean();
});
```

## Integration Tests

### Complete User Flow

```javascript
test('New member signup flow', async () => {
  // 1. Create test member
  const member = await createTestMember();
  
  // 2. Get available plans
  const plans = await fetch('/api/membership/plans')
    .then(r => r.json())
    .then(d => d.plans);
  
  const freePlan = plans.find(p => p.price === 0);
  
  // 3. Create subscription
  const subRes = await fetch('/api/membership/subscribe', {
    method: 'POST',
    body: JSON.stringify({ memberId: member.id, planId: freePlan.id })
  });
  
  expect(subRes.ok).toBe(true);
  
  // 4. Check status
  const status = await fetch(`/api/membership/status/${member.id}`)
    .then(r => r.json());
  
  expect(status.isActive).toBe(true);
});

test('Approval workflow', async () => {
  // 1. Create member and request premium tier
  const member = await createTestMember();
  const premiumPlan = await getPlanByName('Royal Circle');
  
  // 2. Submit approval request
  const approvalRes = await fetch('/api/approval/requests', {
    method: 'POST',
    body: JSON.stringify({
      memberId: member.id,
      planId: premiumPlan.id,
      reason: 'Test reason'
    })
  });
  
  const approval = await approvalRes.json();
  expect(approval.approvalRequest.status).toBe('pending');
  
  // 3. Admin approves
  const adminId = await getAdminMemberId();
  const approveRes = await fetch(`/api/approval/requests/${approval.approvalRequest.id}`, {
    method: 'POST',
    body: JSON.stringify({
      decidedBy: adminId,
      decisionNotes: 'Approved'
    })
  });
  
  expect(approveRes.ok).toBe(true);
  
  // 4. Verify member now has subscription
  const status = await fetch(`/api/membership/status/${member.id}`)
    .then(r => r.json());
  
  expect(status.plan.name).toBe('Royal Circle');
});
```

## Manual Testing Checklist

### Member Signup
- [ ] New member enters via `/enter` with no subscription
- [ ] Redirected to membership selection
- [ ] Can select free tier
- [ ] Free tier activates immediately
- [ ] Member access granted to throne

### Paid Subscription
- [ ] Select paid plan ($9.99/month)
- [ ] Redirected to checkout
- [ ] Payment processes successfully
- [ ] Subscription status shows "active"
- [ ] Member can access all chamber permissions

### Approval Flow
- [ ] Select premium tier (requires_approval = true)
- [ ] Submit with reason
- [ ] Appears in `/butler/approvals`
- [ ] Admin can approve/reject
- [ ] Member notification sent
- [ ] On approval: subscription created, access granted
- [ ] On rejection: request marked rejected, member can retry

### Membership Expiry
- [ ] Set subscription to expire in 1 day
- [ ] Wait for expiry
- [ ] Member tries to enter
- [ ] Redirected to renewal flow
- [ ] Can renew subscription
- [ ] Access restored

### Permission System
- [ ] Royal Member cannot create chambers
- [ ] Royal Council can create chambers
- [ ] Palace Authority can manage permissions
- [ ] Guest cannot access member-only chambers

### Admin Dashboard
- [ ] `/butler` shows correct counts
- [ ] Pending approvals reflects database
- [ ] Active members count accurate
- [ ] Revenue total correct
- [ ] Quick links work

### API Tests

#### Test membership endpoints
```bash
# Get plans
curl http://localhost:3000/api/membership/plans

# Get member status
curl http://localhost:3000/api/membership/status/[MEMBER_ID]

# Create subscription
curl -X POST http://localhost:3000/api/membership/subscribe \
  -H "Content-Type: application/json" \
  -d '{"memberId": "[ID]", "planId": "[ID]"}'
```

#### Test approval endpoints
```bash
# List pending
curl http://localhost:3000/api/approval/requests?status=pending

# Create request
curl -X POST http://localhost:3000/api/approval/requests \
  -H "Content-Type: application/json" \
  -d '{"memberId": "[ID]", "planId": "[ID]", "reason": "test"}'

# Approve
curl -X POST http://localhost:3000/api/approval/requests/[REQUEST_ID] \
  -H "Content-Type: application/json" \
  -d '{"decidedBy": "[ADMIN_ID]", "decisionNotes": "Approved"}'
```

## Database Test Queries

```sql
-- Verify membership plans exist
SELECT COUNT(*) FROM membership_plans WHERE active = true;
-- Expected: 5

-- Check permissions are assigned
SELECT COUNT(*) FROM role_permissions;
-- Expected: Should be > 0

-- View test member's subscription
SELECT s.id, s.status, mp.name, s.expires_at
FROM subscriptions s
JOIN membership_plans mp ON s.plan_id = mp.id
WHERE s.member_id = '[TEST_MEMBER_ID]';

-- Check pending approvals
SELECT COUNT(*) FROM approval_requests WHERE status = 'pending';

-- Verify member has correct access level
SELECT m.name, m.access_level, mp.name as plan
FROM members m
LEFT JOIN subscriptions s ON m.id = s.member_id
LEFT JOIN membership_plans mp ON s.plan_id = mp.id
WHERE m.id = '[TEST_MEMBER_ID]';
```

## Load Testing

### Simulate High Approval Volume

```javascript
// Create 100 approval requests
for (let i = 0; i < 100; i++) {
  const memberId = await createTestMember();
  await fetch('/api/approval/requests', {
    method: 'POST',
    body: JSON.stringify({
      memberId,
      planId: premiumPlanId,
      reason: `Test request ${i}`
    })
  });
}

// Measure approval queue load
console.time('Load approvals');
const res = await fetch('/api/approval/requests?status=pending');
console.timeEnd('Load approvals');
```

## Performance Benchmarks (Target)

- Membership plan list: < 50ms
- Check subscription status: < 100ms
- Permission check: < 150ms
- Approval list (100 items): < 300ms
- Create subscription: < 200ms

## Known Issues & Workarounds

### Issue: .single() returns error on no results
**Workaround**: Use `.maybeSingle()` instead
```javascript
// Bad
const { data } = await supabase.from('table').select().single();

// Good
const { data } = await supabase.from('table').select().maybeSingle();
```

### Issue: RLS policy denies access
**Debug**: Check policy allows the operation
```sql
-- View all policies on a table
SELECT * FROM pg_policies WHERE tablename = 'subscriptions';
```

---

**Next Step**: Run the full test suite before deploying to production.
