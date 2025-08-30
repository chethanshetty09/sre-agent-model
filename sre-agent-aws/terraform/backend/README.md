This folder contains Terraform code to bootstrap the remote backend for the main infrastructure.

Usage:
- Edit `terraform.tfvars` in this folder or pass variables on the CLI to set `bucket_name`, `dynamodb_table_name`, and `project`.
- Run `terraform init` and `terraform apply` here to create the S3 bucket and DynamoDB table for state and locks.
- Then copy the `backend.tf` file from this folder into the parent `sre-agent-aws/terraform` directory and run `terraform init -reconfigure` there.

Be careful when migrating state; follow the interactive prompts from `terraform init` or use the `-migrate-state` flag as needed.
