package auth

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPasswordService_HashPassword(t *testing.T) {
	service := NewPasswordService()
	
	password := "testpassword123"
	hash, err := service.HashPassword(password)
	
	require.NoError(t, err)
	assert.NotEmpty(t, hash)
	assert.NotEqual(t, password, hash)
	assert.True(t, strings.HasPrefix(hash, "$2a$")) // bcrypt hash prefix
}

func TestPasswordService_HashPassword_TooShort(t *testing.T) {
	service := NewPasswordService()
	
	shortPassword := "short"
	_, err := service.HashPassword(shortPassword)
	
	assert.Error(t, err)
	assert.Equal(t, ErrPasswordTooShort, err)
}

func TestPasswordService_ValidatePassword(t *testing.T) {
	service := NewPasswordService()
	
	password := "testpassword123"
	hash, err := service.HashPassword(password)
	require.NoError(t, err)

	// Valid password should pass
	err = service.ValidatePassword(password, hash)
	assert.NoError(t, err)

	// Invalid password should fail
	err = service.ValidatePassword("wrongpassword", hash)
	assert.Error(t, err)
	assert.Equal(t, ErrInvalidPassword, err)
}

func TestPasswordService_ValidatePassword_InvalidHash(t *testing.T) {
	service := NewPasswordService()
	
	password := "testpassword123"
	invalidHash := "invalid-hash"

	err := service.ValidatePassword(password, invalidHash)
	assert.Error(t, err)
	assert.NotEqual(t, ErrInvalidPassword, err) // Should be a different error
}

func TestPasswordService_ValidatePasswordStrength(t *testing.T) {
	service := NewPasswordService()

	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{
			name:     "valid password",
			password: "validpassword123",
			wantErr:  false,
		},
		{
			name:     "minimum length password",
			password: "12345678",
			wantErr:  false,
		},
		{
			name:     "too short password",
			password: "1234567",
			wantErr:  true,
		},
		{
			name:     "empty password",
			password: "",
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := service.ValidatePasswordStrength(tt.password)
			if tt.wantErr {
				assert.Error(t, err)
				assert.Equal(t, ErrPasswordTooShort, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestPasswordService_HashPassword_Consistency(t *testing.T) {
	service := NewPasswordService()
	
	password := "testpassword123"
	
	// Hash the same password multiple times
	hash1, err := service.HashPassword(password)
	require.NoError(t, err)
	
	hash2, err := service.HashPassword(password)
	require.NoError(t, err)

	// Hashes should be different (due to salt)
	assert.NotEqual(t, hash1, hash2)

	// But both should validate correctly
	err = service.ValidatePassword(password, hash1)
	assert.NoError(t, err)
	
	err = service.ValidatePassword(password, hash2)
	assert.NoError(t, err)
}

func TestPasswordService_EdgeCases(t *testing.T) {
	service := NewPasswordService()

	// Test with special characters
	password := "p@ssw0rd!#$%"
	hash, err := service.HashPassword(password)
	require.NoError(t, err)
	
	err = service.ValidatePassword(password, hash)
	assert.NoError(t, err)

	// Test with unicode characters
	password = "пароль123"
	hash, err = service.HashPassword(password)
	require.NoError(t, err)
	
	err = service.ValidatePassword(password, hash)
	assert.NoError(t, err)

	// Test with long password (within bcrypt limit of 72 bytes)
	password = strings.Repeat("a", 70)
	hash, err = service.HashPassword(password)
	require.NoError(t, err)
	
	err = service.ValidatePassword(password, hash)
	assert.NoError(t, err)
}