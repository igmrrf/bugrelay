# Configuration Guide

This guide covers all configuration options for the BugRelay backend server, including environment variables, security settings, and deployment-specific configurations.

## Environment Variables

All configuration is managed through environment variables. The backend supports configuration through `.env` files or system environment variables.

### Database Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_HOST` | PostgreSQL database host | `localhost` | Yes |
| `DB_PORT` | PostgreSQL database port | `5432` | Yes |
| `DB_NAME` | Database name | `bugrelay` | Yes |
| `DB_USER` | Database username | `bugrelay_user` | Yes |
| `DB_PASSWORD` | Database password | - | Yes |
| `DB_SSLMODE` | SSL mode for database connection | `disable` | No |

**Example:**
```bash
DB_HOST=postgres.example.com
DB_PORT=5432
DB_NAME=bugrelay_production
DB_USER=bugrelay_user
DB_PASSWORD=secure_password_here
DB_SSLMODE=require
```

**SSL Modes:**
- `disable` - No SSL (development only)
- `require` - SSL required (recommended for production)
- `verify-ca` - SSL with CA verification
- `verify-full` - SSL with full verification

### Redis Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_HOST` | Redis server host | `localhost` | Yes |
| `REDIS_PORT` | Redis server port | `6379` | Yes |
| `REDIS_PASSWORD` | Redis password (if auth enabled) | - | No |
| `REDIS_DB` | Redis database number | `0` | No |

**Example:**
```bash
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=redis_password_here
REDIS_DB=0
```

### JWT Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Secret key for JWT signing | - | Yes |
| `JWT_ACCESS_TOKEN_TTL` | Access token lifetime | `15m` | No |
| `JWT_REFRESH_TOKEN_TTL` | Refresh token lifetime | `168h` | No |

**Example:**
```bash
JWT_SECRET=your_super_secure_jwt_secret_key_minimum_32_characters
JWT_ACCESS_TOKEN_TTL=15m
JWT_REFRESH_TOKEN_TTL=168h
```

**Security Notes:**
- JWT secret must be at least 32 characters long
- Use a cryptographically secure random string
- Rotate JWT secrets regularly in production
- Access tokens should have short lifetimes (15-30 minutes)
- Refresh tokens can have longer lifetimes (7-30 days)

### Server Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `8080` | No |
| `ENVIRONMENT` | Environment mode | `development` | No |
| `CORS_ALLOWED_ORIGINS` | Allowed CORS origins | `*` | No |
| `TRUSTED_PROXIES` | Trusted proxy IPs | - | No |

**Example:**
```bash
PORT=8080
ENVIRONMENT=production
CORS_ALLOWED_ORIGINS=https://bugrelay.com,https://app.bugrelay.com
TRUSTED_PROXIES=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16
```

**Environment Modes:**
- `development` - Debug logging, relaxed security
- `staging` - Production-like with debug features
- `production` - Optimized for performance and security

### OAuth Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | - | No |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | - | No |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | - | No |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret | - | No |
| `OAUTH_REDIRECT_URL` | OAuth callback URL | - | No |

**Example:**
```bash
GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
OAUTH_REDIRECT_URL=https://bugrelay.com/api/v1/auth/oauth/callback
```

**Setup Instructions:**
1. **Google OAuth:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs

2. **GitHub OAuth:**
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Create a new OAuth App
   - Set Authorization callback URL

### reCAPTCHA Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `RECAPTCHA_SECRET_KEY` | reCAPTCHA secret key | - | No |
| `RECAPTCHA_SITE_KEY` | reCAPTCHA site key | - | No |

**Example:**
```bash
RECAPTCHA_SECRET_KEY=6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
```

