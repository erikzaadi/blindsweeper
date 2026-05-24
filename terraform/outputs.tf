output "frontend_url" {
  value = "https://${var.frontend_domain}"
}

output "frontend_domain" {
  value = var.frontend_domain
}

# Used in GitHub Actions to invalidate CloudFront cache after deploy
output "cloudfront_distribution_id" {
  value = module.frontend.cloudfront_distribution_id
}

output "frontend_bucket_name" {
  value = var.frontend_bucket_name
}

# Set these as AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY in GitHub Actions secrets
output "deploy_access_key_id" {
  value     = module.iam.access_key_id
  sensitive = true
}

output "deploy_secret_access_key" {
  value     = module.iam.secret_access_key
  sensitive = true
}
