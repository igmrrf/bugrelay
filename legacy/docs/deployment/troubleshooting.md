# Deployment Troubleshooting Guide

This guide provides solutions to common deployment issues, error messages, debugging steps, and recovery procedures for BugRelay deployments.

## Quick Diagnostic Commands

Run these commands first to gather information:

```bash
# Check all services status
./scripts/health-check.sh

# Check system resources
df -h                    # Disk space
free -h                  # Memory
top                      # CPU usage

# Check service status
sudo systemctl status bugrelay-backend
sudo systemctl status bugrelay-frontend
docker compose ps        # Monitoring services

# Check recent logs
tail -100 /opt/bugrelay/logs/backend.log
tail -100 /opt/bugrelay/logs/frontend.log
tail -100 /opt/bugrelay/logs/deployment.log

# Check network connectivity
curl http://localhost:8080/api/v1/health
curl http://localhost:3000
curl https://bugrelay.com
```

## Common Deployment Issues

### 1. GitHub Actions Workflow Fails

#### 1.1 Workflow Fails at Test Stage

**Symptoms**:
- GitHub Actions workflow fails during test job
- Error message: "Tests failed" or "Linting errors"

**Causes**:
- Failing unit tests
- Linting errors
- Type checking errors
- Missing dependencies

**Solutions**:

```bash
# Run tests locally to reproduce
cd backend && go test ./...
cd frontend && npm test

# Run linting
cd backend && golangci-lint run
cd frontend && npm run lint

# Fix errors and commit
git add .
git commit -m "fix: resolve test failures"
git push origin main
```

**Prevention**:
- Run tests locally before pushing
- Set up pre-commit hooks
- Use IDE linting integration

#### 1.2 Workflow Fails at Build Stage

**Symptoms**:
- Build job fails in GitHub Actions
- Error message: "Build failed" or "Compilation error"

**Causes**:
- Syntax errors
- Missing dependencies
- Build configuration issues
- Environment variable issues

**Solutions**:

```bash
# Build locally to reproduce
cd backend && go build
cd frontend && npm run build

# Check for missing dependencies
cd backend && go mod tidy
cd frontend && npm install

# Verify environment variables
cat .env.example
# Ensure all required variables are set

# Fix errors and push
git add .
git commit -m "fix: resolve build errors"
git push origin main
```

**Prevention**:
- Build locally before pushing
- Keep dependencies updated
- Document required environment variables

#### 1.3 Workflow Fails at Deploy Stage

**Symptoms**:
- Deploy job fails in GitHub Actions
- Error message: "SSH connection failed" or "Permission denied"

**Causes**:
- SSH key issues
- Incorrect GitHub Secrets
- Server unreachable
- Firewall blocking connection
- Deployment script errors

**Solutions**:

```bash
# Verify GitHub Secrets
# Go to Settings → Secrets → Actions
# Check: DO_SSH_PRIVATE_KEY, DO_HOST, DO_USER

# Test SSH connection manually
ssh -i ~/.ssh/github_deploy deploy@bugrelay.com

# If connection fails, check server
# On server:
sudo ufw status                    # Check firewall
sudo systemctl status sshd         # Check SSH service
sudo tail -f /var/log/auth.log     # Check SSH logs

# Verify SSH key on server
cat ~/.ssh/authorized_keys
# Ensure GitHub deploy key is present

# Check deployment script
ssh deploy@bugrelay.com
cd /opt/bugrelay
./scripts/deploy.sh backend --dry-run
```

**Prevention**:
- Test SSH connection before deployment
- Keep GitHub Secrets updated
- Monitor server accessibility
- Test deployment scripts regularly

### 2. SSH Connection Issues

#### 2.1 Connection Timeout

**Symptoms**:
- SSH connection times out
- Error: "Connection timed out"

**Causes**:
- Server down or unreachable
- Firewall blocking SSH
- Network issues
- Wrong IP address

**Solutions**:

```bash
# Check if server is reachable
ping bugrelay.com

# Check if SSH port is open
telnet bugrelay.com 22
# Or
nc -zv bugrelay.com 22

# Check firewall rules on server
# (requires console access or existing SSH session)
sudo ufw status
sudo ufw allow 22/tcp

# Verify correct IP address
dig bugrelay.com +short

# Check Digital Ocean console
# Log into Digital Ocean dashboard
# Check droplet status and console access
```

**Prevention**:
- Monitor server uptime
- Configure firewall correctly
- Use monitoring alerts
- Keep backup access method (console)

