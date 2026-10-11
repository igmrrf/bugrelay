# File Uploads Guide

This guide provides comprehensive documentation for implementing file uploads in BugRelay, including supported formats, size limits, security considerations, and integration examples.

## Overview

BugRelay supports file attachments for bug reports to help users provide visual evidence, logs, and other supporting materials. The file upload system is designed with security and performance in mind, supporting only image files with strict validation and size limits.

## Supported File Types

### Image Files Only

Currently, BugRelay only accepts image file attachments for security reasons:

- **JPEG** (.jpg, .jpeg) - Recommended for photographs and complex images
- **PNG** (.png) - Recommended for screenshots and images with transparency
- **GIF** (.gif) - Supported for animated images and simple graphics
- **WebP** (.webp) - Modern format with excellent compression

### File Size Limits

- **Maximum file size**: 10 MB per file
- **Request size limit**: 10 MB total per request
- **Multiple files**: Upload one file at a time

## Security Considerations

### File Type Validation

BugRelay implements multiple layers of file type validation:

1. **MIME Type Detection**: Server-side content type detection using the first 512 bytes
2. **File Extension Validation**: Checks file extension against allowed types
3. **Content Inspection**: Validates that the file content matches the declared type

### Security Features

- **Virus Scanning**: Files are scanned for malicious content (planned feature)
- **Content Sanitization**: Image files are processed to remove metadata
- **Secure Storage**: Files are stored with unique names to prevent conflicts
- **Access Control**: Only authenticated users can upload files
- **Permission Checks**: Users can only upload to their own bug reports

### Blocked File Types

The following file types are explicitly blocked for security:
- Executable files (.exe, .bat, .sh, .cmd)
- Script files (.js, .php, .py, .rb)
- Archive files (.zip, .rar, .tar)
- Document files (.pdf, .doc, .xls) - planned for future support
- Any file with suspicious content or metadata

## API Endpoints

### Upload File to Bug Report

Upload a file attachment to an existing bug report.

**Endpoint:** `POST /api/v1/bugs/{id}/attachments`

**Authentication:** Required (JWT token)

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: The file to upload (required)

**Example Request:**

```bash
curl -X POST "https://api.bugrelay.com/api/v1/bugs/{bug-id}/attachments" \
  -H "Authorization: Bearer <your-token>" \
  -F "file=@screenshot.png"
```

**Response (201 Created):**

```json
{
  "message": "File uploaded successfully",
  "attachment": {
    "id": "attachment-uuid",
    "bug_id": "bug-uuid",
    "filename": "screenshot.png",
    "file_url": "/uploads/bugs/bug-uuid_1640995200.png",
    "file_size": 245760,
    "mime_type": "image/png",
    "uploaded_at": "2024-01-15T10:30:00Z"
  }
}
```

### Permission Requirements

- **Authentication**: Valid JWT token required
- **Bug Access**: Users can only upload to their own bug reports
- **Admin Override**: Administrators can upload to any bug report

## Integration Examples

### JavaScript/HTML Form Upload

