package router

import (
	"fmt"
	"net/http"
	"time"

	"bugrelay-backend/internal/auth"
	"bugrelay-backend/internal/config"
	"bugrelay-backend/internal/handlers"
	"bugrelay-backend/internal/logger"
	"bugrelay-backend/internal/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

func Setup(db *gorm.DB, redisClient *redis.Client, cfg *config.Config) *gin.Engine {
	// Set Gin mode based on environment
	if cfg.Server.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// Initialize security middleware
	securityMiddleware := middleware.NewSecurityMiddleware([]string{})

	// Apply logging middleware first
	r.Use(middleware.RequestLoggingMiddleware())
	r.Use(middleware.ErrorLoggingMiddleware())
	r.Use(middleware.AuditLoggingMiddleware())

	// Apply security headers
	r.Use(securityMiddleware.SecurityHeaders())

	// Request size limit (10MB for file uploads, 1MB for regular requests)
	r.Use(securityMiddleware.RequestSizeLimit(10 * 1024 * 1024))

	// Input sanitization
	r.Use(securityMiddleware.InputSanitization())

	// User agent validation (skip for development)
	if cfg.Server.Environment == "production" {
		r.Use(securityMiddleware.ValidateUserAgent())
	}
	r.Use(func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin == "" {
			origin = "unknown"
		}

		method := c.Request.Method
		path := c.Request.URL.Path
		clientIP := c.ClientIP()

		logger.Info("Starting BugRelay backend", logger.Fields{
			"method":   method,
			"origin":   origin,
			"clientIp": clientIP,
			"path":     path,
			"env":      cfg.Server.Environment,
		})
		c.Next()
	})

	// CORS configuration with enhanced security
	corsConfig := cors.Config{
		AllowOrigins: func() []string {
			if cfg.Server.Environment == "production" {
				// In production, specify exact domains
				return []string{
					"https://bugrelay.com",
					"https://www.bugrelay.com",
				}
			}
			// Development origins
			return []string{
				"http://localhost:3000",
				"http://frontend:3000",
				"http://127.0.0.1:3000",
			}
		}(),
		AllowMethods: []string{
			"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS",
		},
		AllowHeaders: []string{
			"Origin",
			"Content-Length",
			"Content-Type",
			"Authorization",
			"X-Requested-With",
			"X-Request-ID",
		},
		ExposeHeaders: []string{
			"X-Request-ID",
			"X-RateLimit-Remaining",
			"X-RateLimit-Reset",
		},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	r.Use(cors.New(corsConfig))

	// Initialize authentication service
	authConfig := auth.Config{
		JWTSecret:       cfg.JWT.Secret,
		AccessTokenTTL:  cfg.JWT.AccessTokenTTL,
		RefreshTokenTTL: cfg.JWT.RefreshTokenTTL,
	}
	authService := auth.NewService(authConfig, db, redisClient)
	authMiddleware := middleware.NewAuthMiddleware(authService.GetJWTService(), authService.GetBlacklistService())

	// Initialize OAuth service
	oauthConfig := auth.OAuthConfig{
		GoogleClientID:     cfg.OAuth.GoogleClientID,
		GoogleClientSecret: cfg.OAuth.GoogleClientSecret,
		GitHubClientID:     cfg.OAuth.GitHubClientID,
		GitHubClientSecret: cfg.OAuth.GitHubClientSecret,
		RedirectURL:        cfg.OAuth.RedirectURL,
	}
	oauthService := auth.NewOAuthService(oauthConfig)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(db, authService)
	oauthHandler := handlers.NewOAuthHandler(db, authService, oauthService)
	bugHandler := handlers.NewBugHandler(db, redisClient)
	bugHandler.SetRecaptchaSecret(cfg.Recaptcha.SecretKey)
	companyHandler := handlers.NewCompanyHandler(db)
	adminHandler := handlers.NewAdminHandler(db)
	logsHandler := handlers.NewLogsHandler()

	// Initialize rate limiter
	rateLimiter := middleware.NewRateLimiter(redisClient, 60)

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "bugrelay-backend",
		})
	})

	// API v1 routes
	v1 := r.Group("/api/v1")
	v1.Use(rateLimiter.GeneralRateLimit()) // Apply general rate limiting to all API routes
	{
		// Public routes
		v1.GET("/status", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"message": "BugRelay API v1 is running",
				"version": "1.0.0",
			})
		})

		// Authentication routes
		auth := v1.Group("/auth")
		{
			// Public authentication endpoints
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.RefreshToken)
			auth.GET("/verify-email", authHandler.VerifyEmail)

			// Password reset endpoints
			auth.POST("/password-reset", authHandler.RequestPasswordReset)
			auth.POST("/password-reset/confirm", authHandler.ResetPassword)

			// OAuth endpoints
			oauth := auth.Group("/oauth")
			{
				oauth.GET("/:provider", oauthHandler.InitiateOAuth)
				oauth.GET("/callback/:provider", oauthHandler.HandleOAuthCallback)
				oauth.POST("/link/:provider", authMiddleware.RequireAuth(), oauthHandler.LinkOAuthAccount)
			}

			// Protected authentication endpoints
			auth.POST("/logout", authMiddleware.RequireAuth(), authHandler.Logout)
			auth.POST("/logout-all", authMiddleware.RequireAuth(), authHandler.LogoutAll)
			auth.GET("/profile", authMiddleware.RequireAuth(), authHandler.GetProfile)
			auth.PUT("/profile", authMiddleware.RequireAuth(), authHandler.UpdateProfile)
		}

		// Protected routes examples
		protected := v1.Group("/protected")
		protected.Use(authMiddleware.RequireAuth())
		{
			protected.GET("/test", func(c *gin.Context) {
				userID, _ := middleware.GetCurrentUserID(c)
				c.JSON(http.StatusOK, gin.H{
					"message": "This is a protected endpoint",
					"user_id": userID,
				})
			})
		}

		// Bug routes
		bugs := v1.Group("/bugs")
		{
			// Public bug endpoints
			bugs.GET("/", bugHandler.ListBugs)
			bugs.GET("/:id", bugHandler.GetBug)
			bugs.POST("/", rateLimiter.BugSubmissionRateLimit(), authMiddleware.OptionalAuth(), bugHandler.CreateBug)

			// Protected bug endpoints
			bugs.POST("/:id/vote", authMiddleware.RequireAuth(), bugHandler.VoteBug)
			bugs.POST("/:id/comments", authMiddleware.RequireAuth(), bugHandler.CreateComment)
			bugs.POST("/:id/attachments", authMiddleware.RequireAuth(), bugHandler.UploadBugAttachment)
			bugs.PATCH("/:id/status", authMiddleware.RequireAuth(), bugHandler.UpdateBugStatus)
			bugs.POST("/:id/company-response", authMiddleware.RequireAuth(), bugHandler.AddCompanyResponse)
		}

		// Company routes
		companies := v1.Group("/companies")
		{
			// Public company endpoints
			companies.GET("/", companyHandler.ListCompanies)
			companies.GET("/:id", companyHandler.GetCompany)

			// Protected company endpoints
			companies.POST("/:id/claim", authMiddleware.RequireAuth(), companyHandler.InitiateCompanyClaim)
			companies.POST("/:id/verify", authMiddleware.RequireAuth(), companyHandler.CompleteCompanyVerification)
			companies.GET("/:id/dashboard", authMiddleware.RequireAuth(), companyHandler.GetCompanyDashboard)
			companies.POST("/:id/members", authMiddleware.RequireAuth(), companyHandler.AddTeamMember)
			companies.DELETE("/:id/members", authMiddleware.RequireAuth(), companyHandler.RemoveTeamMember)
		}

		// Admin routes with additional security
		admin := v1.Group("/admin")
		admin.Use(authMiddleware.RequireAdmin())
		// Add IP whitelist for admin routes in production
		if cfg.Server.Environment == "production" {
			// Configure allowed admin IPs in production
			adminIPs := []string{} // Add your admin IPs here
			admin.Use(securityMiddleware.IPWhitelist(adminIPs))
		}
		{
			// Dashboard and statistics
			admin.GET("/dashboard", adminHandler.GetAdminDashboard)

			// Bug moderation
			admin.GET("/bugs", adminHandler.ListBugsForModeration)
			admin.POST("/bugs/:id/flag", adminHandler.FlagBug)
			admin.DELETE("/bugs/:id", adminHandler.RemoveBug)
			admin.POST("/bugs/:id/restore", adminHandler.RestoreBug)
			admin.POST("/bugs/merge", adminHandler.MergeBugs)

			// Audit logs
			admin.GET("/audit-logs", adminHandler.GetAuditLogs)
		}

		// Logging routes
		logs := v1.Group("/logs")
		{
			// Health check for logging system
			logs.GET("/health", logsHandler.GetLogsHealth)

			// Frontend logs endpoint (with API key protection)
			logs.POST("/frontend", func(c *gin.Context) {
				// Simple API key check for development
				apiKey := c.GetHeader("X-API-Key")
				if cfg.Server.Environment == "production" && apiKey != cfg.Server.LogsAPIKey {
					c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid API key"})
					return
				}
				logsHandler.ReceiveFrontendLogs(c)
			})
		}
	}

	return r
}

