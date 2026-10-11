package utils

import (
	"bytes"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"mime/multipart"
	"path/filepath"
	"strings"

	"golang.org/x/image/draw"
	"golang.org/x/image/webp"
)

// ImageProcessor handles image optimization and processing
type ImageProcessor struct {
	MaxWidth      int
	MaxHeight     int
	JpegQuality   int
	EnableWebP    bool
}

// NewImageProcessor creates a new image processor with default settings
func NewImageProcessor() *ImageProcessor {
	return &ImageProcessor{
		MaxWidth:    1920,
		MaxHeight:   1080,
		JpegQuality: 85,
		EnableWebP:  true,
	}
}

// ProcessedImage represents a processed image with metadata
type ProcessedImage struct {
	Data        []byte
	ContentType string
	Width       int
	Height      int
	Size        int
	Format      string
}

// ProcessImage optimizes an uploaded image
func (p *ImageProcessor) ProcessImage(file *multipart.FileHeader) (*ProcessedImage, error) {
	// Open the uploaded file
	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	// Read the image data
	data, err := io.ReadAll(src)
	if err != nil {
		return nil, fmt.Errorf("failed to read image data: %w", err)
	}

	// Decode the image
	img, format, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %w", err)
	}

	// Get original dimensions
	bounds := img.Bounds()
	originalWidth := bounds.Dx()
	originalHeight := bounds.Dy()

	// Calculate new dimensions if resizing is needed
	newWidth, newHeight := p.calculateNewDimensions(originalWidth, originalHeight)
	
	// Resize image if necessary
	if newWidth != originalWidth || newHeight != originalHeight {
		img = p.resizeImage(img, newWidth, newHeight)
	}

	// Optimize and encode the image
	optimizedData, contentType, err := p.encodeOptimized(img, format, file.Filename)
	if err != nil {
		return nil, fmt.Errorf("failed to optimize image: %w", err)
	}

	return &ProcessedImage{
		Data:        optimizedData,
		ContentType: contentType,
		Width:       newWidth,
		Height:      newHeight,
		Size:        len(optimizedData),
		Format:      format,
	}, nil
}

// calculateNewDimensions calculates new dimensions while maintaining aspect ratio
func (p *ImageProcessor) calculateNewDimensions(width, height int) (int, int) {
	if width <= p.MaxWidth && height <= p.MaxHeight {
		return width, height
	}

	// Calculate scaling factor
	widthRatio := float64(p.MaxWidth) / float64(width)
	heightRatio := float64(p.MaxHeight) / float64(height)
	
	// Use the smaller ratio to ensure both dimensions fit within limits
	ratio := widthRatio
	if heightRatio < widthRatio {
		ratio = heightRatio
	}

	newWidth := int(float64(width) * ratio)
	newHeight := int(float64(height) * ratio)

	return newWidth, newHeight
}

// resizeImage resizes an image using high-quality resampling
func (p *ImageProcessor) resizeImage(src image.Image, width, height int) image.Image {
	dst := image.NewRGBA(image.Rect(0, 0, width, height))
	draw.CatmullRom.Scale(dst, dst.Bounds(), src, src.Bounds(), draw.Over, nil)
	return dst
}

// encodeOptimized encodes the image in the most appropriate format
func (p *ImageProcessor) encodeOptimized(img image.Image, originalFormat, filename string) ([]byte, string, error) {
	var buf bytes.Buffer
	var contentType string
	
	// Determine the best output format
	outputFormat := p.getBestOutputFormat(originalFormat, filename)
	
	switch outputFormat {
	case "jpeg":
		err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: p.JpegQuality})
		if err != nil {
			return nil, "", err
		}
		contentType = "image/jpeg"
		
	case "png":
		err := png.Encode(&buf, img)
		if err != nil {
			return nil, "", err
		}
		contentType = "image/png"
		
	case "gif":
		// For GIF, we need to handle it specially to preserve animation
		// For now, we'll convert to PNG for static images
		err := png.Encode(&buf, img)
		if err != nil {
			return nil, "", err
		}
		contentType = "image/png"
		
	default:
		// Default to JPEG for unknown formats
		err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: p.JpegQuality})
		if err != nil {
			return nil, "", err
		}
		contentType = "image/jpeg"
	}
	
	return buf.Bytes(), contentType, nil
}

// getBestOutputFormat determines the best output format for the image
func (p *ImageProcessor) getBestOutputFormat(originalFormat, filename string) string {
	// Check file extension
	ext := strings.ToLower(filepath.Ext(filename))
	
	switch ext {
	case ".png":
		return "png"
	case ".gif":
		return "gif"
	case ".jpg", ".jpeg":
		return "jpeg"
	case ".webp":
		if p.EnableWebP {
			return "webp"
		}
		return "jpeg"
	default:
		// Use original format if supported, otherwise default to JPEG
		switch originalFormat {
		case "png":
			return "png"
		case "gif":
			return "gif"
		default:
			return "jpeg"
		}
	}
}

// ValidateImageFile validates that a file is a supported image format
func ValidateImageFile(file *multipart.FileHeader) error {
	// Check file size (max 10MB)
	if file.Size > 10*1024*1024 {
		return fmt.Errorf("file size exceeds 10MB limit")
	}
	
	// Check file extension
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExts := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".webp": true,
	}
	
	if !allowedExts[ext] {
		return fmt.Errorf("unsupported file format: %s", ext)
	}
	
	// Open and validate the file content
	src, err := file.Open()
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer src.Close()
	
	// Read first 512 bytes to detect content type
	buffer := make([]byte, 512)
	_, err = src.Read(buffer)
	if err != nil {
		return fmt.Errorf("failed to read file content: %w", err)
	}
	
	// Reset file pointer
	src.Seek(0, 0)
	
	// Try to decode as image to validate format
	_, format, err := image.Decode(src)
	if err != nil {
		// Try WebP if standard decode fails
		src.Seek(0, 0)
		_, err = webp.Decode(src)
		if err != nil {
			return fmt.Errorf("invalid image file: %w", err)
		}
		format = "webp"
	}
	
	// Validate format matches extension
	expectedFormats := map[string][]string{
		".jpg":  {"jpeg"},
		".jpeg": {"jpeg"},
		".png":  {"png"},
		".gif":  {"gif"},
		".webp": {"webp"},
	}
	
	if expected, exists := expectedFormats[ext]; exists {
		formatMatches := false
		for _, expectedFormat := range expected {
			if format == expectedFormat {
				formatMatches = true
				break
			}
		}
		if !formatMatches {
			return fmt.Errorf("file extension %s does not match image format %s", ext, format)
		}
	}
	
	return nil
}

// GenerateThumbnail creates a thumbnail version of an image
func (p *ImageProcessor) GenerateThumbnail(img image.Image, maxSize int) image.Image {
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()
	
	// Calculate thumbnail dimensions
	var newWidth, newHeight int
	if width > height {
		newWidth = maxSize
		newHeight = int(float64(height) * float64(maxSize) / float64(width))
	} else {
		newHeight = maxSize
		newWidth = int(float64(width) * float64(maxSize) / float64(height))
	}
	
	return p.resizeImage(img, newWidth, newHeight)
}