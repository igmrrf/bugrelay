package main

import (
	"os"

	"bugrelay-backend/internal/config"
	"bugrelay-backend/internal/database"
	"bugrelay-backend/internal/logger"
	"bugrelay-backend/internal/redis"
	"bugrelay-backend/internal/router"

	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		// Use basic logging before logger is initialized
		println("No .env file found, using system environment variables")
	}

	// Initialize configuration
	cfg := config.Load()

	// Initialize logger first
	loggerConfig := logger.Config{
		Level:      cfg.Logger.Level,
		Format:     cfg.Logger.Format,
		Output:     cfg.Logger.Output,
		MaxSize:    cfg.Logger.MaxSize,
		MaxBackups: cfg.Logger.MaxBackups,
		MaxAge:     cfg.Logger.MaxAge,
		Compress:   cfg.Logger.Compress,
	}

	if err := logger.Initialize(loggerConfig); err != nil {
		println("Failed to initialize logger:", err.Error())
		os.Exit(1)
	}

	logger.Info("Starting BugRelay backend", logger.Fields{
		"version":     "1.0.0",
		"environment": cfg.Server.Environment,
	})

	// Initialize database
	db, err := database.Initialize(cfg.Database)
	if err != nil {
		logger.Fatal("Failed to initialize database", err)
	}
	logger.Info("Database initialized successfully")

	// Initialize Redis
	redisClient, err := redis.Initialize(cfg.Redis)
	if err != nil {
		logger.Fatal("Failed to initialize Redis", err)
	}
	logger.Info("Redis initialized successfully")

	// Initialize router
	r := router.Setup(db, redisClient, cfg)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	logger.Info("Server starting", logger.Fields{
		"port":        port,
		"environment": cfg.Server.Environment,
	})

	if err := r.Run(":" + port); err != nil {
		logger.Fatal("Failed to start server", err)
	}
}