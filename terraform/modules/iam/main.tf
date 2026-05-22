resource "aws_iam_user" "deploy" {
  name = "blindsweeper-deploy"
}

data "aws_iam_policy_document" "deploy" {
  statement {
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject",
    ]
    resources = ["arn:aws:s3:::${var.frontend_bucket_name}/*"]
  }

  statement {
    actions   = ["s3:ListBucket"]
    resources = ["arn:aws:s3:::${var.frontend_bucket_name}"]
  }

  statement {
    actions   = ["cloudfront:CreateInvalidation"]
    resources = [var.cloudfront_distribution_arn]
  }

  # SSM access for tracking last deployed SHA
  statement {
    actions = [
      "ssm:GetParameter",
      "ssm:PutParameter",
    ]
    resources = ["arn:aws:ssm:*:*:parameter${var.ssm_parameter_prefix}/*"]
  }
}

resource "aws_iam_user_policy" "deploy" {
  name   = "blindsweeper-deploy-policy"
  user   = aws_iam_user.deploy.name
  policy = data.aws_iam_policy_document.deploy.json
}

resource "aws_iam_access_key" "deploy" {
  user = aws_iam_user.deploy.name
}
