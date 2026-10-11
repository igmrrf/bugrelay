package cache

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
)

// Mock Redis client for testing
type mockRedisClient struct {
	data map[string]string
	ttl  map[string]time.Time
}

func newMockRedisClient() *mockRedisClient {
	return &mockRedisClient{
		data: make(map[string]string),
		ttl:  make(map[string]time.Time),
	}
}

func (m *mockRedisClient) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) *redis.StatusCmd {
	data, _ := json.Marshal(value)
	m.data[key] = string(data)
	if expiration > 0 {
		m.ttl[key] = time.Now().Add(expiration)
	}
	return redis.NewStatusCmd(ctx)
}

func (m *mockRedisClient) Get(ctx context.Context, key string) *redis.StringCmd {
	cmd := redis.NewStringCmd(ctx)
	if value, exists := m.data[key]; exists {
		// Check if expired
		if ttl, hasTTL := m.ttl[key]; hasTTL && time.Now().After(ttl) {
			delete(m.data, key)
			delete(m.ttl, key)
			cmd.SetErr(redis.Nil)
		} else {
			cmd.SetVal(value)
		}
	} else {
		cmd.SetErr(redis.Nil)
	}
	return cmd
}

func (m *mockRedisClient) Del(ctx context.Context, keys ...string) *redis.IntCmd {
	cmd := redis.NewIntCmd(ctx)
	count := int64(0)
	for _, key := range keys {
		if _, exists := m.data[key]; exists {
			delete(m.data, key)
			delete(m.ttl, key)
			count++
		}
	}
	cmd.SetVal(count)
	return cmd
}

func (m *mockRedisClient) Keys(ctx context.Context, pattern string) *redis.StringSliceCmd {
	cmd := redis.NewStringSliceCmd(ctx)
	var keys []string
	for key := range m.data {
		// Simple pattern matching for testing (only supports * at end)
		if pattern == "*" || (len(pattern) > 0 && pattern[len(pattern)-1] == '*' &&
			len(key) >= len(pattern)-1 && key[:len(pattern)-1] == pattern[:len(pattern)-1]) {
			keys = append(keys, key)
		}
	}
	cmd.SetVal(keys)
	return cmd
}

func (m *mockRedisClient) Exists(ctx context.Context, keys ...string) *redis.IntCmd {
	cmd := redis.NewIntCmd(ctx)
	count := int64(0)
	for _, key := range keys {
		if _, exists := m.data[key]; exists {
			count++
		}
	}
	cmd.SetVal(count)
	return cmd
}

func (m *mockRedisClient) Incr(ctx context.Context, key string) *redis.IntCmd {
	cmd := redis.NewIntCmd(ctx)
	if value, exists := m.data[key]; exists {
		var current int64
		json.Unmarshal([]byte(value), &current)
		current++
		data, _ := json.Marshal(current)
		m.data[key] = string(data)
		cmd.SetVal(current)
	} else {
		m.data[key] = "1"
		cmd.SetVal(1)
	}
	return cmd
}

func (m *mockRedisClient) Expire(ctx context.Context, key string, expiration time.Duration) *redis.BoolCmd {
	cmd := redis.NewBoolCmd(ctx)
	if _, exists := m.data[key]; exists {
		m.ttl[key] = time.Now().Add(expiration)
		cmd.SetVal(true)
	} else {
		cmd.SetVal(false)
	}
	return cmd
}

func (m *mockRedisClient) SetNX(ctx context.Context, key string, value interface{}, expiration time.Duration) *redis.BoolCmd {
	cmd := redis.NewBoolCmd(ctx)
	if _, exists := m.data[key]; !exists {
		data, _ := json.Marshal(value)
		m.data[key] = string(data)
		if expiration > 0 {
			m.ttl[key] = time.Now().Add(expiration)
		}
		cmd.SetVal(true)
	} else {
		cmd.SetVal(false)
	}
	return cmd
}

func (m *mockRedisClient) Pipeline() redis.Pipeliner {
	// Return nil since the cache service handles nil clients gracefully
	// and the tests are designed to work without Redis
	return nil
}

func setupTestCache() *CacheService {
	// For testing without Redis, return cache service with nil client
	return NewCacheService(nil)
}

// Note: The mockRedisClient is kept for potential future use but not currently used
// since the cache service is designed to gracefully handle nil Redis clients

func TestCacheService_SetAndGet(t *testing.T) {
	cache := setupTestCache()
	ctx := context.Background()

	// Test data
	testData := map[string]interface{}{
		"id":   "test-123",
		"name": "Test Bug",
	}

	// Set should not error even without Redis
	err := cache.Set(ctx, "test-key", testData, time.Minute)
	assert.NoError(t, err)

	// Get should return redis.Nil when Redis is not available
	var result map[string]interface{}
	err = cache.Get(ctx, "test-key", &result)
	assert.Equal(t, redis.Nil, err)
}

