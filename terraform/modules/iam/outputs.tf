output "access_key_id" {
  value     = aws_iam_access_key.deploy.id
  sensitive = true
}

output "secret_access_key" {
  value     = aws_iam_access_key.deploy.secret
  sensitive = true
}