#### 2.2 Permission Denied (publickey)

**Symptoms**:
- SSH connection refused
- Error: "Permission denied (publickey)"

**Causes**:
- SSH key not authorized
- Wrong SSH key used
- Incorrect file permissions
- SSH key not in GitHub Secrets

**Solutions**:

```bash
# Verify SSH key
ssh -v -i ~/.ssh/github_deploy deploy@bugrelay.com
# Look for "Offering public key" and "Server accepts key"

# Check key permissions
ls -la ~/.ssh/github_deploy
# Should be: -rw------- (600)
chmod 600 ~/.ssh/github_deploy

# Add key to server (if not present)
ssh-copy-id -i ~/.ssh/github_deploy.pub deploy@bugrelay.com

# Or manually add to authorized_keys
# On server:
nano ~/.ssh/authorized_keys
# Paste public key, save

# Verify authorized_keys permissions
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# Update GitHub Secret
# Copy private key content
cat ~/.ssh/github_deploy
# Update DO_SSH_PRIVATE_KEY in GitHub Secrets
```

**Prevention**:
- Keep SSH keys secure and backed up
- Document key rotation procedures
- Test SSH access regularly
- Use key management system

#### 2.3 Host Key Verification Failed

**Symptoms**:
- SSH connection fails
- Error: "Host key verification failed"

**Causes**:
- Server host key changed
- Server reinstalled
- Man-in-the-middle attack (rare)

**Solutions**:

```bash
# Remove old host key
ssh-keygen -R bugrelay.com
ssh-keygen -R 123.45.67.89

# Connect and accept new host key
ssh -i ~/.ssh/github_deploy deploy@bugrelay.com
# Type "yes" when prompted

# For GitHub Actions, update known_hosts
# Or disable host key checking (less secure)
# In workflow:
# ssh -o StrictHostKeyChecking=no ...
```

**Prevention**:
- Document server changes
- Keep host keys backed up
- Use known_hosts file

### 3. Health Check Failures

#### 3.1 Backend Health Check Fails

**Symptoms**:
- Health check returns non-200 status
- Error: "Backend health check failed"
- Deployment triggers automatic rollback

**Causes**:
- Backend service not running
- Database connection failed
- Redis connection failed
- Configuration error
- Port conflict

**Solutions**:

```bash
# Check backend service status
sudo systemctl status bugrelay-backend

# If not running, check logs
sudo journalctl -u bugrelay-backend -n 100

# Check backend logs
tail -100 /opt/bugrelay/logs/backend.log
tail -100 /opt/bugrelay/logs/backend-error.log

# Test health endpoint locally
curl http://localhost:8080/api/v1/health

# Check database connectivity
psql -U bugrelay_user -d bugrelay_production -h localhost -c "SELECT 1;"

# Check Redis connectivity
redis-cli -a your_redis_password PING

# Check port availability
sudo netstat -tlnp | grep 8080

# Restart backend service
sudo systemctl restart bugrelay-backend

# Wait and check again
sleep 10
curl http://localhost:8080/api/v1/health
```

**Common Error Messages**:

**"Database connection failed"**:
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database credentials
cat /opt/bugrelay/.env | grep DB_

# Test connection
psql -U bugrelay_user -d bugrelay_production -h localhost

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

**"Redis connection failed"**:
```bash
# Check Redis status
sudo systemctl status redis-server

# Test connection
redis-cli -a your_redis_password PING

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log

# Check Redis configuration
sudo nano /etc/redis/redis.conf
# Verify: bind 127.0.0.1, requirepass
```

**"Port already in use"**:
```bash
# Find process using port 8080
sudo lsof -i :8080

# Kill process if needed
sudo kill -9 <PID>

# Or change backend port
# Edit .env: BACKEND_PORT=8081
sudo systemctl restart bugrelay-backend
```

**Prevention**:
- Monitor service health continuously
- Set up alerts for service failures
- Test database/Redis connectivity regularly
- Keep services updated

#### 3.2 Frontend Health Check Fails

**Symptoms**:
- Frontend not accessible
- Error: "Frontend health check failed"
- 502 Bad Gateway or 504 Gateway Timeout

**Causes**:
- Frontend service not running
- Build errors
- Port conflict
- Nginx misconfiguration
- Backend API unreachable

**Solutions**:

```bash
# Check frontend service status
sudo systemctl status bugrelay-frontend

# Check frontend logs
tail -100 /opt/bugrelay/logs/frontend.log
tail -100 /opt/bugrelay/logs/frontend-error.log

# Test frontend locally
curl http://localhost:3000

# Check Nginx status
sudo systemctl status nginx

# Check Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Restart frontend service
sudo systemctl restart bugrelay-frontend

# Restart Nginx
sudo systemctl restart nginx

# Wait and check again
sleep 10
curl http://localhost:3000
curl https://bugrelay.com
```

**Common Error Messages**:

**"502 Bad Gateway"**:
```bash
# Frontend service not running or crashed
sudo systemctl status bugrelay-frontend
sudo systemctl restart bugrelay-frontend

# Check Nginx upstream configuration
sudo nano /etc/nginx/sites-available/bugrelay.conf
# Verify proxy_pass points to correct port
```

**"504 Gateway Timeout"**:
```bash
# Frontend taking too long to respond
# Check frontend logs for slow operations
tail -f /opt/bugrelay/logs/frontend.log

# Increase Nginx timeout
sudo nano /etc/nginx/sites-available/bugrelay.conf
# Add: proxy_read_timeout 300s;
sudo nginx -s reload
```

**"Cannot connect to backend API"**:
```bash
# Check backend is running
curl http://localhost:8080/api/v1/health

# Check frontend environment variables
cat /opt/bugrelay/frontend/.env | grep API_URL
# Should be: API_URL=https://bugrelay.com/api/v1

# Restart frontend
sudo systemctl restart bugrelay-frontend
```

**Prevention**:
- Monitor frontend service health
- Set up Nginx monitoring
- Test frontend builds before deployment
- Keep Nginx configuration backed up

#### 3.3 Monitoring Stack Health Check Fails

**Symptoms**:
- Monitoring services not accessible
- Grafana dashboard not loading
- Prometheus not collecting metrics

**Causes**:
- Docker containers not running
- Configuration errors
- Port conflicts
- Resource exhaustion

**Solutions**:

```bash
# Check Docker containers
docker compose ps

# Check container logs
docker compose logs grafana
docker compose logs prometheus
docker compose logs loki

# Restart monitoring stack
cd /opt/bugrelay/monitoring
docker compose restart

# Or full restart
docker compose down
docker compose up -d

# Check individual services
curl http://localhost:3001/api/health        # Grafana
curl http://localhost:9090/-/healthy         # Prometheus
curl http://localhost:3100/ready             # Loki

# Check resource usage
docker stats
```

**Common Error Messages**:

**"Container exited with code 1"**:
```bash
# Check container logs for error
docker compose logs <service-name>

# Common causes:
# - Configuration error
# - Permission issues
# - Port already in use

# Fix configuration and restart
docker compose up -d <service-name>
```

**"Cannot connect to Grafana"**:
```bash
# Check Grafana container
docker compose ps grafana

# Check Grafana logs
docker compose logs grafana

# Restart Grafana
docker compose restart grafana

# Check Nginx configuration for monitoring
sudo nano /etc/nginx/sites-available/monitoring.conf
sudo nginx -t
sudo nginx -s reload
```

**"Prometheus not scraping metrics"**:
```bash
# Check Prometheus configuration
cat /opt/bugrelay/monitoring/prometheus/prometheus.yml

# Validate configuration
docker compose exec prometheus promtool check config /etc/prometheus/prometheus.yml

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Restart Prometheus
docker compose restart prometheus
```

**Prevention**:
- Monitor Docker container health
- Validate configurations before deployment
- Set up alerts for monitoring failures
- Keep monitoring stack updated

### 4. Deployment Script Errors

#### 4.1 Backup Script Fails

**Symptoms**:
- Backup creation fails
- Error: "Backup failed"
- Deployment aborts

**Causes**:
- Insufficient disk space
- Permission issues
- Backup directory doesn't exist

**Solutions**:

```bash
# Check disk space
df -h /opt/bugrelay/backups

# Create backup directory if missing
mkdir -p /opt/bugrelay/backups
chmod 755 /opt/bugrelay/backups

# Check permissions
ls -la /opt/bugrelay/backups
# Should be owned by deploy user

# Fix permissions
sudo chown -R deploy:deploy /opt/bugrelay/backups

# Test backup manually
cp /opt/bugrelay/backend/bugrelay-api \
   /opt/bugrelay/backups/test-backup

# Clean up old backups to free space
cd /opt/bugrelay/backups
ls -t | tail -n +6 | xargs rm -f
```

