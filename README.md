# AWS Three Tier Web Application

## Project Goal

Deploy a production-style three-tier web application on AWS.

## Networking

- VPC
- Public Subnets
- Private App Subnets
- Private DB Subnets
- Internet Gateway
- NAT Gateway
- Route Tables

## Architecture



## Progress

### ✅ Day 1 – Networking
- Created a custom VPC
- Created public, application and database subnets across two Availability Zones
- Attached an Internet Gateway
- Configured public and private route tables
- Deployed a NAT Gateway for outbound internet access from private subnets

<p align="center">
  <img src="docs/screenshots/three_tier_vpc_architecture.png" width="800">
</p>

### ✅ Day 2 – Security & Compute
- Created Security Groups for ALB, Application and Database tiers
- Configured Security Group communication (ALB → App → Database)
- Created an IAM Role with `AmazonSSMManagedInstanceCore`
- Launched an Amazon Linux 2023 EC2 instance in a private application subnet
- Disabled public IP assignment
- Connected securely using AWS Systems Manager Session Manager without SSH or a key pair

<p align="center">
  <img src="docs/screenshots/session-manager-shell.png" width="800">
</p>