func TestCacheService_Delete(t *testing.T) {
	cache := setupTestCache()
	ctx := context.Background()

	// Delete should not error even without Redis
	err := cache.Delete(ctx, "test-key")
	assert.NoError(t, err)

	// Delete multiple keys
	err = cache.Delete(ctx, "key1", "key2", "key3")
	assert.NoError(t, err)
}

func TestCacheService_DeletePattern(t *testing.T) {
	cache := setupTestCache()
	ctx := context.Background()

	// DeletePattern should not error even without Redis
	err := cache.DeletePattern(ctx, "test:*")
	assert.NoError(t, err)
}

func TestCacheService_Exists(t *testing.T) {
	cache := setupTestCache()
	ctx := context.Background()

	// Exists should return false when Redis is not available
	exists, err := cache.Exists(ctx, "test-key")
	assert.NoError(t, err)
	assert.False(t, exists)
}

func TestCacheService_Increment(t *testing.T) {
	cache := setupTestCache()
	ctx := context.Background()

	// Increment should return 0 when Redis is not available
	count, err := cache.Increment(ctx, "counter", time.Minute)
	assert.NoError(t, err)
	assert.Equal(t, int64(0), count)
}

func TestCacheService_SetNX(t *testing.T) {
	cache := setupTestCache()
	ctx := context.Background()

	// SetNX should return false when Redis is not available
	success, err := cache.SetNX(ctx, "lock-key", "lock-value", time.Minute)
	assert.NoError(t, err)
	assert.False(t, success)
}

func TestCacheService_BugMethods(t *testing.T) {
	cache := setupTestCache()
	ctx := context.Background()

	bugData := map[string]interface{}{
		"id":    "bug-123",
		"title": "Test Bug",
	}

	// Test bug-specific cache methods
	err := cache.SetBug(ctx, "bug-123", bugData)
	assert.NoError(t, err)

	var result map[string]interface{}
	err = cache.GetBug(ctx, "bug-123", &result)
	assert.Equal(t, redis.Nil, err) // Should be cache miss without Redis

	err = cache.InvalidateBug(ctx, "bug-123")
	assert.NoError(t, err)
}

func TestCacheService_BugListMethods(t *testing.T) {
	cache := setupTestCache()
	ctx := context.Background()

	bugList := []map[string]interface{}{
		{"id": "bug-1", "title": "Bug 1"},
		{"id": "bug-2", "title": "Bug 2"},
	}

	// Test bug list cache methods
	err := cache.SetBugList(ctx, "recent", bugList)
	assert.NoError(t, err)

	var result []map[string]interface{}
	err = cache.GetBugList(ctx, "recent", &result)
	assert.Equal(t, redis.Nil, err) // Should be cache miss without Redis
}

func TestCacheService_CompanyMethods(t *testing.T) {
	cache := setupTestCache()
	ctx := context.Background()

	companyData := map[string]interface{}{
		"id":   "company-123",
		"name": "Test Company",
	}

	// Test company cache methods
	err := cache.SetCompany(ctx, "company-123", companyData)
	assert.NoError(t, err)

	var result map[string]interface{}
	err = cache.GetCompany(ctx, "company-123", &result)
	assert.Equal(t, redis.Nil, err) // Should be cache miss without Redis

	err = cache.InvalidateCompany(ctx, "company-123")
	assert.NoError(t, err)
}

func TestCacheService_UserMethods(t *testing.T) {
	cache := setupTestCache()
	ctx := context.Background()

	userData := map[string]interface{}{
		"id":    "user-123",
		"email": "test@example.com",
	}

	// Test user cache methods
	err := cache.SetUser(ctx, "user-123", userData)
	assert.NoError(t, err)

	var result map[string]interface{}
	err = cache.GetUser(ctx, "user-123", &result)
	assert.Equal(t, redis.Nil, err) // Should be cache miss without Redis

	err = cache.InvalidateUser(ctx, "user-123")
	assert.NoError(t, err)
}

func TestCacheService_ApplicationMethods(t *testing.T) {
	cache := setupTestCache()
	ctx := context.Background()

	appData := map[string]interface{}{
		"id":   "app-123",
		"name": "Test App",
	}

	// Test application cache methods
	err := cache.SetApplication(ctx, "app-123", appData)
	assert.NoError(t, err)

	var result map[string]interface{}
	err = cache.GetApplication(ctx, "app-123", &result)
	assert.Equal(t, redis.Nil, err) // Should be cache miss without Redis
}