**Prevention**:
- Monitor disk space
- Set up automatic backup cleanup
- Test backup procedures regularly
- Configure backup retention policy

#### 4.2 Rollback Script Fails

**Symptoms**:
- Rollback fails to restore service
- Error: "Rollback failed"
- Service remains down

**Causes**:
- Backup file corrupted or missing
- Permission issues
- Service won't start with old version

**Solutions**:

```bash
# Check backup exists
ls -la /opt/bugrelay/backups/

# Verify backup integrity
file /opt/bugrelay/backups/bugrelay-api-*
# Should show: ELF 64-bit LSB executable

# Test backup manually
cp /opt/bugrelay/backups/bugrelay-api-20241208-143022 \
   /tmp/test-backup
chmod +x /tmp/test-backup
/tmp/test-backup --version

# If backup is good, restore manually
sudo systemctl stop bugrelay-backend
cp /opt/bugrelay/backups/bugrelay-api-20241208-143022 \
   /opt/bugrelay/backend/bugrelay-api
chmod +x /opt/bugrelay/backend/bugrelay-api
sudo systemctl start bugrelay-backend

# Check service status
sudo systemctl status bugrelay-backend
curl http://localhost:8080/api/v1/health
```

**Prevention**:
- Test rollback procedures regularly
- Verify backup integrity
- Keep multiple backup versions
- Document rollback procedures

### 5. Resource Exhaustion Issues

#### 5.1 Disk Space Full

**Symptoms**:
- Deployment fails
- Error: "No space left on device"
- Services crash

**Causes**:
- Log files too large
- Too many backups
- Docker images accumulating
- Database too large

**Solutions**:

```bash
# Check disk usage
df -h

# Find large files
du -sh /opt/bugrelay/* | sort -h
du -sh /var/log/* | sort -h

# Clean up logs
sudo truncate -s 0 /opt/bugrelay/logs/*.log
sudo journalctl --vacuum-time=7d

# Clean up old backups
cd /opt/bugrelay/backups
ls -t | tail -n +6 | xargs rm -f

# Clean up Docker
docker system prune -a -f
docker volume prune -f

# Clean up package cache
sudo apt clean
sudo apt autoremove

# Check disk space again
df -h
```

**Prevention**:
- Set up log rotation
- Configure automatic backup cleanup
- Monitor disk usage
- Set up disk space alerts

#### 5.2 Memory Exhaustion

**Symptoms**:
- Services crash
- OOM (Out of Memory) errors
- System becomes unresponsive

**Causes**:
- Memory leak in application
- Too many services running
- Insufficient server memory
- Database cache too large

**Solutions**:

```bash
# Check memory usage
free -h
top
htop

# Check which process is using memory
ps aux --sort=-%mem | head -n 10

# Restart services to free memory
sudo systemctl restart bugrelay-backend
sudo systemctl restart bugrelay-frontend
docker compose restart

# Check for memory leaks
# Monitor memory usage over time
watch -n 5 free -h

# If persistent, increase server memory
# Or optimize application memory usage
```

**Prevention**:
- Monitor memory usage
- Set up memory alerts
- Optimize application memory usage
- Consider upgrading server

#### 5.3 CPU Overload

**Symptoms**:
- Slow response times
- High CPU usage
- Services timing out

**Causes**:
- Inefficient code
- Too many concurrent requests
- Background jobs running
- Database queries slow

**Solutions**:

```bash
# Check CPU usage
top
htop

# Check which process is using CPU
ps aux --sort=-%cpu | head -n 10

# Check load average
uptime

# Identify slow database queries
# Connect to PostgreSQL
psql -U bugrelay_user -d bugrelay_production
# Run:
SELECT pid, query, state, query_start
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY query_start;

# Kill slow queries if needed
SELECT pg_terminate_backend(pid);

# Restart services if needed
sudo systemctl restart bugrelay-backend
```

**Prevention**:
- Monitor CPU usage
- Optimize slow queries
- Implement caching
- Use rate limiting
- Consider scaling horizontally

### 6. SSL Certificate Issues

#### 6.1 Certificate Expired

**Symptoms**:
- HTTPS not working
- Browser shows certificate error
- Error: "Certificate has expired"

**Causes**:
- Let's Encrypt certificate expired
- Auto-renewal failed

**Solutions**:

