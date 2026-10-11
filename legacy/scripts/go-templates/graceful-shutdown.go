package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"
)

// GracefulShutdownManager handles graceful shutdown of the application
type GracefulShutdownManager struct {
	server          *http.Server
	shutdownTimeout time.Duration
	drainTimeout    time.Duration
	activeRequests  sync.WaitGroup
	isShuttingDown  bool
	mutex           sync.RWMutex
}

// NewGracefulShutdownManager creates a new graceful shutdown manager
func NewGracefulShutdownManager(server *http.Server) *GracefulShutdownManager {
	return &GracefulShutdownManager{
		server:          server,
		shutdownTimeout: 60 * time.Second, // Total shutdown timeout
		drainTimeout:    30 * time.Second, // Time to wait for connections to drain
		activeRequests:  sync.WaitGroup{},
		isShuttingDown:  false,
	}
}

// SetTimeouts configures the shutdown timeouts
func (gsm *GracefulShutdownManager) SetTimeouts(shutdownTimeout, drainTimeout time.Duration) {
	gsm.shutdownTimeout = shutdownTimeout
	gsm.drainTimeout = drainTimeout
}

// IsShuttingDown returns true if the server is in shutdown mode
func (gsm *GracefulShutdownManager) IsShuttingDown() bool {
	gsm.mutex.RLock()
	defer gsm.mutex.RUnlock()
	return gsm.isShuttingDown
}

// setShuttingDown sets the shutdown state
func (gsm *GracefulShutdownManager) setShuttingDown(state bool) {
	gsm.mutex.Lock()
	defer gsm.mutex.Unlock()
	gsm.isShuttingDown = state
}

// RequestStarted should be called at the beginning of each request handler
func (gsm *GracefulShutdownManager) RequestStarted() {
	gsm.activeRequests.Add(1)
}

// RequestFinished should be called at the end of each request handler
func (gsm *GracefulShutdownManager) RequestFinished() {
	gsm.activeRequests.Done()
}

// MiddlewareWrapper returns a middleware that tracks active requests
func (gsm *GracefulShutdownManager) MiddlewareWrapper(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check if we're shutting down
		if gsm.IsShuttingDown() {
			// Return 503 Service Unavailable for new requests during shutdown
			w.Header().Set("Connection", "close")
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte("Service is shutting down"))
			return
		}

		// Track this request
		gsm.RequestStarted()
		defer gsm.RequestFinished()

		// Add connection close header if shutting down
		if gsm.IsShuttingDown() {
			w.Header().Set("Connection", "close")
		}

		// Call the next handler
		next.ServeHTTP(w, r)
	})
}

// WaitForShutdownSignal waits for shutdown signals and initiates graceful shutdown
func (gsm *GracefulShutdownManager) WaitForShutdownSignal() {
	// Create a channel to receive OS signals
	sigChan := make(chan os.Signal, 1)

	// Register the channel to receive specific signals
	signal.Notify(sigChan,
		syscall.SIGTERM, // Termination request
		syscall.SIGINT,  // Interrupt from keyboard (Ctrl+C)
		syscall.SIGHUP,  // Hangup (terminal closed)
		syscall.SIGQUIT, // Quit from keyboard (Ctrl+\)
	)

	// Wait for a signal
	sig := <-sigChan
	log.Printf("Received signal: %v. Starting graceful shutdown...", sig)

	// Start graceful shutdown
	gsm.GracefulShutdown()
}