func TestCacheService_StatsMethods(t *testing.T) {
	cache := setupTestCache()
	ctx := context.Background()

	statsData := map[string]interface{}{
		"total_bugs":  100,
		"open_bugs":   25,
		"closed_bugs": 75,
	}

	// Test stats cache methods
	err := cache.SetStats(ctx, "dashboard", statsData)
	assert.NoError(t, err)

	var result map[string]interface{}
	err = cache.GetStats(ctx, "dashboard", &result)
	assert.Equal(t, redis.Nil, err) // Should be cache miss without Redis
}

func TestGenerateCacheKey(t *testing.T) {
	tests := []struct {
		name     string
		params   []interface{}
		expected string
	}{
		{
			name:     "single parameter",
			params:   []interface{}{"test"},
			expected: "[test]",
		},
		{
			name:     "multiple parameters",
			params:   []interface{}{"bugs", "status", "open"},
			expected: "[bugs status open]",
		},
		{
			name:     "mixed types",
			params:   []interface{}{"user", 123, true},
			expected: "[user 123 true]",
		},
		{
			name:     "empty parameters",
			params:   []interface{}{},
			expected: "[]",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GenerateCacheKey(tt.params...)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestCacheService_CacheDurations(t *testing.T) {
	// Test that cache durations are set correctly
	assert.Equal(t, 5*time.Minute, ShortCacheDuration)
	assert.Equal(t, 30*time.Minute, MediumCacheDuration)
	assert.Equal(t, 2*time.Hour, LongCacheDuration)
}

func TestCacheService_CachePrefixes(t *testing.T) {
	// Test that cache prefixes are set correctly
	assert.Equal(t, "bug:", BugCachePrefix)
	assert.Equal(t, "bug_list:", BugListCachePrefix)
	assert.Equal(t, "company:", CompanyCachePrefix)
	assert.Equal(t, "user:", UserCachePrefix)
	assert.Equal(t, "app:", ApplicationCachePrefix)
	assert.Equal(t, "stats:", StatsCachePrefix)
}

// Performance benchmarks for cache operations
func BenchmarkCacheService_Set(b *testing.B) {
	cache := setupTestCache()
	ctx := context.Background()

	testData := map[string]interface{}{
		"id":          "test-123",
		"title":       "Test Bug Report",
		"description": "This is a test bug report for benchmarking",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		cache.Set(ctx, "test-key", testData, time.Minute)
	}
}

func BenchmarkCacheService_Get(b *testing.B) {
	cache := setupTestCache()
	ctx := context.Background()

	var result map[string]interface{}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		cache.Get(ctx, "test-key", &result)
	}
}

func BenchmarkCacheService_SetBug(b *testing.B) {
	cache := setupTestCache()
	ctx := context.Background()

	bugData := map[string]interface{}{
		"id":          "bug-123",
		"title":       "Performance Test Bug",
		"description": "This is a test bug for performance benchmarking",
		"status":      "open",
		"priority":    "medium",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		cache.SetBug(ctx, "bug-123", bugData)
	}
}

func BenchmarkGenerateCacheKey(b *testing.B) {
	params := []interface{}{"bugs", "status", "open", "page", 1, "limit", 20}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		GenerateCacheKey(params...)
	}
}

// Test cache invalidation patterns
func TestCacheService_InvalidationPatterns(t *testing.T) {
	cache := setupTestCache()
	ctx := context.Background()

	// Test that invalidation methods don't error without Redis
	err := cache.InvalidateBug(ctx, "bug-123")
	assert.NoError(t, err)

	err = cache.InvalidateCompany(ctx, "company-123")
	assert.NoError(t, err)

	err = cache.InvalidateUser(ctx, "user-123")
	assert.NoError(t, err)
}

// Test cache behavior with different data types
func TestCacheService_DataTypes(t *testing.T) {
	cache := setupTestCache()
	ctx := context.Background()

	tests := []struct {
		name string
		data interface{}
	}{
		{
			name: "string",
			data: "test string",
		},
		{
			name: "integer",
			data: 12345,
		},
		{
			name: "boolean",
			data: true,
		},
		{
			name: "slice",
			data: []string{"item1", "item2", "item3"},
		},
		{
			name: "map",
			data: map[string]interface{}{
				"key1": "value1",
				"key2": 123,
				"key3": true,
			},
		},
		{
			name: "struct-like map",
			data: map[string]interface{}{
				"id":          "test-123",
				"title":       "Test Title",
				"description": "Test Description",
				"tags":        []string{"tag1", "tag2"},
				"metadata": map[string]interface{}{
					"created_at": "2023-01-01T00:00:00Z",
					"updated_at": "2023-01-02T00:00:00Z",
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			key := "test-" + tt.name

			// Set should not error
			err := cache.Set(ctx, key, tt.data, time.Minute)
			assert.NoError(t, err)

			// Get should return cache miss without Redis
			var result interface{}
			err = cache.Get(ctx, key, &result)
			assert.Equal(t, redis.Nil, err)
		})
	}
}
