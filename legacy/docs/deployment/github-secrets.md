# GitHub Secrets Configuration Guide

This document provides a comprehensive guide for configuring GitHub Secrets required for the BugRelay deployment automation system.

## Overview

GitHub Secrets are encrypted environment variables that store sensitive information needed for CI/CD workflows. These secrets are used for SSH authentication, API tokens, passwords, and other sensitive configuration data required for automated deployments.

## Required GitHub Secrets

### SSH Authentication Secrets

#### `DO_SSH_PRIVATE_KEY`
- **Description**: SSH private key for authenticating to Digital Ocean droplet
- **Format**: RSA or Ed25519 private key in OpenSSH format
- **Example Format**:
  ```
  -----BEGIN OPENSSH PRIVATE KEY-----
  b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAlwAAAAdzc2gtcn
  ...
  -----END OPENSSH PRIVATE KEY-----
  ```
- **Requirements**: 
  - Must be a valid SSH private key
  - Corresponding public key must be added to Digital Ocean droplet
  - Key should be dedicated for deployment use only
  - Minimum 2048-bit RSA or Ed25519 recommended

#### `DO_HOST`
- **Description**: Digital Ocean droplet hostname or IP address
- **Format**: Hostname (FQDN) or IP address
- **Example**: `bugrelay.com` or `192.168.1.100`
- **Requirements**: Must be accessible from GitHub Actions runners

#### `DO_USER`
- **Description**: SSH username for deployment user on Digital Ocean droplet
- **Format**: Unix username
- **Example**: `deploy`
- **Requirements**: 
  - User must exist on target server
  - User must have sudo privileges for deployment operations
  - User's home directory must contain authorized_keys with public key

### Application Configuration Secrets

#### `DEPLOYMENT_ENV_FILE`
- **Description**: Complete environment file content for production deployment
- **Format**: Multi-line environment variable file content
- **Example**:
  ```
  DB_HOST=localhost
  DB_PORT=5432
  DB_NAME=bugrelay_production
  DB_USER=bugrelay_user
  DB_PASSWORD=secure_password_here
  REDIS_HOST=localhost
  REDIS_PORT=6379
  REDIS_PASSWORD=redis_password_here
  JWT_SECRET=jwt_secret_key_here
  LOGS_API_KEY=logs_api_key_here
  ```
- **Requirements**: Must contain all required environment variables for production

#### `NEXT_PUBLIC_API_URL`
- **Description**: Public API URL for frontend application
- **Format**: Full URL with protocol
- **Example**: `https://api.bugrelay.com`
- **Requirements**: Must be accessible from client browsers

### Database Secrets

#### `DB_PASSWORD`
- **Description**: PostgreSQL database password for production
- **Format**: String password
- **Requirements**: 
  - Minimum 12 characters
  - Include uppercase, lowercase, numbers, and special characters
  - Should not contain quotes or special shell characters

#### `REDIS_PASSWORD`
- **Description**: Redis password for production
- **Format**: String password
- **Requirements**: Same as DB_PASSWORD

### Security Secrets

#### `JWT_SECRET`
- **Description**: Secret key for JWT token signing
- **Format**: Base64 encoded string or random string
- **Requirements**: 
  - Minimum 32 characters
  - Cryptographically random
  - Should be unique per environment

#### `LOGS_API_KEY`
- **Description**: API key for accessing logs endpoint
- **Format**: UUID or random string
- **Requirements**: Should be unique and unpredictable

### Notification Secrets

#### `SLACK_WEBHOOK_URL`
- **Description**: Slack webhook URL for deployment notifications
- **Format**: Full Slack webhook URL

- **Requirements**: Must be a valid Slack incoming webhook URL

### Monitoring Secrets

#### `GRAFANA_ADMIN_PASSWORD`
- **Description**: Admin password for Grafana dashboard
- **Format**: String password
- **Requirements**: Same as DB_PASSWORD requirements

## Secret Categories by Workflow

### Backend Deployment Workflow
Required secrets:
- `DO_SSH_PRIVATE_KEY`
- `DO_HOST`
- `DO_USER`
- `DEPLOYMENT_ENV_FILE`
- `SLACK_WEBHOOK_URL`

