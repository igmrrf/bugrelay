package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// Service provides authentication functionality
type Service struct {
	jwtService       *JWTService
	passwordService  *PasswordService
	blacklistService *BlacklistService
	db               *gorm.DB
	redis            *redis.Client
}

// Config holds authentication service configuration
type Config struct {
	JWTSecret       string
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration
}

// NewService creates a new authentication service
func NewService(config Config, db *gorm.DB, redis *redis.Client) *Service {
	jwtService := NewJWTService(config.JWTSecret, config.AccessTokenTTL, config.RefreshTokenTTL)
	passwordService := NewPasswordService()
	blacklistService := NewBlacklistService(db, redis)

	return &Service{
		jwtService:       jwtService,
		passwordService:  passwordService,
		blacklistService: blacklistService,
		db:               db,
		redis:            redis,
	}
}

// GetJWTService returns the JWT service
func (s *Service) GetJWTService() *JWTService {
	return s.jwtService
}

// GetPasswordService returns the password service
func (s *Service) GetPasswordService() *PasswordService {
	return s.passwordService
}

// GetBlacklistService returns the blacklist service
func (s *Service) GetBlacklistService() *BlacklistService {
	return s.blacklistService
}

// GenerateTokens generates access and refresh tokens for a user
func (s *Service) GenerateTokens(userID, email string, isAdmin bool) (accessToken, refreshToken string, err error) {
	return s.jwtService.GenerateTokenPair(userID, email, isAdmin)
}

// ValidateAccessToken validates an access token and returns claims
func (s *Service) ValidateAccessToken(tokenString string) (*JWTClaims, error) {
	claims, err := s.jwtService.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	if claims.TokenType != "access" {
		return nil, fmt.Errorf("invalid token type: expected access, got %s", claims.TokenType)
	}

	// Check if token is blacklisted
	isBlacklisted, err := s.blacklistService.IsTokenBlacklisted(context.Background(), claims.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to check token blacklist: %w", err)
	}

	if isBlacklisted {
		return nil, fmt.Errorf("token has been revoked")
	}

	return claims, nil
}

// RefreshTokens validates a refresh token and generates new token pair
func (s *Service) RefreshTokens(refreshTokenString string) (accessToken, refreshToken string, err error) {
	claims, err := s.jwtService.ValidateToken(refreshTokenString)
	if err != nil {
		return "", "", fmt.Errorf("invalid refresh token: %w", err)
	}

	if claims.TokenType != "refresh" {
		return "", "", fmt.Errorf("invalid token type: expected refresh, got %s", claims.TokenType)
	}

	// Check if token is blacklisted
	isBlacklisted, err := s.blacklistService.IsTokenBlacklisted(context.Background(), claims.ID)
	if err != nil {
		return "", "", fmt.Errorf("failed to check token blacklist: %w", err)
	}

	if isBlacklisted {
		return "", "", fmt.Errorf("refresh token has been revoked")
	}

	// Blacklist the old refresh token
	err = s.blacklistService.BlacklistToken(context.Background(), claims.ID, claims.UserID, claims.ExpiresAt.Time)
	if err != nil {
		return "", "", fmt.Errorf("failed to blacklist old refresh token: %w", err)
	}

	// Generate new token pair
	return s.jwtService.GenerateTokenPair(claims.UserID, claims.Email, claims.IsAdmin)
}

// RevokeToken revokes a specific token
func (s *Service) RevokeToken(tokenString string) error {
	claims, err := s.jwtService.ValidateToken(tokenString)
	if err != nil {
		return fmt.Errorf("invalid token: %w", err)
	}

	return s.blacklistService.BlacklistToken(context.Background(), claims.ID, claims.UserID, claims.ExpiresAt.Time)
}

// RevokeAllUserTokens revokes all tokens for a specific user
func (s *Service) RevokeAllUserTokens(userID string) error {
	return s.blacklistService.BlacklistAllUserTokens(context.Background(), userID)
}

// HashPassword hashes a password
func (s *Service) HashPassword(password string) (string, error) {
	return s.passwordService.HashPassword(password)
}

// ValidatePassword validates a password against its hash
func (s *Service) ValidatePassword(password, hashedPassword string) error {
	return s.passwordService.ValidatePassword(password, hashedPassword)
}

// ValidatePasswordStrength validates password strength
func (s *Service) ValidatePasswordStrength(password string) error {
	return s.passwordService.ValidatePasswordStrength(password)
}

// CleanupExpiredTokens removes expired tokens from blacklist
func (s *Service) CleanupExpiredTokens() error {
	return s.blacklistService.CleanupExpiredTokens(context.Background())
}