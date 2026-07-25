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