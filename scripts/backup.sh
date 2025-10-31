#!/bin/bash

# BugRelay Production Backup Script
# This script creates backups of the database and uploads them to S3

set -e

# Configuration
BACKUP_DIR="/backup"
DB_HOST="postgres"
DB_NAME="${DB_NAME:-bugrelay_production}"
DB_USER="${DB_USER:-bugrelay_user}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="bugrelay_backup_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# S3 Configuration
S3_BUCKET="${BACKUP_S3_BUCKET}"
S3_REGION="${BACKUP_S3_REGION:-us-east-1}"

echo "Starting backup process at $(date)"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Create database backup
echo "Creating database backup..."
pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
    --no-password \
    --verbose \
    --format=custom \
    --compress=9 \
    --file="${BACKUP_PATH}"

if [ $? -eq 0 ]; then
    echo "Database backup created successfully: ${BACKUP_FILE}"
else
    echo "Error: Database backup failed"
    exit 1
fi

# Compress the backup
echo "Compressing backup..."
gzip "${BACKUP_PATH}"
COMPRESSED_BACKUP="${BACKUP_PATH}.gz"

# Upload to S3 if configured
if [ -n "${S3_BUCKET}" ] && [ -n "${AWS_ACCESS_KEY_ID}" ]; then
    echo "Uploading backup to S3..."
    
    # Install AWS CLI if not present
    if ! command -v aws &> /dev/null; then
        echo "Installing AWS CLI..."
        apk add --no-cache aws-cli
    fi
    
    # Upload to S3
    aws s3 cp "${COMPRESSED_BACKUP}" "s3://${S3_BUCKET}/database-backups/" \
        --region "${S3_REGION}" \
        --storage-class STANDARD_IA
    
    if [ $? -eq 0 ]; then
        echo "Backup uploaded to S3 successfully"
        # Remove local backup after successful upload
        rm "${COMPRESSED_BACKUP}"
        echo "Local backup file removed"
    else
        echo "Warning: Failed to upload backup to S3"
    fi
else
    echo "S3 configuration not found, keeping local backup"
fi

# Clean up old local backups (keep last 7 days)
echo "Cleaning up old local backups..."
find "${BACKUP_DIR}" -name "bugrelay_backup_*.sql.gz" -mtime +7 -delete

# Clean up old S3 backups (keep last 30 days) if S3 is configured
if [ -n "${S3_BUCKET}" ] && [ -n "${AWS_ACCESS_KEY_ID}" ]; then
    echo "Cleaning up old S3 backups..."
    
    # List and delete old backups
    aws s3 ls "s3://${S3_BUCKET}/database-backups/" --region "${S3_REGION}" | \
    while read -r line; do
        # Extract date and filename
        backup_date=$(echo "$line" | awk '{print $1}')
        backup_file=$(echo "$line" | awk '{print $4}')
        
        # Calculate age in days
        if [ -n "$backup_date" ] && [ -n "$backup_file" ]; then
            backup_timestamp=$(date -d "$backup_date" +%s)
            current_timestamp=$(date +%s)
            age_days=$(( (current_timestamp - backup_timestamp) / 86400 ))
            
            # Delete if older than 30 days
            if [ $age_days -gt 30 ]; then
                echo "Deleting old backup: $backup_file (${age_days} days old)"
                aws s3 rm "s3://${S3_BUCKET}/database-backups/${backup_file}" --region "${S3_REGION}"
            fi
        fi
    done
fi

echo "Backup process completed at $(date)"

# Send notification (optional)
if [ -n "${BACKUP_WEBHOOK_URL}" ]; then
    curl -X POST "${BACKUP_WEBHOOK_URL}" \
        -H "Content-Type: application/json" \
        -d "{\"text\":\"✅ BugRelay database backup completed successfully at $(date)\"}" \
        || echo "Warning: Failed to send backup notification"
fi