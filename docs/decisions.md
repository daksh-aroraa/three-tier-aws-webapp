**Decision**: Started as AdministratorAccess IAM user rather than a scoped least-privilege policy.

**Why:** Full action list wasn't known yet; single-actor account. Will be hardened to least-privilege as a deliberate final milestone.

**Alternative considered:** Replace AdministratorAccess with least-privilege IAM permissions after identifying the required services.