```bash
# Check certificate expiration
sudo certbot certificates

# Renew certificate
sudo certbot renew

# If renewal fails, force renewal
sudo certbot renew --force-renewal

# Restart Nginx
sudo systemctl restart nginx

# Verify HTTPS working
curl -I https://bugrelay.com
```

**Prevention**:
- Monitor certificate expiration
- Set up expiration alerts
- Test auto-renewal regularly
- Keep certbot updated

#### 6.2 Certificate Renewal Fails

**Symptoms**:
- Auto-renewal fails
- Error in certbot logs

**Causes**:
- Port 80 blocked
- Nginx not stopped during renewal
- DNS issues
- Rate limiting

**Solutions**:

```bash
# Check certbot logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Stop Nginx temporarily
sudo systemctl stop nginx

# Renew certificate
sudo certbot renew --standalone

# Start Nginx
sudo systemctl start nginx

# If rate limited, wait and try again
# Let's Encrypt has rate limits:
# - 5 failures per hour
# - 50 certificates per domain per week
```

**Prevention**:
- Configure certbot to use webroot
- Don't stop Nginx during renewal
- Monitor renewal logs
- Set up renewal alerts

### 7. Database Issues

#### 7.1 Database Connection Pool Exhausted

**Symptoms**:
- Backend slow or timing out
- Error: "Too many connections"

**Causes**:
- Connection leak in application
- Too many concurrent requests
- Connection pool too small

**Solutions**:

```bash
# Check active connections
psql -U bugrelay_user -d bugrelay_production -c \
  "SELECT count(*) FROM pg_stat_activity;"

# Check connection limit
psql -U bugrelay_user -d bugrelay_production -c \
  "SHOW max_connections;"

# Kill idle connections
psql -U bugrelay_user -d bugrelay_production -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
   WHERE state = 'idle' AND state_change < now() - interval '5 minutes';"

# Restart backend to reset connections
sudo systemctl restart bugrelay-backend

# Increase connection pool size
# Edit backend configuration
nano /opt/bugrelay/backend/config.yaml
# Increase max_connections

# Increase PostgreSQL max_connections
sudo nano /etc/postgresql/14/main/postgresql.conf
# Set: max_connections = 200
sudo systemctl restart postgresql
```

**Prevention**:
- Monitor connection pool usage
- Fix connection leaks
- Configure appropriate pool size
- Implement connection timeout

#### 7.2 Database Migration Fails

**Symptoms**:
- Deployment fails during migration
- Error: "Migration failed"
- Database in inconsistent state

**Causes**:
- Migration script error
- Database locked
- Insufficient permissions
- Data conflicts

**Solutions**:

```bash
# Check migration status
psql -U bugrelay_user -d bugrelay_production -c \
  "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"

# Rollback failed migration
# (if migration tool supports it)
cd /opt/bugrelay/backend
./migrate down 1

# Fix migration script
nano migrations/XXX_failed_migration.sql

# Run migration manually
psql -U bugrelay_user -d bugrelay_production < migrations/XXX_failed_migration.sql

# Or run migration tool
./migrate up

# Verify migration
psql -U bugrelay_user -d bugrelay_production -c \
  "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 1;"
```

**Prevention**:
- Test migrations in staging
- Use migration transactions
- Backup database before migrations
- Keep migrations reversible

## Error Message Reference

### Backend Error Messages

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Database connection failed" | PostgreSQL not running or wrong credentials | Check PostgreSQL status, verify credentials |
| "Redis connection failed" | Redis not running or wrong password | Check Redis status, verify password |
| "Port already in use" | Another process using port 8080 | Kill process or change port |
| "Failed to load configuration" | Missing or invalid .env file | Check .env file exists and is valid |
| "Migration failed" | Database migration error | Check migration logs, rollback if needed |

### Frontend Error Messages

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Cannot connect to API" | Backend not running or wrong API_URL | Check backend status, verify API_URL |
| "Build failed" | Syntax error or missing dependency | Check build logs, fix errors |
| "502 Bad Gateway" | Frontend service not running | Restart frontend service |
| "504 Gateway Timeout" | Frontend taking too long | Check frontend logs, increase timeout |

### Deployment Error Messages

| Error Message | Cause | Solution |
| "SSH connection failed" | SSH key or network issue | Verify SSH key, check network |
| "Permission denied" | Insufficient permissions | Check file permissions, user permissions |
| "No space left on device" | Disk full | Clean up logs, backups, Docker images |
| "Health check failed" | Service not healthy | Check service logs, verify configuration |
| "Rollback failed" | Backup missing or corrupted | Verify backup exists, restore manually |

