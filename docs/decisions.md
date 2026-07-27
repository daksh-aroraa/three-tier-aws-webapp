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

**DAY 2**

**Decision:** Use a NAT Gateway instead of VPC Endpoints for outbound access.

**Why:** The application needs general internet connectivity (for example, npm package downloads). VPC Endpoints only provide private connectivity to supported AWS services.

**Decision:** Use a NAT Gateway instead of VPC Endpoints for outbound access.

**Why:** The application needs general internet connectivity (for example, npm package downloads). VPC Endpoints only provide private connectivity to supported AWS services.

# Day 3 Decisions

## Used Session Manager instead of SSH

**Decision:**
Launch the EC2 instance without an SSH key pair and without opening port 22.

**Reason:**
Session Manager provides secure browser-based access without exposing SSH to the internet or managing key pairs.

---

## Private EC2 Instance

**Decision:**
Deploy the application server inside a private subnet.

**Reason:**
Application servers should not be directly accessible from the internet. Only the Application Load Balancer should accept public traffic.

---

## Security Group Creation Order

**Decision:**
Created Security Groups in the following order:
1. db-sg
2. app-sg
3. alb-sg

**Reason:**
app-sg must reference alb-sg and db-sg must reference app-sg. Creating all groups first avoids circular dependency issues.

---

## Security Group Communication

Internet
↓
alb-sg
↓
app-sg
↓
db-sg

Each layer accepts traffic only from the previous layer.

# Day 4 — Application Tier

## Decision: Used nvm to install Node.js (v24.18.0) instead of the operating system package manager.

**Why:** Installing Node.js through nvm allowed me to use a specific LTS version instead of depending on the version available in Amazon Linux's repositories. This makes the application environment more predictable and easier to reproduce.

---

## Decision: Managed the Express application with systemd instead of running it manually or using PM2.

**Why:** systemd is the native service manager in Linux and already manages essential services such as the Amazon SSM Agent. Running the application as a systemd service provides automatic startup after reboot, automatic restart on failure, and a consistent way to manage background processes.

---

## Decision: Added a dedicated `/health` endpoint.

**Why:** The `/health` endpoint returns the application's health status independently of the main application routes. It will be used by the Application Load Balancer (ALB) for health checks and later by monitoring tools such as CloudWatch.


 ## Day 5 — Load Balancer

**Decision:** ALB configured with HTTP:80 listener only, no HTTPS.
**Why:** Scoped for this project's timeline; HTTPS would require an ACM
certificate + a custom domain (ACM won't issue certs for *.elb.amazonaws.com).
Known gap — a real production deployment would terminate TLS at the ALB and
redirect all HTTP traffic to HTTPS.