terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ACM certificates for CloudFront must be in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# Look up the existing Route 53 hosted zone - do not manage it here
data "aws_route53_zone" "main" {
  name         = var.hosted_zone_name
  private_zone = false
}

module "frontend" {
  source         = "./modules/frontend"
  bucket_name    = var.frontend_bucket_name
  domain         = var.frontend_domain
  hosted_zone_id = data.aws_route53_zone.main.zone_id

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }
}

module "dns" {
  source                    = "./modules/dns"
  hosted_zone_id            = data.aws_route53_zone.main.zone_id
  frontend_domain           = var.frontend_domain
  cloudfront_domain_name    = module.frontend.cloudfront_domain_name
  cloudfront_hosted_zone_id = module.frontend.cloudfront_hosted_zone_id
}

module "iam" {
  source                        = "./modules/iam"
  frontend_bucket_name          = var.frontend_bucket_name
  cloudfront_distribution_arn   = module.frontend.cloudfront_distribution_arn
  ssm_parameter_prefix          = var.ssm_parameter_prefix
}
