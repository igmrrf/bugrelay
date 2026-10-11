package utils

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSanitizeInput(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "normal text",
			input:    "Hello World",
			expected: "Hello World",
		},
		{
			name:     "text with null bytes",
			input:    "Hello\x00World",
			expected: "HelloWorld",
		},
		{
			name:     "text with HTML",
			input:    "<script>alert('xss')</script>",
			expected: "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;",
		},
		{
			name:     "text with control characters",
			input:    "Hello\x01\x02World\x03",
			expected: "HelloWorld",
		},
		{
			name:     "text with tabs and newlines",
			input:    "Hello\tWorld\n",
			expected: "Hello\tWorld",
		},
		{
			name:     "text with leading/trailing spaces",
			input:    "  Hello World  ",
			expected: "Hello World",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := SanitizeInput(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestSanitizeHTML(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "normal text",
			input:    "Hello World",
			expected: "Hello World",
		},
		{
			name:     "script tag",
			input:    "<script>alert('xss')</script>",
			expected: "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;",
		},
		{
			name:     "img tag with onerror",
			input:    "<img src='x' onerror='alert(1)'>",
			expected: "&lt;img src=&#39;x&#39; onerror=&#39;alert(1)&#39;&gt;",
		},
		{
			name:     "javascript protocol",
			input:    "<a href='javascript:alert(1)'>Click</a>",
			expected: "&lt;a href=&#39;javascript:alert(1)&#39;&gt;Click&lt;/a&gt;",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := SanitizeHTML(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestValidateEmail(t *testing.T) {
	tests := []struct {
		name     string
		email    string
		expected bool
	}{
		{
			name:     "valid email",
			email:    "test@example.com",
			expected: true,
		},
		{
			name:     "valid email with subdomain",
			email:    "user@mail.example.com",
			expected: true,
		},
		{
			name:     "valid email with plus",
			email:    "user+tag@example.com",
			expected: true,
		},
		{
			name:     "invalid email - no @",
			email:    "testexample.com",
			expected: false,
		},
		{
			name:     "invalid email - no domain",
			email:    "test@",
			expected: false,
		},
		{
			name:     "invalid email - no TLD",
			email:    "test@example",
			expected: false,
		},
		{
			name:     "empty email",
			email:    "",
			expected: false,
		},
		{
			name:     "too long email",
			email:    strings.Repeat("a", 250) + "@example.com",
			expected: false,
		},
		{
			name:     "email with javascript",
			email:    "test+javascript:alert(1)@example.com",
			expected: false,
		},
		{
			name:     "email with data protocol",
			email:    "test+data:text/html@example.com",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidateEmail(tt.email)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestValidateURL(t *testing.T) {
	tests := []struct {
		name     string
		url      string
		expected bool
	}{
		{
			name:     "valid HTTP URL",
			url:      "http://example.com",
			expected: true,
		},
		{
			name:     "valid HTTPS URL",
			url:      "https://example.com",
			expected: true,
		},
		{
			name:     "valid URL with path",
			url:      "https://example.com/path/to/page",
			expected: true,
		},
		{
			name:     "valid URL with query params",
			url:      "https://example.com/search?q=test",
			expected: true,
		},
		{
			name:     "invalid URL - no protocol",
			url:      "example.com",
			expected: false,
		},
		{
			name:     "invalid URL - javascript protocol",
			url:      "javascript:alert(1)",
			expected: false,
		},
		{
			name:     "invalid URL - data protocol",
			url:      "data:text/html,<script>alert(1)</script>",
			expected: false,
		},
		{
			name:     "invalid URL - file protocol",
			url:      "file:///etc/passwd",
			expected: false,
		},
		{
			name:     "empty URL",
			url:      "",
			expected: false,
		},
		{
			name:     "too long URL",
			url:      "https://example.com/" + strings.Repeat("a", 2050),
			expected: false,
		},
		{
			name:     "URL with script tag",
			url:      "https://example.com/<script>alert(1)</script>",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidateURL(tt.url)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestValidateString(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		minLength int
		maxLength int
		expected  bool
	}{
		{
			name:      "valid string",
			input:     "Hello World",
			minLength: 5,
			maxLength: 20,
			expected:  true,
		},
		{
			name:      "string too short",
			input:     "Hi",
			minLength: 5,
			maxLength: 20,
			expected:  false,
		},
		{
			name:      "string too long",
			input:     "This is a very long string that exceeds the maximum length",
			minLength: 5,
			maxLength: 20,
			expected:  false,
		},
		{
			name:      "string with script tag",
			input:     "Hello <script>alert(1)</script>",
			minLength: 5,
			maxLength: 50,
			expected:  false,
		},
		{
			name:      "string with javascript",
			input:     "Hello javascript:alert(1)",
			minLength: 5,
			maxLength: 50,
			expected:  false,
		},
		{
			name:      "string with onclick",
			input:     "Hello onclick=alert(1)",
			minLength: 5,
			maxLength: 50,
			expected:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, valid := ValidateString(tt.input, tt.minLength, tt.maxLength)
			assert.Equal(t, tt.expected, valid)
			if valid {
				assert.NotEmpty(t, result)
			}
		})
	}
}

func TestValidateTag(t *testing.T) {
	tests := []struct {
		name     string
		tag      string
		expected bool
	}{
		{
			name:     "valid tag",
			tag:      "ui-bug",
			expected: true,
		},
		{
			name:     "valid tag with spaces",
			tag:      "user interface",
			expected: true,
		},
		{
			name:     "valid tag with underscores",
			tag:      "performance_issue",
			expected: true,
		},
		{
			name:     "empty tag",
			tag:      "",
			expected: false,
		},
		{
			name:     "tag too long",
			tag:      strings.Repeat("a", 51),
			expected: false,
		},
		{
			name:     "tag with special characters",
			tag:      "bug@#$%",
			expected: false,
		},
		{
			name:     "tag with script",
			tag:      "<script>",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidateTag(tt.tag)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestValidatePriority(t *testing.T) {
	tests := []struct {
		name     string
		priority string
		expected bool
	}{
		{
			name:     "valid priority - low",
			priority: "low",
			expected: true,
		},
		{
			name:     "valid priority - medium",
			priority: "medium",
			expected: true,
		},
		{
			name:     "valid priority - high",
			priority: "high",
			expected: true,
		},
		{
			name:     "valid priority - critical",
			priority: "critical",
			expected: true,
		},
		{
			name:     "valid priority - uppercase",
			priority: "HIGH",
			expected: true,
		},
		{
			name:     "invalid priority",
			priority: "urgent",
			expected: false,
		},
		{
			name:     "empty priority",
			priority: "",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidatePriority(tt.priority)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestValidateStatus(t *testing.T) {
	tests := []struct {
		name     string
		status   string
		expected bool
	}{
		{
			name:     "valid status - open",
			status:   "open",
			expected: true,
		},
		{
			name:     "valid status - reviewing",
			status:   "reviewing",
			expected: true,
		},
		{
			name:     "valid status - fixed",
			status:   "fixed",
			expected: true,
		},
		{
			name:     "valid status - wont_fix",
			status:   "wont_fix",
			expected: true,
		},
		{
			name:     "valid status - uppercase",
			status:   "OPEN",
			expected: true,
		},
		{
			name:     "invalid status",
			status:   "closed",
			expected: false,
		},
		{
			name:     "empty status",
			status:   "",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidateStatus(tt.status)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestContainsSQLInjection(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		{
			name:     "normal text",
			input:    "Hello World",
			expected: false,
		},
		{
			name:     "text with single quote",
			input:    "It's a test",
			expected: true,
		},
		{
			name:     "text with double quote",
			input:    "He said \"hello\"",
			expected: true,
		},
		{
			name:     "text with semicolon",
			input:    "Hello; DROP TABLE users;",
			expected: true,
		},
		{
			name:     "text with SQL comment",
			input:    "Hello -- comment",
			expected: true,
		},
		{
			name:     "text with UNION",
			input:    "Hello UNION SELECT * FROM users",
			expected: true,
		},
		{
			name:     "text with SELECT",
			input:    "Hello SELECT password FROM users",
			expected: true,
		},
		{
			name:     "text with stored procedure",
			input:    "Hello xp_cmdshell",
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ContainsSQLInjection(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestValidateFileType(t *testing.T) {
	tests := []struct {
		name        string
		filename    string
		contentType string
		expected    bool
	}{
		{
			name:        "valid JPEG file",
			filename:    "image.jpg",
			contentType: "image/jpeg",
			expected:    true,
		},
		{
			name:        "valid PNG file",
			filename:    "screenshot.png",
			contentType: "image/png",
			expected:    true,
		},
		{
			name:        "valid GIF file",
			filename:    "animation.gif",
			contentType: "image/gif",
			expected:    true,
		},
		{
			name:        "valid WebP file",
			filename:    "modern.webp",
			contentType: "image/webp",
			expected:    true,
		},
		{
			name:        "invalid file type - PDF",
			filename:    "document.pdf",
			contentType: "application/pdf",
			expected:    false,
		},
		{
			name:        "invalid file type - executable",
			filename:    "malware.exe",
			contentType: "application/octet-stream",
			expected:    false,
		},
		{
			name:        "mismatched extension and content type",
			filename:    "image.jpg",
			contentType: "application/pdf",
			expected:    false,
		},
		{
			name:        "case insensitive extension",
			filename:    "IMAGE.JPG",
			contentType: "image/jpeg",
			expected:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidateFileType(tt.filename, tt.contentType)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// Benchmark tests for performance validation
func BenchmarkSanitizeInput(b *testing.B) {
	input := "<script>alert('xss')</script>Hello World with some text"
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		SanitizeInput(input)
	}
}

func BenchmarkValidateEmail(b *testing.B) {
	email := "test@example.com"
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ValidateEmail(email)
	}
}

func BenchmarkValidateURL(b *testing.B) {
	url := "https://example.com/path/to/resource"
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ValidateURL(url)
	}
}

func BenchmarkContainsSQLInjection(b *testing.B) {
	input := "This is a normal string without any SQL injection attempts"
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ContainsSQLInjection(input)
	}
}