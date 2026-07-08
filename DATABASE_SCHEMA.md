# Database Schema Reference

## Tables

### membership_plans
```sql
CREATE TABLE public.membership_plans (
    id uuid PRIMARY KEY,
    name text UNIQUE NOT NULL,
    description text,
    price numeric(10, 2),
    billing_period text DEFAULT 'month',
    access_level integer DEFAULT 1,
    requires_approval boolean DEFAULT false,
    active boolean DEFAULT true,
    created_at timestamp,
    updated_at timestamp
);
```
**Purpose**: Define available membership tiers
**Key Columns**:
- `access_level`: 1-5 (Visitor to Authority)
- `requires_approval`: true for Circle/Council/Authority
- `active`: False to hide from member selection

### subscriptions
```sql
CREATE TABLE public.subscriptions (
    id uuid PRIMARY KEY,
    member_id uuid REFERENCES members(id),
    plan_id uuid REFERENCES membership_plans(id),
    status text DEFAULT 'pending',
    started_at timestamp,
    expires_at timestamp,
    payment_status text DEFAULT 'unpaid',
    stripe_subscription_id text,
    created_at timestamp,
    updated_at timestamp
);
```
**Purpose**: Track member subscriptions
**Status Values**: pending, active, expired, suspended, cancelled
**Payment Status**: unpaid, paid, failed, refunded

### permissions
```sql
CREATE TABLE public.permissions (
    id uuid PRIMARY KEY,
    name text UNIQUE NOT NULL,
    description text,
    category text,
    created_at timestamp
);
```
**Purpose**: Define available permissions
**Categories**: chamber, announcement, member_management, admin

### role_permissions
```sql
CREATE TABLE public.role_permissions (
    id uuid PRIMARY KEY,
    role_id uuid REFERENCES royal_roles(id),
    permission_id uuid REFERENCES permissions(id),
    created_at timestamp,
    UNIQUE(role_id, permission_id)
);
```
**Purpose**: Map permissions to roles
**Note**: Unique constraint prevents duplicate assignments

### approval_requests
```sql
CREATE TABLE public.approval_requests (
    id uuid PRIMARY KEY,
    member_id uuid REFERENCES members(id),
    plan_id uuid REFERENCES membership_plans(id),
    status text DEFAULT 'pending',
    reason text,
    requested_at timestamp,
    decided_at timestamp,
    decided_by uuid REFERENCES members(id),
    decision_notes text,
    created_at timestamp,
    updated_at timestamp
);
```
**Purpose**: Track membership tier upgrade applications
**Status Values**: pending, approved, rejected

### members (altered columns)
```sql
ALTER TABLE public.members ADD COLUMN
    subscription_id uuid REFERENCES subscriptions(id),
    membership_plan_id uuid REFERENCES membership_plans(id),
    access_level integer DEFAULT 1,
    membership_status text DEFAULT 'pending';
```
**New Columns**:
- `subscription_id`: Current active subscription
- `membership_plan_id`: Current plan being subscribed to
- `access_level`: Cached from plan (1-5)
- `membership_status`: pending, active, expired, suspended

## Indexes

```sql
-- Subscriptions
CREATE INDEX idx_subscriptions_member_id ON subscriptions(member_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expires_at ON subscriptions(expires_at);

-- Approvals
CREATE INDEX idx_approval_requests_member_id ON approval_requests(member_id);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_requested_at ON approval_requests(requested_at);

-- Permissions
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Members
CREATE INDEX idx_members_access_level ON members(access_level);
CREATE INDEX idx_members_membership_status ON members(membership_status);
```

## RLS Policies

All tables have Row Level Security enabled:

- **Public Read**: `view_announcement`, `membership_plans`, `permissions`
- **Authenticated Only**: Subscription reads limited to own records
- **Admin Only**: Approval decisions, member status changes

## Data Relationships

```
members
  ↓
subscriptions → membership_plans
  ↓
role_permissions ↔ permissions
  ↓
royal_roles

members
  ↓
approval_requests → membership_plans
  ↓
royal_roles (decided_by)
```

## Sample Data

### Default Membership Plans
```
1. Royal Visitor - Free, Lifetime, Level 1
2. Royal Member - $9.99/month, Level 2
3. Royal Circle - $29.99/month, Level 3, Requires Approval
4. Royal Council - $99.99/month, Level 4, Requires Approval
5. Palace Authority - $299.99/month, Level 5, Requires Approval
```

### Default Permissions
```
Chamber:
- view_chamber
- post_in_chamber
- create_chamber

Announcement:
- view_announcement
- create_announcement

Member Management:
- manage_members
- manage_permissions
- approve_membership

Admin:
- view_activity_log
- manage_settings
- manage_treasury
```

## Migration Order

1. 017_membership_plans.sql
2. 018_subscriptions.sql
3. 019_permissions.sql
4. 020_approval_requests.sql
5. 021_alter_members.sql

**Important**: Run in order. Each migration depends on previous tables.
