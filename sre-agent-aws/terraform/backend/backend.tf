terraform {
  backend "s3" {
    bucket         = "REPLACE_WITH_BUCKET_NAME"
    key            = "sre-agent/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "REPLACE_WITH_DYNAMODB_TABLE"
    encrypt        = true
  }
}