**Setup Instructions:**
1. Go to [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Register a new site
3. Choose reCAPTCHA v2 "I'm not a robot" checkbox
4. Add your domain(s)
5. Copy the site key and secret key

### Logging Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `LOG_LEVEL` | Logging level | `info` | No |
| `LOG_FORMAT` | Log output format | `json` | No |
| `LOG_OUTPUT` | Log output destination | `both` | No |
| `LOG_MAX_SIZE` | Max log file size (MB) | `100` | No |
| `LOG_MAX_BACKUPS` | Max backup files | `3` | No |
| `LOG_MAX_AGE` | Max age in days | `28` | No |
| `LOG_COMPRESS` | Compress old logs | `true` | No |

**Example:**
```bash
LOG_LEVEL=info
LOG_FORMAT=json
LOG_OUTPUT=both
LOG_MAX_SIZE=100
LOG_MAX_BACKUPS=3
LOG_MAX_AGE=28
LOG_COMPRESS=true
```

**Log Levels:**
- `debug` - Detailed debugging information
- `info` - General information messages
- `warn` - Warning messages
- `error` - Error messages only

**Log Formats:**
- `json` - Structured JSON format (recommended for production)
- `text` - Human-readable text format (good for development)

**Log Outputs:**
- `stdout` - Standard output only
- `file` - File only
- `both` - Both stdout and file

### Rate Limiting Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `RATE_LIMIT_ENABLED` | Enable rate limiting | `true` | No |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | Requests per minute | `100` | No |
| `RATE_LIMIT_BURST` | Burst capacity | `200` | No |
| `RATE_LIMIT_CLEANUP_INTERVAL` | Cleanup interval | `1m` | No |

**Example:**
```bash
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=100
RATE_LIMIT_BURST=200
RATE_LIMIT_CLEANUP_INTERVAL=1m
```

### File Upload Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `UPLOAD_PATH` | File upload directory | `./uploads` | No |
| `MAX_FILE_SIZE` | Max file size in bytes | `10485760` | No |
| `ALLOWED_FILE_TYPES` | Allowed MIME types | `image/*,text/*` | No |

**Example:**
```bash
UPLOAD_PATH=/app/uploads
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,text/plain
```

### Email Configuration (Future Use)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SMTP_HOST` | SMTP server host | - | No |
| `SMTP_PORT` | SMTP server port | `587` | No |
| `SMTP_USERNAME` | SMTP username | - | No |
| `SMTP_PASSWORD` | SMTP password | - | No |
| `SMTP_FROM` | From email address | - | No |

**Example:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=noreply@bugrelay.com
SMTP_PASSWORD=app_specific_password
SMTP_FROM=BugRelay <noreply@bugrelay.com>
```

## Configuration Files

### Environment Files

The application supports multiple environment files:

1. **`.env`** - Default environment file
2. **`.env.local`** - Local overrides (not committed to git)
3. **`.env.development`** - Development-specific settings
4. **`.env.production`** - Production-specific settings

**Loading Order:**
1. System environment variables (highest priority)
2. `.env.local`
3. `.env.{ENVIRONMENT}`
4. `.env` (lowest priority)

### Air Configuration (Development)

The `.air.toml` file configures hot reloading for development:

```toml
root = "."
tmp_dir = "tmp"

[build]
  cmd = "go build -o ./tmp/main ."
  bin = "./tmp/main"
  full_bin = ""
  include_ext = ["go", "tpl", "tmpl", "html", "yml", "yaml"]
  exclude_dir = ["assets", "tmp", "vendor", "testdata", "logs", ".git"]
  exclude_regex = ["_test.go"]
  delay = 1000
  stop_on_root = false
  log = "logs/build-errors.log"

[log]
  time = true

[color]
  main = "magenta"
  watcher = "cyan"
  build = "yellow"
  runner = "green"

[misc]
  clean_on_exit = true
```

## Security Configuration

### Production Security Checklist

- [ ] Use strong, unique passwords for all services
- [ ] Enable SSL/TLS for all connections
- [ ] Set `DB_SSLMODE=require` for database connections
- [ ] Use Redis AUTH with a strong password
- [ ] Generate a secure JWT secret (32+ characters)
- [ ] Configure proper CORS origins
- [ ] Enable rate limiting
- [ ] Set up proper firewall rules
- [ ] Use HTTPS for OAuth redirect URLs
- [ ] Enable security headers
- [ ] Set up log monitoring and alerting

### Security Headers

The application automatically sets security headers in production:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
```

### CORS Configuration

Configure CORS for your frontend domains:

```bash
# Single domain
CORS_ALLOWED_ORIGINS=https://bugrelay.com

# Multiple domains
CORS_ALLOWED_ORIGINS=https://bugrelay.com,https://app.bugrelay.com,https://admin.bugrelay.com

# Development (allow all - not recommended for production)
CORS_ALLOWED_ORIGINS=*
```

## Environment-Specific Configurations

### Development Configuration

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bugrelay_dev
DB_USER=bugrelay_user
DB_PASSWORD=bugrelay_password
DB_SSLMODE=disable

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Server
ENVIRONMENT=development
PORT=8080
CORS_ALLOWED_ORIGINS=*

# Logging
LOG_LEVEL=debug
LOG_FORMAT=text
LOG_OUTPUT=stdout

# Rate Limiting (more permissive)
RATE_LIMIT_REQUESTS_PER_MINUTE=1000
```

### Staging Configuration

```bash
# Database
DB_HOST=staging-db.example.com
DB_PORT=5432
DB_NAME=bugrelay_staging
DB_USER=bugrelay_user
DB_PASSWORD=staging_password
DB_SSLMODE=require

# Redis
REDIS_HOST=staging-redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=staging_redis_password

# Server
ENVIRONMENT=staging
PORT=8080
CORS_ALLOWED_ORIGINS=https://staging.bugrelay.com

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
LOG_OUTPUT=both

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=500
```

### Production Configuration

```bash
# Database
DB_HOST=prod-db.example.com
DB_PORT=5432
DB_NAME=bugrelay_production
DB_USER=bugrelay_user
DB_PASSWORD=super_secure_production_password
DB_SSLMODE=require

# Redis
REDIS_HOST=prod-redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=super_secure_redis_password

# Server
ENVIRONMENT=production
PORT=8080
CORS_ALLOWED_ORIGINS=https://bugrelay.com,https://app.bugrelay.com

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
LOG_OUTPUT=file

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=100
```

## Configuration Validation

The application validates configuration on startup and will fail to start with clear error messages if required variables are missing or invalid.

### Required Variables Check

```bash
# Check if all required variables are set
go run main.go --check-config
```

### Configuration Test

```bash
# Test database connection
go run main.go --test-db

# Test Redis connection
go run main.go --test-redis

# Test all connections
go run main.go --test-all
```

## Troubleshooting

### Common Configuration Issues

1. **Database Connection Failed**
   ```
   Error: failed to connect to database: dial tcp: lookup postgres on 127.0.0.11:53: no such host
   ```
   - Check `DB_HOST` is correct
   - Ensure database server is running
   - Verify network connectivity

2. **Redis Connection Failed**
   ```
   Error: failed to connect to Redis: dial tcp 127.0.0.1:6379: connect: connection refused
   ```
   - Check `REDIS_HOST` and `REDIS_PORT`
   - Ensure Redis server is running
   - Verify Redis password if AUTH is enabled

3. **JWT Secret Too Short**
   ```
   Error: JWT secret must be at least 32 characters long
   ```
   - Generate a longer JWT secret
   - Use a cryptographically secure random string

4. **Invalid OAuth Configuration**
   ```
   Error: OAuth redirect URL must use HTTPS in production
   ```
   - Use HTTPS URLs for OAuth redirects in production
   - Ensure OAuth client IDs and secrets are correct

### Configuration Debugging

Enable debug logging to see configuration loading:

```bash
LOG_LEVEL=debug go run main.go
```

This will show which configuration files are loaded and which environment variables are used.

## Best Practices

1. **Use Environment-Specific Files**
   - Keep sensitive data out of version control
   - Use `.env.example` files as templates
   - Document all required variables

2. **Secure Secrets Management**
   - Use a secrets management system in production
   - Rotate secrets regularly
   - Never commit secrets to version control

3. **Configuration Validation**
   - Validate configuration on application startup
   - Provide clear error messages for invalid config
   - Use reasonable defaults where possible

4. **Documentation**
   - Document all configuration options
   - Provide examples for each environment
   - Keep documentation up to date

5. **Monitoring**
   - Monitor configuration changes
   - Alert on configuration errors
   - Log configuration loading events