variable "aws_region" {
  description = "Primary AWS region for all resources"
  type        = string
  default     = "eu-west-1"
}

variable "hosted_zone_name" {
  description = "Root domain of the existing Route 53 hosted zone (e.g. yourdomain.com)"
  type        = string
}

variable "frontend_domain" {
  description = "Full domain for the frontend CloudFront distribution (e.g. blindsweeper.yourdomain.com)"
  type        = string
}

variable "frontend_bucket_name" {
  description = "S3 bucket name for frontend static assets (must be globally unique)"
  type        = string
}

variable "ssm_parameter_prefix" {
  description = "Path prefix for SSM parameter store (used for deploy SHA tracking)"
  type        = string
  default     = "/blindsweeper/prod"
}
