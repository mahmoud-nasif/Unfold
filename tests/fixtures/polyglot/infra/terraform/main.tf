module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
}

resource "aws_s3_bucket" "uploads" {
  bucket = "shop-uploads"
}

resource "aws_sqs_queue" "orders" {
  name = "orders"
}
