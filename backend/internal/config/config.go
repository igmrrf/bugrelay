package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Database  DatabaseConfig
	Redis     RedisConfig
	JWT       JWTConfig
	OAuth     OAuthConfig
	Server    ServerConfig
	Recaptcha RecaptchaConfig
	Logger    LoggerConfig
}

type DatabaseConfig struct {
	Host     string
	Port     string
	Name     string
	User     string
	Password string
	SSLMode  string
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
}

type JWTConfig struct {
	Secret           string
	AccessTokenTTL   time.Duration
	RefreshTokenTTL  time.Duration
}

type OAuthConfig struct {
	GoogleClientID     string
	GoogleClientSecret string
	GitHubClientID     string
	GitHubClientSecret string
	RedirectURL        string
}

type ServerConfig struct {
	Environment string
	Port        string
	LogsAPIKey  string
}

type RecaptchaConfig struct {
	SecretKey string
	SiteKey   string
}

type LoggerConfig struct {
	Level      string
	Format     string
	Output     string
	MaxSize    int
	MaxBackups int
	MaxAge     int
	Compress   bool
}

func Load() *Config {
	return &Config{
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			Name:     getEnv("DB_NAME", "bugrelay"),
			User:     getEnv("DB_USER", "bugrelay_user"),
			Password: getEnv("DB_PASSWORD", "bugrelay_password"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       0,
		},
		JWT: JWTConfig{
			Secret:           getEnv("JWT_SECRET", "your-jwt-secret-key-change-in-production"),
			AccessTokenTTL:   getDurationEnv("JWT_ACCESS_TOKEN_TTL", 15*time.Minute),
			RefreshTokenTTL:  getDurationEnv("JWT_REFRESH_TOKEN_TTL", 7*24*time.Hour),
		},
		OAuth: OAuthConfig{
			GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
			GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
			GitHubClientID:     getEnv("GITHUB_CLIENT_ID", ""),
			GitHubClientSecret: getEnv("GITHUB_CLIENT_SECRET", ""),
			RedirectURL:        getEnv("OAUTH_REDIRECT_URL", "http://localhost:8080/api/v1/auth/oauth/callback"),
		},
		Server: ServerConfig{
			Environment: getEnv("ENVIRONMENT", "development"),
			Port:        getEnv("PORT", "8080"),
			LogsAPIKey:  getEnv("LOGS_API_KEY", "dev-api-key"),
		},
		Recaptcha: RecaptchaConfig{
			SecretKey: getEnv("RECAPTCHA_SECRET_KEY", ""),
			SiteKey:   getEnv("RECAPTCHA_SITE_KEY", ""),
		},
		Logger: LoggerConfig{
			Level:      getEnv("LOG_LEVEL", "info"),
			Format:     getEnv("LOG_FORMAT", "json"),
			Output:     getEnv("LOG_OUTPUT", "both"),
			MaxSize:    getIntEnv("LOG_MAX_SIZE", 100),
			MaxBackups: getIntEnv("LOG_MAX_BACKUPS", 3),
			MaxAge:     getIntEnv("LOG_MAX_AGE", 28),
			Compress:   getBoolEnv("LOG_COMPRESS", true),
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if minutes, err := strconv.Atoi(value); err == nil {
			return time.Duration(minutes) * time.Minute
		}
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

func getIntEnv(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getBoolEnv(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}