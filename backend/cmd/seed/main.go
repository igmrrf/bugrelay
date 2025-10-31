package main

import (
	"flag"
	"fmt"
	"os"

	"bugrelay-backend/internal/config"
	"bugrelay-backend/internal/database"
	"bugrelay-backend/internal/logger"
	"bugrelay-backend/internal/seeder"

	"github.com/joho/godotenv"
)

func main() {
	// Parse command line flags
	var (
		clear   = flag.Bool("clear", false, "Clear all seeded data")
		testing = flag.Bool("testing", false, "Seed minimal data for testing")
		help    = flag.Bool("help", false, "Show help message")
	)
	flag.Parse()

	if *help {
		showHelp()
		return
	}

	// Load environment variables
	if err := godotenv.Load(); err != nil {
		fmt.Println("No .env file found, using system environment variables")
	}

	// Initialize configuration
	cfg := config.Load()

	// Initialize logger
	loggerConfig := logger.Config{
		Level:      cfg.Logger.Level,
		Format:     cfg.Logger.Format,
		Output:     "stdout", // Always use stdout for CLI
		MaxSize:    cfg.Logger.MaxSize,
		MaxBackups: cfg.Logger.MaxBackups,
		MaxAge:     cfg.Logger.MaxAge,
		Compress:   cfg.Logger.Compress,
	}

	if err := logger.Initialize(loggerConfig); err != nil {
		fmt.Printf("Failed to initialize logger: %v\n", err)
		os.Exit(1)
	}

	// Initialize database
	db, err := database.Initialize(cfg.Database)
	if err != nil {
		logger.Fatal("Failed to initialize database", err)
	}

	// Create seeder
	s := seeder.New(db)

	// Execute based on flags
	switch {
	case *clear:
		if err := s.Clear(); err != nil {
			logger.Fatal("Failed to clear seeded data", err)
		}
		logger.Info("Successfully cleared all seeded data")

	case *testing:
		if err := s.SeedForTesting(); err != nil {
			logger.Fatal("Failed to seed test data", err)
		}
		logger.Info("Successfully seeded test data")

	default:
		if err := s.SeedAll(); err != nil {
			logger.Fatal("Failed to seed database", err)
		}
		logger.Info("Successfully seeded all data")
	}
}

func showHelp() {
	fmt.Println("BugRelay Database Seeder")
	fmt.Println()
	fmt.Println("Usage:")
	fmt.Println("  go run cmd/seed/main.go [flags]")
	fmt.Println()
	fmt.Println("Flags:")
	fmt.Println("  -clear     Clear all seeded data from the database")
	fmt.Println("  -testing   Seed minimal data for testing purposes")
	fmt.Println("  -help      Show this help message")
	fmt.Println()
	fmt.Println("Examples:")
	fmt.Println("  go run cmd/seed/main.go                    # Seed all development data")
	fmt.Println("  go run cmd/seed/main.go -testing          # Seed minimal test data")
	fmt.Println("  go run cmd/seed/main.go -clear            # Clear all seeded data")
}