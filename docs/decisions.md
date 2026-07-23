**Decision**: Started as AdministratorAccess IAM user rather than a scoped least-privilege policy.

**Why:** Full action list wasn't known yet; single-actor account. Will be hardened to least-privilege as a deliberate final milestone.

**Alternative considered:** Replace AdministratorAccess with least-privilege IAM permissions after identifying the required services.

**Decision:** Enabled "IAM User and Role Access to Billing Information" at the
account (root) level, then attached a billing policy to daksh-admin.
**Why:** AdministratorAccess does not grant billing console access by default —
billing visibility is gated separately at the account level for security reasons.

**Decision:** Set an AWS Budget ($25/month) with two alert thresholds — actual
cost > 50%, forecasted cost > 80% — instead of a CloudWatch billing alarm.
**Why:** AWS Budgets supports forecasted-spend alerting (warns before a threshold
is crossed, not just after) and multiple thresholds in one resource.

**Decision:** Architecture will span 2 Availability Zones, not all 3 available in
ap-south-1.
**Why:** 2 AZs is the standard resilience/cost balance point — eliminates single
point of failure without doubling subnet/NAT overhead for marginal extra gain.