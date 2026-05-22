variable "frontend_bucket_name" {
  description = "S3 bucket name for frontend assets"
  type        = string
}

variable "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution (for invalidation permission)"
  type        = string
}

variable "ssm_parameter_prefix" {
  description = "SSM parameter path prefix for deploy SHA tracking"
  type        = string
}