```html
<!DOCTYPE html>
<html>
<head>
    <title>Bug Report File Upload</title>
</head>
<body>
    <form id="uploadForm" enctype="multipart/form-data">
        <div>
            <label for="fileInput">Select Image:</label>
            <input type="file" id="fileInput" name="file" accept="image/*" required>
        </div>
        <div>
            <button type="submit">Upload File</button>
        </div>
        <div id="progress" style="display: none;">
            <progress id="progressBar" value="0" max="100"></progress>
            <span id="progressText">0%</span>
        </div>
        <div id="result"></div>
    </form>

    <script>
        document.getElementById('uploadForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const fileInput = document.getElementById('fileInput');
            const file = fileInput.files[0];
            
            if (!file) {
                alert('Please select a file');
                return;
            }
            
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                alert('Only image files are allowed (JPEG, PNG, GIF, WebP)');
                return;
            }
            
            // Validate file size (10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('File size must be less than 10MB');
                return;
            }
            
            const formData = new FormData();
            formData.append('file', file);
            
            const progressDiv = document.getElementById('progress');
            const progressBar = document.getElementById('progressBar');
            const progressText = document.getElementById('progressText');
            const resultDiv = document.getElementById('result');
            
            progressDiv.style.display = 'block';
            
            try {
                const response = await fetch('/api/v1/bugs/YOUR_BUG_ID/attachments', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer YOUR_JWT_TOKEN'
                    },
                    body: formData
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    resultDiv.innerHTML = `
                        <div style="color: green;">
                            <h3>Upload Successful!</h3>
                            <p>File: ${result.attachment.filename}</p>
                            <p>Size: ${(result.attachment.file_size / 1024).toFixed(1)} KB</p>
                            <p>Type: ${result.attachment.mime_type}</p>
                        </div>
                    `;
                } else {
                    resultDiv.innerHTML = `
                        <div style="color: red;">
                            <h3>Upload Failed</h3>
                            <p>Error: ${result.error.message}</p>
                        </div>
                    `;
                }
            } catch (error) {
                resultDiv.innerHTML = `
                    <div style="color: red;">
                        <h3>Upload Error</h3>
                        <p>Network error: ${error.message}</p>
                    </div>
                `;
            } finally {
                progressDiv.style.display = 'none';
            }
        });
    </script>
</body>
</html>
```

### JavaScript/Fetch API

```javascript
class BugRelayFileUpload {
    constructor(apiKey, baseUrl = 'https://api.bugrelay.com/api/v1') {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }

    async uploadFile(bugId, file, onProgress = null) {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            throw new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)');
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            throw new Error('File size must be less than 10MB');
        }

        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();

        return new Promise((resolve, reject) => {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    onProgress(percentComplete);
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Network error during upload'));
            });

            xhr.open('POST', `${this.baseUrl}/bugs/${bugId}/attachments`);
            xhr.setRequestHeader('Authorization', `Bearer ${this.apiKey}`);
            xhr.send(formData);
        });
    }

    async uploadFileSimple(bugId, file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${this.baseUrl}/bugs/${bugId}/attachments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error.message || 'Upload failed');
        }

        return response.json();
    }
}

// Usage example
const uploader = new BugRelayFileUpload('your-jwt-token');

// Upload with progress tracking
const fileInput = document.getElementById('fileInput');
const file = fileInput.files[0];

uploader.uploadFile('bug-uuid', file, (progress) => {
    console.log(`Upload progress: ${progress.toFixed(1)}%`);
}).then(result => {
    console.log('Upload successful:', result);
}).catch(error => {
    console.error('Upload failed:', error.message);
});
```

### React Component Example

