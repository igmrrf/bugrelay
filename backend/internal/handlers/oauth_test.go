package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"bugrelay-backend/internal/auth"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestOAuthHandler(t *testing.T) *OAuthHandler {
	handler, db := setupTestAuthHandler(t)
	
	oauthConfig := auth.OAuthConfig{
		GoogleClientID:     "test-google-client-id",
		GoogleClientSecret: "test-google-client-secret",
		GitHubClientID:     "test-github-client-id",
		GitHubClientSecret: "test-github-client-secret",
		RedirectURL:        "http://localhost:8080/api/v1/auth/oauth/callback",
	}
	
	oauthService := auth.NewOAuthService(oauthConfig)
	return NewOAuthHandler(db, handler.authService, oauthService)
}

func TestOAuthHandler_InitiateOAuth(t *testing.T) {
	handler := setupTestOAuthHandler(t)
	
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/oauth/:provider", handler.InitiateOAuth)

	tests := []struct {
		name           string
		provider       string
		expectedStatus int
		expectAuthURL  bool
	}{
		{
			name:           "google provider",
			provider:       "google",
			expectedStatus: http.StatusOK,
			expectAuthURL:  true,
		},
		{
			name:           "github provider",
			provider:       "github",
			expectedStatus: http.StatusOK,
			expectAuthURL:  true,
		},
		{
			name:           "invalid provider",
			provider:       "invalid",
			expectedStatus: http.StatusBadRequest,
			expectAuthURL:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest("GET", "/oauth/"+tt.provider, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)
			
			assert.Equal(t, tt.expectedStatus, w.Code)
			
			if tt.expectAuthURL {
				// Check that response contains auth_url
				assert.Contains(t, w.Body.String(), "auth_url")
				assert.Contains(t, w.Body.String(), "state")
				
				// Check that state cookie is set
				cookies := w.Result().Cookies()
				var stateCookie *http.Cookie
				for _, cookie := range cookies {
					if cookie.Name == "oauth_state" {
						stateCookie = cookie
						break
					}
				}
				require.NotNil(t, stateCookie)
				assert.NotEmpty(t, stateCookie.Value)
			}
		})
	}
}

func TestOAuthHandler_HandleOAuthCallback_MissingParameters(t *testing.T) {
	handler := setupTestOAuthHandler(t)
	
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/oauth/callback/:provider", handler.HandleOAuthCallback)

	tests := []struct {
		name           string
		provider       string
		queryParams    string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "missing code",
			provider:       "google",
			queryParams:    "?state=test-state",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "MISSING_CODE",
		},
		{
			name:           "missing state",
			provider:       "google",
			queryParams:    "?code=test-code",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "MISSING_STATE",
		},
		{
			name:           "invalid provider",
			provider:       "invalid",
			queryParams:    "?code=test-code&state=test-state",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "INVALID_PROVIDER",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest("GET", "/oauth/callback/"+tt.provider+tt.queryParams, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)
			
			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.Contains(t, w.Body.String(), tt.expectedError)
		})
	}
}

func TestOAuthHandler_HandleOAuthCallback_InvalidState(t *testing.T) {
	handler := setupTestOAuthHandler(t)
	
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/oauth/callback/:provider", handler.HandleOAuthCallback)

	req, _ := http.NewRequest("GET", "/oauth/callback/google?code=test-code&state=invalid-state", nil)
	// Don't set the oauth_state cookie, so state validation will fail
	
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "INVALID_STATE")
}

func TestParseProvider(t *testing.T) {
	tests := []struct {
		name     string
		provider string
		expected auth.OAuthProvider
		wantErr  bool
	}{
		{
			name:     "google provider",
			provider: "google",
			expected: auth.ProviderGoogle,
			wantErr:  false,
		},
		{
			name:     "github provider",
			provider: "github",
			expected: auth.ProviderGitHub,
			wantErr:  false,
		},
		{
			name:     "google provider uppercase",
			provider: "GOOGLE",
			expected: auth.ProviderGoogle,
			wantErr:  false,
		},
		{
			name:     "invalid provider",
			provider: "invalid",
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := auth.ParseProvider(tt.provider)
			
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expected, result)
			}
		})
	}
}

func TestOAuthService_GenerateState(t *testing.T) {
	oauthConfig := auth.OAuthConfig{
		GoogleClientID:     "test-google-client-id",
		GoogleClientSecret: "test-google-client-secret",
		GitHubClientID:     "test-github-client-id",
		GitHubClientSecret: "test-github-client-secret",
		RedirectURL:        "http://localhost:8080/callback",
	}
	
	service := auth.NewOAuthService(oauthConfig)
	
	state1, err := service.GenerateState()
	require.NoError(t, err)
	assert.NotEmpty(t, state1)
	
	state2, err := service.GenerateState()
	require.NoError(t, err)
	assert.NotEmpty(t, state2)
	
	// States should be different
	assert.NotEqual(t, state1, state2)
}

func TestOAuthService_ValidateState(t *testing.T) {
	oauthConfig := auth.OAuthConfig{
		GoogleClientID:     "test-google-client-id",
		GoogleClientSecret: "test-google-client-secret",
		GitHubClientID:     "test-github-client-id",
		GitHubClientSecret: "test-github-client-secret",
		RedirectURL:        "http://localhost:8080/callback",
	}
	
	service := auth.NewOAuthService(oauthConfig)
	
	state := "test-state"
	
	// Valid state should pass
	assert.True(t, service.ValidateState(state, state))
	
	// Invalid state should fail
	assert.False(t, service.ValidateState(state, "different-state"))
	assert.False(t, service.ValidateState(state, ""))
}

func TestOAuthService_GetAuthURL(t *testing.T) {
	oauthConfig := auth.OAuthConfig{
		GoogleClientID:     "test-google-client-id",
		GoogleClientSecret: "test-google-client-secret",
		GitHubClientID:     "test-github-client-id",
		GitHubClientSecret: "test-github-client-secret",
		RedirectURL:        "http://localhost:8080/callback",
	}
	
	service := auth.NewOAuthService(oauthConfig)
	
	tests := []struct {
		name     string
		provider auth.OAuthProvider
		wantErr  bool
	}{
		{
			name:     "google provider",
			provider: auth.ProviderGoogle,
			wantErr:  false,
		},
		{
			name:     "github provider",
			provider: auth.ProviderGitHub,
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			authURL, err := service.GetAuthURL(tt.provider, "test-state")
			
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.NotEmpty(t, authURL)
				assert.Contains(t, authURL, "client_id=test-")
				assert.Contains(t, authURL, "state=test-state")
			}
		})
	}
}