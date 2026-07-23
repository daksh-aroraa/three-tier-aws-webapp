## Day 1

- Learned the hard way that being an "Administrator" in IAM doesn't mean you can
  see billing — AWS gates that separately at the account root level. Took some
  digging to find "IAM User and Role Access to Billing Information."
- MFA on root and MFA on your IAM user are two completely separate setups —
  easy to forget root if you only think about your daily-driver user.
- Assumed more AZs = better architecture. Turns out most production three-tier
  apps intentionally use just 2 — it's the standard fault-tolerance/cost balance,
  not "use whatever the region gives you."