## Debugging Steps

### Step 1: Gather Information

```bash
# System information
uname -a
df -h
free -h
uptime

# Service status
sudo systemctl status bugrelay-backend
sudo systemctl status bugrelay-frontend
docker compose ps

# Recent logs
tail -100 /opt/bugrelay/logs/backend.log
tail -100 /opt/bugrelay/logs/frontend.log
tail -100 /opt/bugrelay/logs/deployment.log

# Network connectivity
curl http://localhost:8080/api/v1/health
curl http://localhost:3000
curl https://bugrelay.com
```

### Step 2: Identify Root Cause

```bash
# Check for errors in logs
grep -i error /opt/bugrelay/logs/*.log

# Check for warnings
grep -i warning /opt/bugrelay/logs/*.log

# Check system logs
sudo journalctl -xe

# Check Nginx logs
sudo tail -100 /var/log/nginx/error.log
```

### Step 3: Test Hypothesis

```bash
# Test specific component
curl http://localhost:8080/api/v1/health

# Test database connectivity
psql -U bugrelay_user -d bugrelay_production -c "SELECT 1;"

# Test Redis connectivity
redis-cli -a your_password PING

# Test file permissions
ls -la /opt/bugrelay/
```

### Step 4: Apply Fix

```bash
# Restart service
sudo systemctl restart bugrelay-backend

# Update configuration
nano /opt/bugrelay/.env

# Fix permissions
sudo chown -R deploy:deploy /opt/bugrelay/

# Clear cache
redis-cli -a your_password FLUSHALL
```

### Step 5: Verify Fix

```bash
# Run health checks
./scripts/health-check.sh

# Check service status
sudo systemctl status bugrelay-backend

# Test functionality
curl https://bugrelay.com/api/v1/health

# Monitor logs
tail -f /opt/bugrelay/logs/backend.log
```

## Emergency Procedures

### Complete System Failure

If all services are down:

```bash
# 1. SSH to server
ssh deploy@bugrelay.com

# 2. Check system resources
df -h
free -h
top

# 3. Restart all services
sudo systemctl restart bugrelay-backend
sudo systemctl restart bugrelay-frontend
cd /opt/bugrelay/monitoring && docker compose restart

# 4. Check Nginx
sudo systemctl restart nginx

# 5. Verify services
./scripts/health-check.sh

# 6. If still failing, rollback
./scripts/rollback.sh backend
./scripts/rollback.sh frontend

# 7. Notify team
./scripts/notify.sh "Emergency: System restored from backup"
```

### Database Corruption

If database is corrupted:

```bash
# 1. Stop backend
sudo systemctl stop bugrelay-backend

# 2. Backup current database
sudo -u postgres pg_dump bugrelay_production > /tmp/corrupted_db.sql

# 3. Restore from backup
sudo -u postgres psql bugrelay_production < /opt/bugrelay/backups/db-backup-latest.sql

# 4. Start backend
sudo systemctl start bugrelay-backend

# 5. Verify
curl http://localhost:8080/api/v1/health
```

### Security Incident

If security breach detected:

```bash
# 1. Isolate system
sudo ufw deny from any to any

# 2. Stop all services
sudo systemctl stop bugrelay-backend
sudo systemctl stop bugrelay-frontend

# 3. Notify security team
# Contact security@bugrelay.com

# 4. Preserve evidence
tar -czf /tmp/incident-$(date +%Y%m%d-%H%M%S).tar.gz \
  /opt/bugrelay/logs/ \
  /var/log/

# 5. Follow incident response plan
# See security documentation
```

## Getting Help

### Internal Resources

1. **Documentation**: Check all deployment docs
2. **Logs**: Review application and system logs
3. **Monitoring**: Check Grafana dashboards
4. **Team**: Contact DevOps team

### External Resources

1. **Digital Ocean**: https://docs.digitalocean.com/
2. **GitHub Actions**: https://docs.github.com/en/actions
3. **Docker**: https://docs.docker.com/
4. **Nginx**: https://nginx.org/en/docs/
5. **PostgreSQL**: https://www.postgresql.org/docs/
6. **Redis**: https://redis.io/documentation

### Contact Information

- **DevOps Team**: devops@bugrelay.com
- **On-Call Engineer**: Use PagerDuty
- **Security Team**: security@bugrelay.com
- **Slack**: #deployments channel

---

**Last Updated**: December 2024  
**Maintained By**: DevOps Team