### Frontend Deployment Workflow
Required secrets:
- `DO_SSH_PRIVATE_KEY`
- `DO_HOST`
- `DO_USER`
- `NEXT_PUBLIC_API_URL`
- `SLACK_WEBHOOK_URL`

### Monitoring Deployment Workflow
Required secrets:
- `DO_SSH_PRIVATE_KEY`
- `DO_HOST`
- `DO_USER`
- `GRAFANA_ADMIN_PASSWORD`
- `SLACK_WEBHOOK_URL`

### Documentation Deployment Workflow
Required secrets:
- `DO_SSH_PRIVATE_KEY`
- `DO_HOST`
- `DO_USER`
- `SLACK_WEBHOOK_URL`

## Secret Configuration Steps

### 1. Navigate to Repository Settings
1. Go to your GitHub repository
2. Click on "Settings" tab
3. In the left sidebar, click "Secrets and variables"
4. Click "Actions"

### 2. Add Repository Secrets
For each required secret:
1. Click "New repository secret"
2. Enter the secret name (exactly as listed above)
3. Enter the secret value
4. Click "Add secret"

### 3. Verify Secret Configuration
After adding all secrets, verify:
- All required secrets are present
- Secret names match exactly (case-sensitive)
- No typos in secret names
- Values are properly formatted

## Secret Format Validation

### SSH Private Key Validation
```bash
# Validate SSH private key format
ssh-keygen -l -f /path/to/private/key

# Test SSH connection
ssh -i /path/to/private/key -o ConnectTimeout=10 user@host "echo 'Connection successful'"
```

### Environment File Validation
```bash
# Check environment file syntax
set -a
source .env.production
set +a
echo "Environment file is valid"
```

### URL Validation
```bash
# Validate API URL accessibility
curl -f -s -o /dev/null "$NEXT_PUBLIC_API_URL/health" || echo "URL not accessible"
```

## Secret Rotation Procedures

### SSH Key Rotation (Every 90 Days)

1. **Generate New SSH Key Pair**
   ```bash
   ssh-keygen -t ed25519 -C "bugrelay-deployment-$(date +%Y%m%d)" -f ~/.ssh/bugrelay_deploy_new
   ```

2. **Add New Public Key to Server**
   ```bash
   ssh-copy-id -i ~/.ssh/bugrelay_deploy_new.pub deploy@bugrelay.com
   ```

3. **Test New Key**
   ```bash
   ssh -i ~/.ssh/bugrelay_deploy_new deploy@bugrelay.com "echo 'New key works'"
   ```

4. **Update GitHub Secret**
   - Copy content of `~/.ssh/bugrelay_deploy_new`
   - Update `DO_SSH_PRIVATE_KEY` secret in GitHub
   - Test deployment with new key

5. **Remove Old Key from Server**
   ```bash
   # Remove old public key from ~/.ssh/authorized_keys on server
   ssh deploy@bugrelay.com "sed -i '/old-key-comment/d' ~/.ssh/authorized_keys"
   ```

### Database Password Rotation (Every 180 Days)

1. **Generate New Password**
   ```bash
   openssl rand -base64 32
   ```

2. **Update Database User Password**
   ```sql
   ALTER USER bugrelay_user WITH PASSWORD 'new_password_here';
   ```

3. **Update GitHub Secrets**
   - Update `DB_PASSWORD` in GitHub Secrets
   - Update `DEPLOYMENT_ENV_FILE` with new password

4. **Test Database Connection**
   - Deploy to staging environment
   - Verify application connects successfully

### JWT Secret Rotation (Every 365 Days)

1. **Generate New JWT Secret**
   ```bash
   openssl rand -base64 64
   ```

2. **Update GitHub Secrets**
   - Update `JWT_SECRET` in GitHub Secrets
   - Update `DEPLOYMENT_ENV_FILE` with new secret

3. **Deploy and Verify**
   - Deploy to production
   - Verify JWT tokens are generated correctly
   - Note: This will invalidate all existing JWT tokens

