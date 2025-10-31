package auth

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestJWTService_GenerateTokenPair(t *testing.T) {
	service := NewJWTService("test-secret", time.Hour, 24*time.Hour)
	
	userID := "test-user-id"
	email := "test@example.com"
	isAdmin := false

	accessToken, refreshToken, err := service.GenerateTokenPair(userID, email, isAdmin)
	
	require.NoError(t, err)
	assert.NotEmpty(t, accessToken)
	assert.NotEmpty(t, refreshToken)
	assert.NotEqual(t, accessToken, refreshToken)
}

func TestJWTService_ValidateToken(t *testing.T) {
	service := NewJWTService("test-secret", time.Hour, 24*time.Hour)
	
	userID := "test-user-id"
	email := "test@example.com"
	isAdmin := true

	// Generate tokens
	accessToken, refreshToken, err := service.GenerateTokenPair(userID, email, isAdmin)
	require.NoError(t, err)

	// Validate access token
	claims, err := service.ValidateToken(accessToken)
	require.NoError(t, err)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, email, claims.Email)
	assert.Equal(t, isAdmin, claims.IsAdmin)
	assert.Equal(t, "access", claims.TokenType)
	assert.Equal(t, "bugrelay", claims.Issuer)

	// Validate refresh token
	claims, err = service.ValidateToken(refreshToken)
	require.NoError(t, err)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, email, claims.Email)
	assert.Equal(t, isAdmin, claims.IsAdmin)
	assert.Equal(t, "refresh", claims.TokenType)
}

func TestJWTService_ValidateToken_InvalidToken(t *testing.T) {
	service := NewJWTService("test-secret", time.Hour, 24*time.Hour)
	
	// Test with invalid token
	_, err := service.ValidateToken("invalid-token")
	assert.Error(t, err)
	assert.Equal(t, ErrInvalidToken, err)
}

func TestJWTService_ValidateToken_ExpiredToken(t *testing.T) {
	service := NewJWTService("test-secret", -time.Hour, 24*time.Hour) // Negative TTL for immediate expiry
	
	userID := "test-user-id"
	email := "test@example.com"
	isAdmin := false

	accessToken, _, err := service.GenerateTokenPair(userID, email, isAdmin)
	require.NoError(t, err)

	// Token should be expired
	_, err = service.ValidateToken(accessToken)
	assert.Error(t, err)
	assert.Equal(t, ErrExpiredToken, err)
}

func TestJWTService_ValidateToken_WrongSecret(t *testing.T) {
	service1 := NewJWTService("secret1", time.Hour, 24*time.Hour)
	service2 := NewJWTService("secret2", time.Hour, 24*time.Hour)
	
	userID := "test-user-id"
	email := "test@example.com"
	isAdmin := false

	// Generate token with service1
	accessToken, _, err := service1.GenerateTokenPair(userID, email, isAdmin)
	require.NoError(t, err)

	// Try to validate with service2 (different secret)
	_, err = service2.ValidateToken(accessToken)
	assert.Error(t, err)
	assert.Equal(t, ErrInvalidToken, err)
}

func TestJWTService_ExtractTokenID(t *testing.T) {
	service := NewJWTService("test-secret", time.Hour, 24*time.Hour)
	
	userID := "test-user-id"
	email := "test@example.com"
	isAdmin := false

	accessToken, _, err := service.GenerateTokenPair(userID, email, isAdmin)
	require.NoError(t, err)

	tokenID, err := service.ExtractTokenID(accessToken)
	require.NoError(t, err)
	assert.NotEmpty(t, tokenID)

	// Verify the token ID matches the claims
	claims, err := service.ValidateToken(accessToken)
	require.NoError(t, err)
	assert.Equal(t, claims.ID, tokenID)
}

func TestGenerateSecureToken(t *testing.T) {
	token1, err := GenerateSecureToken(16)
	require.NoError(t, err)
	assert.Len(t, token1, 32) // Hex encoding doubles the length

	token2, err := GenerateSecureToken(16)
	require.NoError(t, err)
	assert.Len(t, token2, 32)

	// Tokens should be different
	assert.NotEqual(t, token1, token2)
}

func TestJWTClaims_TokenTypes(t *testing.T) {
	service := NewJWTService("test-secret", time.Hour, 24*time.Hour)
	
	userID := "test-user-id"
	email := "test@example.com"
	isAdmin := false

	accessToken, refreshToken, err := service.GenerateTokenPair(userID, email, isAdmin)
	require.NoError(t, err)

	// Check access token type
	accessClaims, err := service.ValidateToken(accessToken)
	require.NoError(t, err)
	assert.Equal(t, "access", accessClaims.TokenType)

	// Check refresh token type
	refreshClaims, err := service.ValidateToken(refreshToken)
	require.NoError(t, err)
	assert.Equal(t, "refresh", refreshClaims.TokenType)
}

func TestJWTService_TokenExpiration(t *testing.T) {
	accessTTL := 50 * time.Millisecond
	refreshTTL := 100 * time.Millisecond
	service := NewJWTService("test-secret", accessTTL, refreshTTL)
	
	userID := "test-user-id"
	email := "test@example.com"
	isAdmin := false

	accessToken, refreshToken, err := service.GenerateTokenPair(userID, email, isAdmin)
	require.NoError(t, err)

	// Tokens should be valid initially
	_, err = service.ValidateToken(accessToken)
	assert.NoError(t, err)
	_, err = service.ValidateToken(refreshToken)
	assert.NoError(t, err)

	// Wait for access token to expire
	time.Sleep(70 * time.Millisecond)
	
	_, err = service.ValidateToken(accessToken)
	assert.Error(t, err)
	assert.Equal(t, ErrExpiredToken, err)

	// Refresh token should still be valid
	_, err = service.ValidateToken(refreshToken)
	assert.NoError(t, err)

	// Wait for refresh token to expire
	time.Sleep(50 * time.Millisecond)
	
	_, err = service.ValidateToken(refreshToken)
	assert.Error(t, err)
	assert.Equal(t, ErrExpiredToken, err)
}