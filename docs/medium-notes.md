## Day 1

- Learned the hard way that being an "Administrator" in IAM doesn't mean you can
  see billing — AWS gates that separately at the account root level. Took some
  digging to find "IAM User and Role Access to Billing Information."
- MFA on root and MFA on your IAM user are two completely separate setups —
  easy to forget root if you only think about your daily-driver user.
- Assumed more AZs = better architecture. Turns out most production three-tier
  apps intentionally use just 2 — it's the standard fault-tolerance/cost balance,
  not "use whatever the region gives you."

  ## Day 2

- CIDR notation finally clicked. A VPC CIDR (10.0.0.0/16) is just the address
  space, while each subnet (/24) carves out a smaller, non-overlapping portion
  of that space.
- Route Tables don't move traffic themselves — they simply tell AWS where the
  next hop should be. Every subnet follows only the Route Table associated with
  it.
- Internet Gateways attach to the VPC, not to individual subnets. Whether a
  subnet is "public" or "private" is determined by its Route Table, not by the
  Internet Gateway itself.
- NAT Gateway placement was initially confusing. It must live in a public subnet
  so it can reach the Internet through the Internet Gateway, while private
  application subnets send outbound traffic to it using their own Route Table.
- Private subnets never "switch" to the Public Route Table. An EC2 instance in
  the App subnet follows only the Private Route Table, which points to the NAT
  Gateway. The NAT Gateway then follows the Public Route Table to reach the
  Internet.
- Keeping separate Route Tables for Public, App, and Database tiers makes the
  network easier to reason about and prevents accidentally giving internet
  access to resources that should remain private.

  # Day 3 Notes

Today I understood Security Groups much better.

Initially I confused the inbound port with the sender's port.

Later I realised an inbound rule has two parts:

- Source → Who is sending the traffic?
- Port → Which port on my resource are they trying to access?

For example:

Source = alb-sg
Port = 3000

means:

Allow the Application Load Balancer to connect to port 3000 on my EC2 instance.

The biggest learning today was Session Manager.

I successfully connected to a private EC2 instance without:
- SSH
- Public IP
- Port 22
- Key Pair

The entire connection happened through AWS Systems Manager using the IAM Role attached to the instance.

Seeing the shell open proved that IAM, SSM Agent, NAT Gateway and networking were all configured correctly.

# Day 4 – Deploying the Application Tier

Today, I deployed my Express.js application on a private EC2 instance and configured it to run as a Linux service using **systemd**. While the deployment itself was straightforward, I came across an interesting real-world issue that taught me an important lesson about Linux services.

## The "It Works in My Terminal" Problem

Initially, I started my application using:

```bash
node server.js
```

Everything worked perfectly. I could even verify the application using:

```bash
curl http://localhost:3000/
```

However, after creating a `systemd` service, the application refused to start even though the same command worked from the terminal.

At first, it looked like something was wrong with my Express application, but the problem wasn't in the code at all.

## Understanding the Root Cause

I had installed Node.js using **nvm (Node Version Manager)**.

When I open a terminal, my shell loads the nvm configuration and updates the `PATH` environment variable. That's why simply typing:

```bash
node
```

works.

But `systemd` does **not** inherit my interactive shell environment. It starts services with a much cleaner environment, so it had no idea where the `node` executable was located.

To verify the actual location of Node.js, I used:

```bash
which node
```

which returned something like:

```text
/home/ssm-user/.nvm/versions/node/v24.18.0/bin/node
```

Instead of writing:

```ini
ExecStart=node server.js
```

I updated my service file to use the absolute path:

```ini
ExecStart=/home/ssm-user/.nvm/versions/node/v24.18.0/bin/node /home/ssm-user/three-tier-aws-webapp/app/server.js
```

After reloading systemd and restarting the service, everything worked as expected.

## What I Learned

This was a great reminder that **"works in my terminal" doesn't always mean "works as a service."**

Interactive shells and Linux services don't always share the same environment variables or `PATH`. Whenever a service cannot find an executable, checking its absolute path using `which` is often the quickest way to diagnose the problem.

## Key Takeaways

- Running `node server.js` starts a foreground process tied to the current terminal.
- `systemd` manages applications as background services that continue running after logout or reboot.
- `systemd` does not automatically inherit the shell environment created by `nvm`.
- Using the absolute executable path in `ExecStart` makes the service reliable.
- Adding a dedicated `/health` endpoint prepares the application for future ALB health checks and monitoring.

# Day 5
the Chrome HTTPS-first gotcha itself — "spent 10 minutes debugging AWS config that was already correct, because Chrome silently tried HTTPS first"


 # Day 6

- Difference between DB Subnet Group and normal subnet
- Why database should never be public
- Secrets Manager vs hardcoded passwords
- IAM least privilege
- Cost mistake (200GB + Multi-AZ)
- psql version mismatch warning
- Angle brackets (<>) mistake
- First successful database connection

# Day 7 – Monitoring & Observability Notes

Today was less about installing another AWS service and more about understanding how monitoring actually works.

Before today, the application was simply running on EC2. If something went wrong, I would have to log into the server using Session Manager and inspect the application manually.

Adding CloudWatch changed that completely.

---

## CloudWatch Logs vs CloudWatch Metrics

One realization today was that CloudWatch Logs and CloudWatch Metrics solve two different problems.

Logs answer:

"What happened?"

Examples:

- Application started
- Request received
- Database connection failed

Metrics answer:

"How healthy is the system?"

Examples:

- CPU Utilization
- Memory Usage
- Disk Usage
- Swap Usage

Both are important because metrics can indicate that something is wrong, while logs usually explain why.

---

## Default EC2 Metrics are Limited

Initially I assumed CloudWatch already monitored everything.

It doesn't.

EC2 automatically publishes CPU, network, and some infrastructure metrics.

Memory and filesystem information are inside the operating system, so AWS cannot observe them directly.

The CloudWatch Agent collects these host-level metrics and publishes them to CloudWatch.

---

## Why EC2 Needs an Agent but RDS Doesn't

An interesting observation was the difference between EC2 and RDS.

For EC2, I manage the operating system.

AWS cannot see the guest OS memory or filesystem.

For RDS, AWS manages the operating system.

Because AWS owns the underlying host, it can publish database metrics such as CPU utilization, storage, and database connections without installing an agent.

This was one of the clearest examples of the difference between self-managed and managed services.

---

## Linux Understanding

Today also helped me understand Linux services better.

The Express application writes logs using:

console.log()

systemd redirects stdout and stderr to:

/var/log/three-tier-app/app.log

The CloudWatch Agent continuously watches this file and uploads new log entries to CloudWatch Logs.

The complete pipeline became:

Express

↓

systemd

↓

app.log

↓

CloudWatch Agent

↓

CloudWatch Logs

---

## Real-World IAM Issue

While configuring the agent, I attempted to store the configuration in AWS Systems Manager Parameter Store.

AWS denied the request because the EC2 IAM role didn't have permission to perform:

ssm:PutParameter

Instead of treating it as a CloudWatch issue, I learned to distinguish between:

Authentication

"Who am I?"

Authorization

"What am I allowed to do?"

The CloudWatch Agent was working correctly.

The IAM role simply wasn't authorized to create a Parameter Store entry.

---

## Key Takeaway

Monitoring is not just collecting numbers.

Good observability combines:

- Infrastructure metrics
- Application logs
- Dashboards
- Centralized visibility

Today transformed the project from "an application that runs" into "an application that can be observed."


started broad as admin, hardened at the end once I knew exactly what the account needed