// GracefulShutdown performs the graceful shutdown process
func (gsm *GracefulShutdownManager) GracefulShutdown() {
	log.Println("Starting graceful shutdown process...")

	// Set shutdown state
	gsm.setShuttingDown(true)

	// Create a context with timeout for the entire shutdown process
	ctx, cancel := context.WithTimeout(context.Background(), gsm.shutdownTimeout)
	defer cancel()

	// Phase 1: Stop accepting new connections
	log.Println("Phase 1: Stopping acceptance of new connections...")

	// Create a channel to signal when active requests are done
	requestsDone := make(chan struct{})

	// Start a goroutine to wait for active requests to finish
	go func() {
		log.Println("Waiting for active requests to finish...")
		gsm.activeRequests.Wait()
		close(requestsDone)
	}()

	// Phase 2: Wait for active requests to drain or timeout
	log.Printf("Phase 2: Waiting up to %v for active requests to drain...", gsm.drainTimeout)

	drainCtx, drainCancel := context.WithTimeout(ctx, gsm.drainTimeout)
	defer drainCancel()

	select {
	case <-requestsDone:
		log.Println("All active requests completed successfully")
	case <-drainCtx.Done():
		log.Println("Drain timeout reached, proceeding with shutdown")
	}

	// Phase 3: Shutdown the HTTP server
	log.Println("Phase 3: Shutting down HTTP server...")

	if err := gsm.server.Shutdown(ctx); err != nil {
		log.Printf("Error during server shutdown: %v", err)

		// Force close if graceful shutdown fails
		log.Println("Forcing server close...")
		if closeErr := gsm.server.Close(); closeErr != nil {
			log.Printf("Error during forced server close: %v", closeErr)
		}
	} else {
		log.Println("HTTP server shutdown completed successfully")
	}

	log.Println("Graceful shutdown process completed")
}

// HealthCheckHandler returns a health check handler that considers shutdown state
func (gsm *GracefulShutdownManager) HealthCheckHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if gsm.IsShuttingDown() {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte(`{"status":"shutting_down","message":"Service is shutting down"}`))
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"healthy","message":"Service is running"}`))
	}
}

// Example usage in main function
func ExampleUsage() {
	// Create HTTP server
	mux := http.NewServeMux()

	server := &http.Server{
		Addr:    ":8080",
		Handler: mux,

		// Configure timeouts for graceful handling
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
	}

	// Create graceful shutdown manager
	gsm := NewGracefulShutdownManager(server)

	// Configure custom timeouts if needed
	gsm.SetTimeouts(60*time.Second, 30*time.Second)

	// Wrap all handlers with the graceful shutdown middleware
	mux.Handle("/", gsm.MiddlewareWrapper(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Simulate some work
		time.Sleep(100 * time.Millisecond)
		w.Write([]byte("Hello, World!"))
	})))

	// Add health check endpoint
	mux.HandleFunc("/health", gsm.HealthCheckHandler())

	// Add API endpoints with middleware
	mux.Handle("/api/", gsm.MiddlewareWrapper(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// API handler logic here
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"message":"API response"}`))
	})))

	// Start server in a goroutine
	go func() {
		log.Printf("Starting server on %s", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for shutdown signal and handle graceful shutdown
	gsm.WaitForShutdownSignal()

	log.Println("Server stopped")
}

// Additional utility functions for connection draining

// ConnectionDrainer helps manage connection draining
type ConnectionDrainer struct {
	connections map[string]*http.Request
	mutex       sync.RWMutex
}

// NewConnectionDrainer creates a new connection drainer
func NewConnectionDrainer() *ConnectionDrainer {
	return &ConnectionDrainer{
		connections: make(map[string]*http.Request),
	}
}

// AddConnection adds a connection to track
func (cd *ConnectionDrainer) AddConnection(id string, req *http.Request) {
	cd.mutex.Lock()
	defer cd.mutex.Unlock()
	cd.connections[id] = req
}

// RemoveConnection removes a connection from tracking
func (cd *ConnectionDrainer) RemoveConnection(id string) {
	cd.mutex.Lock()
	defer cd.mutex.Unlock()
	delete(cd.connections, id)
}

// GetActiveConnectionCount returns the number of active connections
func (cd *ConnectionDrainer) GetActiveConnectionCount() int {
	cd.mutex.RLock()
	defer cd.mutex.RUnlock()
	return len(cd.connections)
}

// DrainConnections waits for all connections to finish or timeout
func (cd *ConnectionDrainer) DrainConnections(timeout time.Duration) {
	log.Printf("Draining %d active connections...", cd.GetActiveConnectionCount())

	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	timeoutChan := time.After(timeout)

	for {
		select {
		case <-ticker.C:
			count := cd.GetActiveConnectionCount()
			if count == 0 {
				log.Println("All connections drained successfully")
				return
			}
			log.Printf("Waiting for %d connections to drain...", count)

		case <-timeoutChan:
			remaining := cd.GetActiveConnectionCount()
			log.Printf("Drain timeout reached. %d connections still active", remaining)
			return
		}
	}
}
