package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// CacheService provides caching functionality using Redis
type CacheService struct {
	client *redis.Client
}

// NewCacheService creates a new cache service
func NewCacheService(client *redis.Client) *CacheService {
	return &CacheService{
		client: client,
	}
}

// Cache key prefixes for different data types
const (
	BugCachePrefix        = "bug:"
	BugListCachePrefix    = "bug_list:"
	CompanyCachePrefix    = "company:"
	UserCachePrefix       = "user:"
	ApplicationCachePrefix = "app:"
	StatsCachePrefix      = "stats:"
)

// Cache durations
const (
	ShortCacheDuration  = 5 * time.Minute
	MediumCacheDuration = 30 * time.Minute
	LongCacheDuration   = 2 * time.Hour
)

// Set stores a value in cache with expiration
func (c *CacheService) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	if c.client == nil {
		return nil // Gracefully handle missing Redis
	}

	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal cache value: %w", err)
	}

	return c.client.Set(ctx, key, data, expiration).Err()
}

// Get retrieves a value from cache
func (c *CacheService) Get(ctx context.Context, key string, dest interface{}) error {
	if c.client == nil {
		return redis.Nil // Simulate cache miss when Redis unavailable
	}

	data, err := c.client.Get(ctx, key).Result()
	if err != nil {
		return err
	}

	return json.Unmarshal([]byte(data), dest)
}

// Delete removes a key from cache
func (c *CacheService) Delete(ctx context.Context, keys ...string) error {
	if c.client == nil || len(keys) == 0 {
		return nil
	}

	return c.client.Del(ctx, keys...).Err()
}

// DeletePattern removes all keys matching a pattern
func (c *CacheService) DeletePattern(ctx context.Context, pattern string) error {
	if c.client == nil {
		return nil
	}

	keys, err := c.client.Keys(ctx, pattern).Result()
	if err != nil {
		return err
	}

	if len(keys) > 0 {
		return c.client.Del(ctx, keys...).Err()
	}

	return nil
}

// Exists checks if a key exists in cache
func (c *CacheService) Exists(ctx context.Context, key string) (bool, error) {
	if c.client == nil {
		return false, nil
	}

	count, err := c.client.Exists(ctx, key).Result()
	return count > 0, err
}

// Increment atomically increments a counter
func (c *CacheService) Increment(ctx context.Context, key string, expiration time.Duration) (int64, error) {
	if c.client == nil {
		return 0, nil
	}

	pipe := c.client.Pipeline()
	incr := pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, expiration)
	
	_, err := pipe.Exec(ctx)
	if err != nil {
		return 0, err
	}

	return incr.Val(), nil
}

// SetNX sets a key only if it doesn't exist (useful for locks)
func (c *CacheService) SetNX(ctx context.Context, key string, value interface{}, expiration time.Duration) (bool, error) {
	if c.client == nil {
		return false, nil
	}

	data, err := json.Marshal(value)
	if err != nil {
		return false, fmt.Errorf("failed to marshal cache value: %w", err)
	}

	return c.client.SetNX(ctx, key, data, expiration).Result()
}

// Bug-specific cache methods
func (c *CacheService) SetBug(ctx context.Context, bugID string, bug interface{}) error {
	key := BugCachePrefix + bugID
	return c.Set(ctx, key, bug, MediumCacheDuration)
}

func (c *CacheService) GetBug(ctx context.Context, bugID string, dest interface{}) error {
	key := BugCachePrefix + bugID
	return c.Get(ctx, key, dest)
}

func (c *CacheService) InvalidateBug(ctx context.Context, bugID string) error {
	// Invalidate specific bug and related list caches
	keys := []string{
		BugCachePrefix + bugID,
	}
	
	// Also invalidate bug list caches that might contain this bug
	if err := c.DeletePattern(ctx, BugListCachePrefix+"*"); err != nil {
		return err
	}
	
	return c.Delete(ctx, keys...)
}

// Bug list cache methods
func (c *CacheService) SetBugList(ctx context.Context, cacheKey string, bugs interface{}) error {
	key := BugListCachePrefix + cacheKey
	return c.Set(ctx, key, bugs, ShortCacheDuration)
}

func (c *CacheService) GetBugList(ctx context.Context, cacheKey string, dest interface{}) error {
	key := BugListCachePrefix + cacheKey
	return c.Get(ctx, key, dest)
}

// Company cache methods
func (c *CacheService) SetCompany(ctx context.Context, companyID string, company interface{}) error {
	key := CompanyCachePrefix + companyID
	return c.Set(ctx, key, company, LongCacheDuration)
}

func (c *CacheService) GetCompany(ctx context.Context, companyID string, dest interface{}) error {
	key := CompanyCachePrefix + companyID
	return c.Get(ctx, key, dest)
}

func (c *CacheService) InvalidateCompany(ctx context.Context, companyID string) error {
	keys := []string{
		CompanyCachePrefix + companyID,
	}
	return c.Delete(ctx, keys...)
}

// User cache methods
func (c *CacheService) SetUser(ctx context.Context, userID string, user interface{}) error {
	key := UserCachePrefix + userID
	return c.Set(ctx, key, user, MediumCacheDuration)
}

func (c *CacheService) GetUser(ctx context.Context, userID string, dest interface{}) error {
	key := UserCachePrefix + userID
	return c.Get(ctx, key, dest)
}

func (c *CacheService) InvalidateUser(ctx context.Context, userID string) error {
	keys := []string{
		UserCachePrefix + userID,
	}
	return c.Delete(ctx, keys...)
}

// Application cache methods
func (c *CacheService) SetApplication(ctx context.Context, appID string, app interface{}) error {
	key := ApplicationCachePrefix + appID
	return c.Set(ctx, key, app, LongCacheDuration)
}

func (c *CacheService) GetApplication(ctx context.Context, appID string, dest interface{}) error {
	key := ApplicationCachePrefix + appID
	return c.Get(ctx, key, dest)
}

// Statistics cache methods
func (c *CacheService) SetStats(ctx context.Context, statsKey string, stats interface{}) error {
	key := StatsCachePrefix + statsKey
	return c.Set(ctx, key, stats, MediumCacheDuration)
}

func (c *CacheService) GetStats(ctx context.Context, statsKey string, dest interface{}) error {
	key := StatsCachePrefix + statsKey
	return c.Get(ctx, key, dest)
}

// GenerateCacheKey creates a consistent cache key from parameters
func GenerateCacheKey(params ...interface{}) string {
	var keyParts []string
	for _, param := range params {
		keyParts = append(keyParts, fmt.Sprintf("%v", param))
	}
	return fmt.Sprintf("%s", keyParts)
}