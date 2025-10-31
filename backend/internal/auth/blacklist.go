package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// BlacklistService handles JWT token blacklisting
type BlacklistService struct {
	db    *gorm.DB
	redis *redis.Client
}

// NewBlacklistService creates a new blacklist service
func NewBlacklistService(db *gorm.DB, redis *redis.Client) *BlacklistService {
	return &BlacklistService{
		db:    db,
		redis: redis,
	}
}

// BlacklistToken adds a token to the blacklist
func (b *BlacklistService) BlacklistToken(ctx context.Context, tokenID, userID string, expiresAt time.Time) error {
	// Store in Redis for fast lookup (with TTL)
	ttl := time.Until(expiresAt)
	if ttl > 0 {
		key := fmt.Sprintf("blacklist:%s", tokenID)
		err := b.redis.Set(ctx, key, userID, ttl).Err()
		if err != nil {
			return fmt.Errorf("failed to blacklist token in Redis: %w", err)
		}
	}

	// Store in database for persistence
	query := `
		INSERT INTO jwt_blacklist (token_jti, user_id, expires_at, created_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (token_jti) DO NOTHING
	`
	err := b.db.Exec(query, tokenID, userID, expiresAt).Error
	if err != nil {
		return fmt.Errorf("failed to blacklist token in database: %w", err)
	}

	return nil
}

// IsTokenBlacklisted checks if a token is blacklisted
func (b *BlacklistService) IsTokenBlacklisted(ctx context.Context, tokenID string) (bool, error) {
	// Check Redis first for fast lookup
	key := fmt.Sprintf("blacklist:%s", tokenID)
	exists, err := b.redis.Exists(ctx, key).Result()
	if err == nil && exists > 0 {
		return true, nil
	}

	// Fallback to database check
	var count int64
	err = b.db.Model(&struct {
		TokenJTI  string    `gorm:"column:token_jti"`
		ExpiresAt time.Time `gorm:"column:expires_at"`
	}{}).
		Where("token_jti = ? AND expires_at > NOW()", tokenID).
		Count(&count).Error

	if err != nil {
		return false, fmt.Errorf("failed to check token blacklist: %w", err)
	}

	return count > 0, nil
}

// BlacklistAllUserTokens blacklists all tokens for a specific user
func (b *BlacklistService) BlacklistAllUserTokens(ctx context.Context, userID string) error {
	// Update database to mark all user tokens as blacklisted
	query := `
		INSERT INTO jwt_blacklist (token_jti, user_id, expires_at, created_at)
		SELECT CONCAT('user_logout_', $1, '_', EXTRACT(EPOCH FROM NOW())), $1, NOW() + INTERVAL '30 days', NOW()
		WHERE NOT EXISTS (
			SELECT 1 FROM jwt_blacklist WHERE user_id = $1 AND token_jti LIKE 'user_logout_%'
		)
	`
	err := b.db.Exec(query, userID).Error
	if err != nil {
		return fmt.Errorf("failed to blacklist user tokens: %w", err)
	}

	// Clear user tokens from Redis (pattern-based deletion)
	pattern := fmt.Sprintf("blacklist:*")
	keys, err := b.redis.Keys(ctx, pattern).Result()
	if err != nil {
		return fmt.Errorf("failed to get Redis keys: %w", err)
	}

	// Check each key to see if it belongs to the user
	for _, key := range keys {
		val, err := b.redis.Get(ctx, key).Result()
		if err == nil && val == userID {
			b.redis.Del(ctx, key)
		}
	}

	return nil
}

// CleanupExpiredTokens removes expired tokens from the blacklist
func (b *BlacklistService) CleanupExpiredTokens(ctx context.Context) error {
	// Clean up database
	err := b.db.Exec("DELETE FROM jwt_blacklist WHERE expires_at <= NOW()").Error
	if err != nil {
		return fmt.Errorf("failed to cleanup expired tokens from database: %w", err)
	}

	// Redis keys will expire automatically due to TTL
	return nil
}