```jsx
import React, { useState, useCallback } from 'react';

const FileUploadComponent = ({ bugId, onUploadSuccess }) => {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);

    const validateFile = (file) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        
        if (!allowedTypes.includes(file.type)) {
            throw new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)');
        }
        
        if (file.size > 10 * 1024 * 1024) {
            throw new Error('File size must be less than 10MB');
        }
    };

    const uploadFile = useCallback(async (file) => {
        try {
            validateFile(file);
            setUploading(true);
            setError(null);
            setProgress(0);

            const formData = new FormData();
            formData.append('file', file);

            const xhr = new XMLHttpRequest();

            return new Promise((resolve, reject) => {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        setProgress(percentComplete);
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const result = JSON.parse(xhr.responseText);
                        resolve(result);
                    } else {
                        const error = JSON.parse(xhr.responseText);
                        reject(new Error(error.error.message || 'Upload failed'));
                    }
                });

                xhr.addEventListener('error', () => {
                    reject(new Error('Network error during upload'));
                });

                xhr.open('POST', `/api/v1/bugs/${bugId}/attachments`);
                xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('jwt_token')}`);
                xhr.send(formData);
            });
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, [bugId]);

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const result = await uploadFile(file);
            onUploadSuccess(result.attachment);
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    return (
        <div className="file-upload-component">
            <div className="upload-area">
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="file-input"
                />
                
                {uploading && (
                    <div className="progress-container">
                        <div className="progress-bar">
                            <div 
                                className="progress-fill" 
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="progress-text">{progress.toFixed(1)}%</span>
                    </div>
                )}
                
                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileUploadComponent;
```

### Python Integration

```python
import requests
import os
from typing import Optional

class BugRelayFileUpload:
    def __init__(self, api_key: str, base_url: str = 'https://api.bugrelay.com/api/v1'):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {api_key}'
        }

    def validate_file(self, file_path: str) -> None:
        """Validate file before upload"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Check file size (10MB limit)
        file_size = os.path.getsize(file_path)
        if file_size > 10 * 1024 * 1024:
            raise ValueError("File size must be less than 10MB")
        
        # Check file extension
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        file_ext = os.path.splitext(file_path)[1].lower()
        if file_ext not in allowed_extensions:
            raise ValueError(f"Only image files are allowed: {', '.join(allowed_extensions)}")

    def upload_file(self, bug_id: str, file_path: str) -> dict:
        """Upload a file to a bug report"""
        self.validate_file(file_path)
        
        with open(file_path, 'rb') as file:
            files = {'file': (os.path.basename(file_path), file)}
            
            response = requests.post(
                f'{self.base_url}/bugs/{bug_id}/attachments',
                headers={'Authorization': self.headers['Authorization']},
                files=files
            )
        
        if response.status_code == 201:
            return response.json()
        else:
            error_data = response.json()
            raise Exception(f"Upload failed: {error_data.get('error', {}).get('message', 'Unknown error')}")

    def upload_file_with_progress(self, bug_id: str, file_path: str, progress_callback: Optional[callable] = None) -> dict:
        """Upload file with progress tracking"""
        import requests_toolbelt
        
        self.validate_file(file_path)
        
        with open(file_path, 'rb') as file:
            encoder = requests_toolbelt.MultipartEncoder(
                fields={'file': (os.path.basename(file_path), file, 'image/png')}
            )
            
            if progress_callback:
                monitor = requests_toolbelt.MultipartEncoderMonitor(encoder, progress_callback)
                data = monitor
            else:
                data = encoder
            
            response = requests.post(
                f'{self.base_url}/bugs/{bug_id}/attachments',
                headers={
                    'Authorization': self.headers['Authorization'],
                    'Content-Type': data.content_type
                },
                data=data
            )
        
        if response.status_code == 201:
            return response.json()
        else:
            error_data = response.json()
            raise Exception(f"Upload failed: {error_data.get('error', {}).get('message', 'Unknown error')}")

# Usage example
def progress_callback(monitor):
    progress = (monitor.bytes_read / monitor.len) * 100
    print(f"Upload progress: {progress:.1f}%")

uploader = BugRelayFileUpload('your-jwt-token')

try:
    # Simple upload
    result = uploader.upload_file('bug-uuid', 'screenshot.png')
    print(f"Upload successful: {result['attachment']['filename']}")
    
    # Upload with progress
    result = uploader.upload_file_with_progress('bug-uuid', 'large-image.jpg', progress_callback)
    print(f"Upload with progress successful: {result['attachment']['filename']}")
    
except Exception as e:
    print(f"Upload failed: {e}")
```

## Error Handling

### Common Error Codes

- `INVALID_ID`: Invalid bug ID format
- `BUG_NOT_FOUND`: Bug report not found
- `AUTH_REQUIRED`: Authentication required for file uploads
- `UPLOAD_FORBIDDEN`: User can only upload to their own bug reports
- `NO_FILE`: No file was uploaded in the request
- `FILE_TOO_LARGE`: File size exceeds 10MB limit
- `INVALID_FILE_TYPE`: Only image files are allowed
- `FILE_READ_ERROR`: Failed to read uploaded file
- `SAVE_FAILED`: Failed to save uploaded file to storage
- `DB_ERROR`: Failed to save file attachment record

### Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Client-Side Validation

Always validate files on the client side before uploading:

```javascript
function validateFile(file) {
    const errors = [];
    
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        errors.push('Only image files are allowed (JPEG, PNG, GIF, WebP)');
    }
    
    // Check file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
        errors.push('File size must be less than 10MB');
    }
    
    // Check filename
    if (file.name.length > 255) {
        errors.push('Filename must be less than 255 characters');
    }
    
    return errors;
}
```

## Best Practices

### Performance Optimization

1. **Image Compression**: Compress images before upload to reduce file size
2. **Progressive Upload**: Show upload progress to improve user experience
3. **Retry Logic**: Implement retry logic for failed uploads
4. **Chunked Upload**: For large files, consider implementing chunked uploads (future feature)

### Security Best Practices

1. **Client-Side Validation**: Always validate files on the client side
2. **Server-Side Validation**: Never trust client-side validation alone
3. **File Type Detection**: Use server-side MIME type detection
4. **Secure Storage**: Store files outside the web root directory
5. **Access Control**: Implement proper authentication and authorization

### User Experience

1. **Progress Indicators**: Show upload progress for better UX
2. **Error Messages**: Provide clear, actionable error messages
3. **File Previews**: Show image previews before upload
4. **Drag and Drop**: Implement drag-and-drop functionality
5. **Multiple Files**: Allow multiple file selection (upload one at a time)

## Storage and CDN

### Current Implementation

- **Local Storage**: Files are currently stored locally in the `uploads/bugs/` directory
- **Unique Filenames**: Files are renamed with UUID and timestamp to prevent conflicts
- **Direct Access**: Files are served directly from the storage directory

### Production Recommendations

For production deployments, consider:

1. **Cloud Storage**: Use AWS S3, Google Cloud Storage, or Azure Blob Storage
2. **CDN Integration**: Serve files through a CDN for better performance
3. **Image Processing**: Implement automatic image optimization and resizing
4. **Backup Strategy**: Implement regular backups of uploaded files

### Future Enhancements

Planned features for file uploads:

1. **Additional File Types**: Support for PDF, text files, and logs
2. **Image Processing**: Automatic image optimization and thumbnail generation
3. **Virus Scanning**: Integration with antivirus services
4. **Chunked Uploads**: Support for large file uploads with resume capability
5. **File Versioning**: Track file versions and changes

## Troubleshooting

### Common Issues

1. **Upload Fails Silently**
   - Check network connectivity
   - Verify JWT token is valid and not expired
   - Ensure file meets size and type requirements

2. **File Too Large Error**
   - Compress images before upload
   - Check if file is actually under 10MB
   - Consider splitting large files

3. **Invalid File Type**
   - Ensure file is an image (JPEG, PNG, GIF, WebP)
   - Check file extension matches content type
   - Verify file is not corrupted

4. **Permission Denied**
   - Verify user is authenticated
   - Check if user owns the bug report
   - Ensure user has upload permissions

### Debug Information

Enable debug logging to troubleshoot upload issues:

```javascript
// Enable debug mode
const debug = true;

if (debug) {
    console.log('File details:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
    });
}
```

## Support

For additional help with file uploads:

- **API Documentation**: [https://docs.bugrelay.com/api/endpoints/bugs](https://docs.bugrelay.com/api/endpoints/bugs)
- **Support Email**: support@bugrelay.com
- **GitHub Issues**: [https://github.com/bugrelay/bugrelay/issues](https://github.com/bugrelay/bugrelay/issues)

## Related Documentation

- [Bug Report API](/api/endpoints/bugs) - Complete bug report API documentation
- [Authentication Guide](/authentication/) - JWT authentication setup
- [Security Guide](/guides/security) - Security best practices
- [API Examples](/api/examples/) - More API integration examples