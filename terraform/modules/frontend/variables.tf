variable "bucket_name" {
  description = "S3 bucket name for frontend static assets"
  type        = string
}

variable "domain" {
  description = "CloudFront alternate domain name"
  type        = string
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone ID for ACM DNS validation records"
  type        = string
}
