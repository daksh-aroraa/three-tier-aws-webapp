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

## Day 5 (addendum) — HA gap, deliberately deferred

**Decision:** Continuing with a single EC2 instance in private-app-subnet-1a
rather than immediately adding a second instance or an Auto Scaling Group.
**Why:** Networking layer (2 AZs, 2 app subnets) was built HA-ready from the
start, but compute HA was deprioritized given timeline to compelete the project.

**Status:** Known gap, not an oversight. Revisit with a 2nd instance or ASG
if time allows before wrap-up; otherwise documented as a clear "next step"
in the README rather than left unexplained.

## Day 6 — RDS PostgreSQL

**Decision:** Used AWS Secrets Manager for the master password instead of a
self-set password.
**Why:** Password never appears in shell history, notes, or committed files;
EC2 retrieves it at runtime via IAM role permissions, scoped to GetSecretValue
on this one secret ARN only.

**Decision:** RDS deployed Single-AZ, Public access disabled, in isolated
DB subnets with no internet route in either direction.
**Why:** No legitimate reason for the DB tier to be reachable from, or reach
out to, the internet — smallest possible attack surface for the most
sensitive tier.

**Near-miss:** First RDS attempt had 200GB gp3 storage + Multi-AZ enabled by
mistake — inflated estimate to $90.36/month. Caught via the console's own
cost estimate before creation completed; deleted (no data existed) and
recreated correctly at ~$21.60/month. Lesson: always read the estimate panel,
never assume a template's defaults.

# Day 7 – Monitoring & Observability Decisions

## Decision 1: Use the CloudWatch Agent

### Decision
Installed the Amazon CloudWatch Agent on the EC2 instance.

### Why
The default EC2 monitoring only provides infrastructure metrics such as CPU utilization, network traffic, and disk I/O. It does not expose operating system metrics like memory, disk usage, or swap usage.

The CloudWatch Agent bridges this gap by collecting host-level metrics directly from the operating system and publishing them to CloudWatch.

---

## Decision 2: Redirect Application Logs to a Dedicated File

### Decision
Configured the Express application's systemd service to redirect stdout and stderr to:

/var/log/three-tier-app/app.log

### Why
Instead of relying only on the system journal, using a dedicated log file provides a simpler and more explicit ingestion path for the CloudWatch Agent. It also makes local troubleshooting easier since the application logs are stored separately.

---

## Decision 3: Store Application Logs in CloudWatch Logs

### Decision
Configured the CloudWatch Agent to continuously monitor:

/var/log/three-tier-app/app.log

and upload new log entries to CloudWatch Logs.

### Why
Centralized logging makes it possible to monitor application behavior without logging into the EC2 instance. It also provides a foundation for future alerting and log analysis.

---

## Decision 4: Build a Monitoring Dashboard

### Decision
Created a CloudWatch Dashboard to visualize infrastructure metrics.

### Why
A dashboard provides a single operational view of the application and infrastructure instead of manually checking multiple CloudWatch pages.

---

## Decision 5: Local Agent Configuration

### Decision
Used the locally generated CloudWatch Agent configuration.

### Why
The configuration was initially intended to be stored in AWS Systems Manager Parameter Store.

However, the EC2 IAM role lacked the required `ssm:PutParameter` permission, resulting in an `AccessDeniedException`.

Rather than expanding IAM permissions solely for this learning project, the agent was configured using the local configuration file.

In a production deployment or Auto Scaling environment, storing the configuration in Parameter Store would simplify reuse across multiple EC2 instances.

## IAM Hardening Pass

**Decision:** Replaced AdministratorAccess on daksh-admin with 10 scoped
AWS-managed policies (EC2, RDS, SSM, VPC, Billing, CloudWatch, ELB,
IAMReadOnlyAccess, IAMUserChangePassword, SecretsManagerReadWrite) covering
every service actually used in this project.
**Why:** Least-privilege over broad admin access. Used AWS-managed
job-function/service policies rather than hand-written custom actions, given
project timeline — a reasonable trade-off for a single-actor account, though
a fully rigorous production setup would write custom scoped policies per
action rather than full-service managed policies.
**Deliberately excluded:** Full IAM write access (only IAMReadOnlyAccess +
self password-change) — IAM management is the highest-risk permission to
leave broad, since it can be used to grant any other permission, including
re-creating admin access.
**Verified:** Session Manager, EC2/VPC/RDS/CloudWatch/Secrets Manager console
access, and the live app via ALB all confirmed working after the swap.