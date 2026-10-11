package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
	"golang.org/x/oauth2/google"
)

// OAuthProvider represents different OAuth providers
type OAuthProvider string

const (
	ProviderGoogle OAuthProvider = "google"
	ProviderGitHub OAuthProvider = "github"
)

// OAuthConfig holds OAuth configuration
type OAuthConfig struct {
	GoogleClientID     string
	GoogleClientSecret string
	GitHubClientID     string
	GitHubClientSecret string
	RedirectURL        string
}

// OAuthService handles OAuth authentication
type OAuthService struct {
	config       OAuthConfig
	googleConfig *oauth2.Config
	githubConfig *oauth2.Config
}

// OAuthUserInfo represents user information from OAuth providers
type OAuthUserInfo struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	Name        string `json:"name"`
	AvatarURL   string `json:"avatar_url"`
	Provider    string `json:"provider"`
	Verified    bool   `json:"verified"`
}

// NewOAuthService creates a new OAuth service
func NewOAuthService(config OAuthConfig) *OAuthService {
	googleConfig := &oauth2.Config{
		ClientID:     config.GoogleClientID,
		ClientSecret: config.GoogleClientSecret,
		RedirectURL:  config.RedirectURL + "/google",
		Scopes:       []string{"openid", "profile", "email"},
		Endpoint:     google.Endpoint,
	}

	githubConfig := &oauth2.Config{
		ClientID:     config.GitHubClientID,
		ClientSecret: config.GitHubClientSecret,
		RedirectURL:  config.RedirectURL + "/github",
		Scopes:       []string{"user:email"},
		Endpoint:     github.Endpoint,
	}

	return &OAuthService{
		config:       config,
		googleConfig: googleConfig,
		githubConfig: githubConfig,
	}
}

// GetAuthURL generates the OAuth authorization URL
func (o *OAuthService) GetAuthURL(provider OAuthProvider, state string) (string, error) {
	switch provider {
	case ProviderGoogle:
		return o.googleConfig.AuthCodeURL(state, oauth2.AccessTypeOffline), nil
	case ProviderGitHub:
		return o.githubConfig.AuthCodeURL(state), nil
	default:
		return "", fmt.Errorf("unsupported OAuth provider: %s", provider)
	}
}

// ExchangeCodeForToken exchanges authorization code for access token
func (o *OAuthService) ExchangeCodeForToken(ctx context.Context, provider OAuthProvider, code string) (*oauth2.Token, error) {
	switch provider {
	case ProviderGoogle:
		return o.googleConfig.Exchange(ctx, code)
	case ProviderGitHub:
		return o.githubConfig.Exchange(ctx, code)
	default:
		return nil, fmt.Errorf("unsupported OAuth provider: %s", provider)
	}
}

// GetUserInfo retrieves user information from OAuth provider
func (o *OAuthService) GetUserInfo(ctx context.Context, provider OAuthProvider, token *oauth2.Token) (*OAuthUserInfo, error) {
	switch provider {
	case ProviderGoogle:
		return o.getGoogleUserInfo(ctx, token)
	case ProviderGitHub:
		return o.getGitHubUserInfo(ctx, token)
	default:
		return nil, fmt.Errorf("unsupported OAuth provider: %s", provider)
	}
}

// getGoogleUserInfo retrieves user info from Google
func (o *OAuthService) getGoogleUserInfo(ctx context.Context, token *oauth2.Token) (*OAuthUserInfo, error) {
	client := o.googleConfig.Client(ctx, token)
	
	// Get user info from Google's userinfo endpoint
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return nil, fmt.Errorf("failed to get user info from Google: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Google API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read Google response: %w", err)
	}

	var googleUser struct {
		ID            string `json:"id"`
		Email         string `json:"email"`
		Name          string `json:"name"`
		Picture       string `json:"picture"`
		VerifiedEmail bool   `json:"verified_email"`
	}

	if err := json.Unmarshal(body, &googleUser); err != nil {
		return nil, fmt.Errorf("failed to parse Google user info: %w", err)
	}

	return &OAuthUserInfo{
		ID:        googleUser.ID,
		Email:     googleUser.Email,
		Name:      googleUser.Name,
		AvatarURL: googleUser.Picture,
		Provider:  string(ProviderGoogle),
		Verified:  googleUser.VerifiedEmail,
	}, nil
}

// getGitHubUserInfo retrieves user info from GitHub
func (o *OAuthService) getGitHubUserInfo(ctx context.Context, token *oauth2.Token) (*OAuthUserInfo, error) {
	client := o.githubConfig.Client(ctx, token)

	// Get user info from GitHub API
	resp, err := client.Get("https://api.github.com/user")
	if err != nil {
		return nil, fmt.Errorf("failed to get user info from GitHub: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read GitHub response: %w", err)
	}

	var githubUser struct {
		ID        int    `json:"id"`
		Login     string `json:"login"`
		Name      string `json:"name"`
		Email     string `json:"email"`
		AvatarURL string `json:"avatar_url"`
	}

	if err := json.Unmarshal(body, &githubUser); err != nil {
		return nil, fmt.Errorf("failed to parse GitHub user info: %w", err)
	}

	// GitHub might not return email in the user endpoint, so we need to fetch it separately
	email := githubUser.Email
	if email == "" {
		email, err = o.getGitHubUserEmail(client)
		if err != nil {
			return nil, fmt.Errorf("failed to get GitHub user email: %w", err)
		}
	}

	// Use login as name if name is empty
	name := githubUser.Name
	if name == "" {
		name = githubUser.Login
	}

	return &OAuthUserInfo{
		ID:        fmt.Sprintf("%d", githubUser.ID),
		Email:     email,
		Name:      name,
		AvatarURL: githubUser.AvatarURL,
		Provider:  string(ProviderGitHub),
		Verified:  true, // GitHub emails are considered verified
	}, nil
}

// getGitHubUserEmail retrieves the primary email from GitHub
func (o *OAuthService) getGitHubUserEmail(client *http.Client) (string, error) {
	resp, err := client.Get("https://api.github.com/user/emails")
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("GitHub emails API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var emails []struct {
		Email    string `json:"email"`
		Primary  bool   `json:"primary"`
		Verified bool   `json:"verified"`
	}

	if err := json.Unmarshal(body, &emails); err != nil {
		return "", err
	}

	// Find primary verified email
	for _, email := range emails {
		if email.Primary && email.Verified {
			return email.Email, nil
		}
	}

	// Fallback to first verified email
	for _, email := range emails {
		if email.Verified {
			return email.Email, nil
		}
	}

	return "", fmt.Errorf("no verified email found")
}

// GenerateState generates a secure state parameter for OAuth
func (o *OAuthService) GenerateState() (string, error) {
	return GenerateSecureToken(16)
}

// ValidateState validates the OAuth state parameter
func (o *OAuthService) ValidateState(expected, received string) bool {
	return expected == received
}

// ParseProvider parses provider string to OAuthProvider
func ParseProvider(provider string) (OAuthProvider, error) {
	switch strings.ToLower(provider) {
	case "google":
		return ProviderGoogle, nil
	case "github":
		return ProviderGitHub, nil
	default:
		return "", fmt.Errorf("unsupported provider: %s", provider)
	}
}