### API Key Rotation (Every 180 Days)

1. **Generate New API Keys**
   ```bash
   # Generate new logs API key
   uuidgen
   ```

2. **Update GitHub Secrets**
   - Update `LOGS_API_KEY` in GitHub Secrets
   - Update `DEPLOYMENT_ENV_FILE` with new key

3. **Update Client Applications**
   - Update any applications using the API key
   - Test API access with new key

## Security Best Practices

### Secret Management
- **Never commit secrets to code**: Always use GitHub Secrets or environment variables
- **Use unique secrets per environment**: Different secrets for staging and production
- **Implement secret rotation**: Regular rotation reduces risk of compromise
- **Audit secret access**: Monitor who has access to secrets
- **Use least privilege**: Only grant access to secrets that are needed

### SSH Key Security
- **Use Ed25519 keys**: More secure than RSA keys
- **Protect private keys**: Never share or expose private keys
- **Use dedicated deployment keys**: Separate keys for deployment vs. development
- **Implement key rotation**: Regular rotation reduces risk
- **Monitor SSH access**: Log and monitor SSH connections

### Password Security
- **Use strong passwords**: Minimum 12 characters with mixed case, numbers, symbols
- **Use unique passwords**: Different passwords for each service
- **Avoid common patterns**: No dictionary words or predictable patterns
- **Use password managers**: Generate and store passwords securely

## Troubleshooting

### Common Issues

#### SSH Authentication Failures
```bash
# Debug SSH connection
ssh -vvv -i ~/.ssh/private_key user@host

# Check key permissions
chmod 600 ~/.ssh/private_key
chmod 644 ~/.ssh/private_key.pub

# Verify key format
ssh-keygen -l -f ~/.ssh/private_key
```

#### Environment Variable Issues
```bash
# Check environment file syntax
bash -n .env.production

# Test environment loading
set -a && source .env.production && set +a && env | grep -E "(DB_|REDIS_|JWT_)"
```

#### Webhook Failures
```bash
# Test Slack webhook
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test notification"}' \
  "$SLACK_WEBHOOK_URL"
```

### Error Messages and Solutions

#### "Permission denied (publickey)"
- **Cause**: SSH key not properly configured
- **Solution**: Verify public key is in server's authorized_keys file
- **Check**: Ensure private key format is correct in GitHub Secret

#### "Host key verification failed"
- **Cause**: Server host key not recognized
- **Solution**: Add server to known_hosts or disable host key checking for deployment
- **Security Note**: Only disable host key checking if using trusted network

#### "Invalid environment file"
- **Cause**: Syntax error in DEPLOYMENT_ENV_FILE
- **Solution**: Validate environment file syntax locally before updating secret

#### "Webhook URL not found"
- **Cause**: Invalid or expired Slack webhook URL
- **Solution**: Generate new webhook URL in Slack and update secret

## Monitoring and Alerting

### Secret Expiration Monitoring
Set up alerts for:
- SSH key expiration (90 days)
- Database password expiration (180 days)
- JWT secret expiration (365 days)
- SSL certificate expiration (30 days before)

### Failed Authentication Monitoring
Monitor for:
- SSH authentication failures
- Database connection failures
- API authentication failures
- Webhook delivery failures

### Audit Logging
Log all secret-related activities:
- Secret updates in GitHub
- SSH key usage
- Database password changes
- API key usage

## Compliance and Governance

### Access Control
- Limit GitHub repository admin access
- Use GitHub Teams for secret access control
- Implement approval workflows for secret changes
- Regular access reviews

### Documentation Requirements
- Document all secrets and their purpose
- Maintain secret inventory
- Document rotation procedures
- Keep security contact information current

### Incident Response
- Procedures for compromised secrets
- Emergency secret rotation
- Communication protocols
- Post-incident reviews

## References

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [SSH Key Management Best Practices](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [Digital Ocean SSH Key Setup](https://docs.digitalocean.com/products/droplets/how-to/add-ssh-keys/)
- [Slack Webhook Configuration](https://api.slack.com/messaging/webhooks)
