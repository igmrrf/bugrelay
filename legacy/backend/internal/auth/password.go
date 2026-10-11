package auth

import (
	"errors"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

const (
	// MinPasswordLength defines the minimum password length
	MinPasswordLength = 8
	// BcryptCost defines the cost for bcrypt hashing
	BcryptCost = 12
)

var (
	ErrPasswordTooShort = fmt.Errorf("password must be at least %d characters long", MinPasswordLength)
	ErrInvalidPassword  = errors.New("invalid password")
)

// PasswordService handles password hashing and validation
type PasswordService struct{}

// NewPasswordService creates a new password service
func NewPasswordService() *PasswordService {
	return &PasswordService{}
}

// HashPassword hashes a password using bcrypt
func (p *PasswordService) HashPassword(password string) (string, error) {
	if len(password) < MinPasswordLength {
		return "", ErrPasswordTooShort
	}

	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), BcryptCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}

	return string(hashedBytes), nil
}

// ValidatePassword validates a password against its hash
func (p *PasswordService) ValidatePassword(password, hashedPassword string) error {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	if err != nil {
		if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
			return ErrInvalidPassword
		}
		return fmt.Errorf("failed to validate password: %w", err)
	}
	return nil
}

// ValidatePasswordStrength validates password strength requirements
func (p *PasswordService) ValidatePasswordStrength(password string) error {
	if len(password) < MinPasswordLength {
		return ErrPasswordTooShort
	}

	// Additional password strength checks can be added here
	// For now, we only check minimum length
	return nil
}