# Webhooks Guide

This guide provides comprehensive documentation for setting up and configuring webhooks in BugRelay, including payload examples, security best practices, and integration workflows.

## Overview

BugRelay webhooks allow you to receive real-time notifications when events occur in your bug tracking system. Instead of polling the API for changes, webhooks push event data to your specified endpoints, enabling immediate responses to bug reports, status changes, and other important events.

## Webhook Events

### Available Events

BugRelay supports webhooks for the following events:

#### Bug Report Events
- `bug.created` - New bug report submitted
- `bug.updated` - Bug report details modified
- `bug.status_changed` - Bug status updated (open, reviewing, fixed, wont_fix)
- `bug.priority_changed` - Bug priority modified
- `bug.assigned` - Bug assigned to company or team member
- `bug.commented` - New comment added to bug report
- `bug.voted` - User voted on bug report

#### Company Events
- `company.verified` - Company completed verification process
- `company.member_added` - New team member added
- `company.member_removed` - Team member removed
- `company.member_role_changed` - Team member role updated

#### User Events
- `user.registered` - New user account created
- `user.email_verified` - User email verification completed
- `user.profile_updated` - User profile information changed

#### System Events
- `system.maintenance_scheduled` - Scheduled maintenance notification
- `system.security_alert` - Security-related alerts

## Webhook Configuration

### Setting Up Webhooks

Webhooks are configured per company and require admin permissions. You can set up webhooks through the API or the web interface.

#### API Configuration

**Endpoint:** `POST /api/v1/companies/{id}/webhooks`

**Authentication:** Required (Company admin)

**Request Body:**
```json
{
  "url": "https://your-app.com/webhooks/bugrelay",
  "events": ["bug.created", "bug.status_changed", "bug.commented"],
  "secret": "your-webhook-secret",
  "active": true,
  "description": "Production webhook for bug notifications"
}
```

**Response (201 Created):**
```json
{
  "webhook": {
    "id": "webhook-uuid",
    "company_id": "company-uuid",
    "url": "https://your-app.com/webhooks/bugrelay",
    "events": ["bug.created", "bug.status_changed", "bug.commented"],
    "secret": "your-webhook-secret",
    "active": true,
    "description": "Production webhook for bug notifications",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "last_delivery": null,
    "delivery_count": 0,
    "failure_count": 0
  }
}
```

### Webhook Management

#### List Webhooks
```http
GET /api/v1/companies/{id}/webhooks
```

#### Update Webhook
```http
PUT /api/v1/companies/{id}/webhooks/{webhook_id}
```

#### Delete Webhook
```http
DELETE /api/v1/companies/{id}/webhooks/{webhook_id}
```

#### Test Webhook
```http
POST /api/v1/companies/{id}/webhooks/{webhook_id}/test
```

## Webhook Payloads

### Payload Structure

All webhook payloads follow a consistent structure:

```json
{
  "event": "bug.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "webhook_id": "webhook-uuid",
  "company_id": "company-uuid",
  "delivery_id": "delivery-uuid",
  "data": {
    // Event-specific data
  }
}
```

### Bug Created Event

```json
{
  "event": "bug.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "webhook_id": "webhook-uuid",
  "company_id": "company-uuid",
  "delivery_id": "delivery-uuid",
  "data": {
    "bug": {
      "id": "bug-uuid",
      "title": "Application crashes on startup",
      "description": "The app crashes immediately when launched on iOS 17",
      "status": "open",
      "priority": "high",
      "tags": ["crash", "ios", "startup"],
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "application": {
        "id": "app-uuid",
        "name": "MyApp",
        "url": "https://myapp.com"
      },
      "reporter": {
        "id": "user-uuid",
        "username": "john_doe",
        "email": "john@example.com"
      },
      "vote_count": 1,
      "comment_count": 0,
      "attachments": [
        {
          "id": "attachment-uuid",
          "filename": "crash-screenshot.png",
          "file_url": "/uploads/bugs/crash-screenshot.png",
          "file_size": 245760,
          "mime_type": "image/png"
        }
      ]
    }
  }
}
```

### Bug Status Changed Event

```json
{
  "event": "bug.status_changed",
  "timestamp": "2024-01-15T14:30:00Z",
  "webhook_id": "webhook-uuid",
  "company_id": "company-uuid",
  "delivery_id": "delivery-uuid",
  "data": {
    "bug": {
      "id": "bug-uuid",
      "title": "Application crashes on startup",
      "status": "reviewing",
      "previous_status": "open",
      "updated_by": {
        "id": "user-uuid",
        "username": "company_admin",
        "email": "admin@myapp.com"
      }
    },
    "changes": {
      "status": {
        "from": "open",
        "to": "reviewing"
      }
    }
  }
}
```

### Bug Commented Event

```json
{
  "event": "bug.commented",
  "timestamp": "2024-01-15T15:45:00Z",
  "webhook_id": "webhook-uuid",
  "company_id": "company-uuid",
  "delivery_id": "delivery-uuid",
  "data": {
    "bug": {
      "id": "bug-uuid",
      "title": "Application crashes on startup"
    },
    "comment": {
      "id": "comment-uuid",
      "content": "We've identified the issue and are working on a fix. Expected resolution in the next release.",
      "created_at": "2024-01-15T15:45:00Z",
      "author": {
        "id": "user-uuid",
        "username": "developer",
        "email": "dev@myapp.com"
      },
      "is_company_response": true
    }
  }
}
```

### Company Verified Event

```json
{
  "event": "company.verified",
  "timestamp": "2024-01-15T12:00:00Z",
  "webhook_id": "webhook-uuid",
  "company_id": "company-uuid",
  "delivery_id": "delivery-uuid",
  "data": {
    "company": {
      "id": "company-uuid",
      "name": "MyApp Inc",
      "domain": "myapp.com",
      "is_verified": true,
      "verified_at": "2024-01-15T12:00:00Z",
      "verified_by": {
        "id": "user-uuid",
        "username": "company_admin",
        "email": "admin@myapp.com"
      }
    }
  }
}
```

## Security

### Webhook Signatures

BugRelay signs webhook payloads using HMAC-SHA256 with your webhook secret. Always verify the signature to ensure the webhook is from BugRelay.

#### Signature Header

The signature is sent in the `X-BugRelay-Signature-256` header:

```
X-BugRelay-Signature-256: sha256=<signature>
```

#### Signature Verification

**Node.js Example:**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');
    
    const receivedSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
    );
}

// Express.js middleware
app.use('/webhooks/bugrelay', express.raw({ type: 'application/json' }));

app.post('/webhooks/bugrelay', (req, res) => {
    const signature = req.headers['x-bugrelay-signature-256'];
    const payload = req.body;
    
    if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
        return res.status(401).send('Invalid signature');
    }
    
    // Process webhook
    const event = JSON.parse(payload);
    console.log('Received webhook:', event.event);
    
    res.status(200).send('OK');
});
```

**Python Example:**
```python
import hmac
import hashlib
import json
from flask import Flask, request, abort

app = Flask(__name__)

def verify_webhook_signature(payload, signature, secret):
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    received_signature = signature.replace('sha256=', '')
    
    return hmac.compare_digest(expected_signature, received_signature)

@app.route('/webhooks/bugrelay', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-BugRelay-Signature-256')
    payload = request.get_data()
    
    if not verify_webhook_signature(payload, signature, os.environ['WEBHOOK_SECRET']):
        abort(401)
    
    event = json.loads(payload)
    print(f"Received webhook: {event['event']}")
    
    return 'OK', 200
```

**Go Example:**
```go
package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "io/ioutil"
    "net/http"
    "os"
    "strings"
)

func verifyWebhookSignature(payload []byte, signature, secret string) bool {
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(payload)
    expectedSignature := hex.EncodeToString(mac.Sum(nil))
    
    receivedSignature := strings.TrimPrefix(signature, "sha256=")
    
    return hmac.Equal([]byte(expectedSignature), []byte(receivedSignature))
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
    signature := r.Header.Get("X-BugRelay-Signature-256")
    payload, err := ioutil.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "Error reading body", http.StatusBadRequest)
        return
    }
    
    if !verifyWebhookSignature(payload, signature, os.Getenv("WEBHOOK_SECRET")) {
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }
    
    var event map[string]interface{}
    if err := json.Unmarshal(payload, &event); err != nil {
        http.Error(w, "Invalid JSON", http.StatusBadRequest)
        return
    }
    
    fmt.Printf("Received webhook: %s\n", event["event"])
    
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}

func main() {
    http.HandleFunc("/webhooks/bugrelay", webhookHandler)
    http.ListenAndServe(":8080", nil)
}
```

### Security Best Practices

1. **Always Verify Signatures**: Never process webhooks without signature verification
2. **Use HTTPS**: Only accept webhooks over HTTPS endpoints
3. **Validate Payload**: Validate the webhook payload structure and data
4. **Rate Limiting**: Implement rate limiting on your webhook endpoints
5. **Idempotency**: Handle duplicate deliveries gracefully using delivery_id
6. **Timeout Handling**: Set appropriate timeouts for webhook processing
7. **Secret Rotation**: Regularly rotate your webhook secrets

## Implementation Examples

### Express.js Webhook Handler

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

// Middleware to capture raw body for signature verification
app.use('/webhooks', express.raw({ type: 'application/json' }));

class BugRelayWebhookHandler {
    constructor(secret) {
        this.secret = secret;
        this.processedDeliveries = new Set();
    }

    verifySignature(payload, signature) {
        const expectedSignature = crypto
            .createHmac('sha256', this.secret)
            .update(payload, 'utf8')
            .digest('hex');
        
        const receivedSignature = signature.replace('sha256=', '');
        
        return crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(receivedSignature, 'hex')
        );
    }

    async handleWebhook(req, res) {
        try {
            const signature = req.headers['x-bugrelay-signature-256'];
            const payload = req.body;

            // Verify signature
            if (!this.verifySignature(payload, signature)) {
                return res.status(401).json({ error: 'Invalid signature' });
            }

            const event = JSON.parse(payload);

            // Check for duplicate delivery
            if (this.processedDeliveries.has(event.delivery_id)) {
                return res.status(200).json({ message: 'Already processed' });
            }

            // Process the event
            await this.processEvent(event);

            // Mark as processed
            this.processedDeliveries.add(event.delivery_id);

            res.status(200).json({ message: 'Webhook processed successfully' });
        } catch (error) {
            console.error('Webhook processing error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async processEvent(event) {
        console.log(`Processing webhook: ${event.event}`);

        switch (event.event) {
            case 'bug.created':
                await this.handleBugCreated(event.data.bug);
                break;
            case 'bug.status_changed':
                await this.handleBugStatusChanged(event.data.bug, event.data.changes);
                break;
            case 'bug.commented':
                await this.handleBugCommented(event.data.bug, event.data.comment);
                break;
            case 'company.verified':
                await this.handleCompanyVerified(event.data.company);
                break;
            default:
                console.log(`Unhandled event type: ${event.event}`);
        }
    }

    async handleBugCreated(bug) {
        console.log(`New bug created: ${bug.title}`);
        
        // Example: Send notification to Slack
        await this.sendSlackNotification({
            text: `🐛 New bug report: ${bug.title}`,
            attachments: [{
                color: bug.priority === 'critical' ? 'danger' : 'warning',
                fields: [
                    { title: 'Priority', value: bug.priority, short: true },
                    { title: 'Status', value: bug.status, short: true },
                    { title: 'Reporter', value: bug.reporter.username, short: true },
                    { title: 'Application', value: bug.application.name, short: true }
                ]
            }]
        });

        // Example: Create ticket in your issue tracker
        await this.createJiraTicket(bug);
    }

    async handleBugStatusChanged(bug, changes) {
        console.log(`Bug status changed: ${bug.title} (${changes.status.from} → ${changes.status.to})`);
        
        // Example: Update external systems
        if (changes.status.to === 'fixed') {
            await this.notifyQATeam(bug);
        }
    }

    async handleBugCommented(bug, comment) {
        console.log(`New comment on bug: ${bug.title}`);
        
        // Example: Send email notification to subscribers
        if (comment.is_company_response) {
            await this.notifyBugSubscribers(bug, comment);
        }
    }

    async handleCompanyVerified(company) {
        console.log(`Company verified: ${company.name}`);
        
        // Example: Set up monitoring for the company
        await this.setupCompanyMonitoring(company);
    }

    async sendSlackNotification(message) {
        // Implementation for Slack webhook
        console.log('Sending Slack notification:', message.text);
    }

    async createJiraTicket(bug) {
        // Implementation for Jira integration
        console.log('Creating Jira ticket for bug:', bug.title);
    }

    async notifyQATeam(bug) {
        // Implementation for QA team notification
        console.log('Notifying QA team about fixed bug:', bug.title);
    }

    async notifyBugSubscribers(bug, comment) {
        // Implementation for subscriber notifications
        console.log('Notifying subscribers about comment on bug:', bug.title);
    }

    async setupCompanyMonitoring(company) {
        // Implementation for company monitoring setup
        console.log('Setting up monitoring for company:', company.name);
    }
}

// Initialize webhook handler
const webhookHandler = new BugRelayWebhookHandler(process.env.WEBHOOK_SECRET);

// Webhook endpoint
app.post('/webhooks/bugrelay', (req, res) => {
    webhookHandler.handleWebhook(req, res);
});

app.listen(3000, () => {
    console.log('Webhook server listening on port 3000');
});
```

### Python Flask Webhook Handler

```python
import os
import hmac
import hashlib
import json
from flask import Flask, request, jsonify
import requests
from datetime import datetime

app = Flask(__name__)

class BugRelayWebhookHandler:
    def __init__(self, secret):
        self.secret = secret
        self.processed_deliveries = set()

    def verify_signature(self, payload, signature):
        expected_signature = hmac.new(
            self.secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        received_signature = signature.replace('sha256=', '')
        
        return hmac.compare_digest(expected_signature, received_signature)

    def handle_webhook(self, request):
        try:
            signature = request.headers.get('X-BugRelay-Signature-256')
            payload = request.get_data()

            # Verify signature
            if not self.verify_signature(payload, signature):
                return jsonify({'error': 'Invalid signature'}), 401

            event = json.loads(payload)

            # Check for duplicate delivery
            if event['delivery_id'] in self.processed_deliveries:
                return jsonify({'message': 'Already processed'}), 200

            # Process the event
            self.process_event(event)

            # Mark as processed
            self.processed_deliveries.add(event['delivery_id'])

            return jsonify({'message': 'Webhook processed successfully'}), 200

        except Exception as e:
            print(f'Webhook processing error: {e}')
            return jsonify({'error': 'Internal server error'}), 500

    def process_event(self, event):
        print(f"Processing webhook: {event['event']}")

        event_handlers = {
            'bug.created': self.handle_bug_created,
            'bug.status_changed': self.handle_bug_status_changed,
            'bug.commented': self.handle_bug_commented,
            'company.verified': self.handle_company_verified
        }

        handler = event_handlers.get(event['event'])
        if handler:
            handler(event['data'])
        else:
            print(f"Unhandled event type: {event['event']}")

    def handle_bug_created(self, data):
        bug = data['bug']
        print(f"New bug created: {bug['title']}")
        
        # Example: Send to Discord
        self.send_discord_notification({
            'content': f"🐛 **New Bug Report**\n**Title:** {bug['title']}\n**Priority:** {bug['priority']}\n**Reporter:** {bug['reporter']['username']}"
        })

    def handle_bug_status_changed(self, data):
        bug = data['bug']
        changes = data['changes']
        print(f"Bug status changed: {bug['title']} ({changes['status']['from']} → {changes['status']['to']})")

    def handle_bug_commented(self, data):
        bug = data['bug']
        comment = data['comment']
        print(f"New comment on bug: {bug['title']}")

    def handle_company_verified(self, data):
        company = data['company']
        print(f"Company verified: {company['name']}")

    def send_discord_notification(self, message):
        # Implementation for Discord webhook
        print(f"Sending Discord notification: {message['content']}")

# Initialize webhook handler
webhook_handler = BugRelayWebhookHandler(os.environ.get('WEBHOOK_SECRET'))

@app.route('/webhooks/bugrelay', methods=['POST'])
def handle_webhook():
    return webhook_handler.handle_webhook(request)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

## Delivery and Retry Logic

### Delivery Expectations

- **Timeout**: BugRelay will wait up to 30 seconds for your endpoint to respond
- **Success Response**: HTTP status codes 200-299 are considered successful
- **Retry Logic**: Failed deliveries are retried with exponential backoff
- **Maximum Retries**: Up to 5 retry attempts over 24 hours

### Retry Schedule

1. **Immediate**: First retry after 1 minute
2. **Second**: Retry after 5 minutes
3. **Third**: Retry after 15 minutes
4. **Fourth**: Retry after 1 hour
5. **Fifth**: Final retry after 6 hours

### Handling Failures

If all retry attempts fail, the webhook will be marked as failed and you'll receive an email notification. You can:

1. **Check Webhook Logs**: View delivery attempts in the webhook dashboard
2. **Test Webhook**: Use the test endpoint to verify your configuration
3. **Replay Deliveries**: Manually replay failed deliveries
4. **Update Configuration**: Fix endpoint URL or other issues

## Monitoring and Debugging

### Webhook Dashboard

Access your webhook dashboard at:
```
https://app.bugrelay.com/companies/{company-id}/webhooks
```

The dashboard provides:
- **Delivery History**: Recent webhook deliveries and their status
- **Success Rate**: Percentage of successful deliveries
- **Response Times**: Average response times from your endpoints
- **Error Logs**: Detailed error messages for failed deliveries

### Webhook Logs API

Retrieve webhook delivery logs programmatically:

```http
GET /api/v1/companies/{id}/webhooks/{webhook_id}/deliveries
```

**Response:**
```json
{
  "deliveries": [
    {
      "id": "delivery-uuid",
      "webhook_id": "webhook-uuid",
      "event": "bug.created",
      "status": "success",
      "response_code": 200,
      "response_time": 245,
      "delivered_at": "2024-01-15T10:30:00Z",
      "retry_count": 0
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150
  }
}
```

### Testing Webhooks

Test your webhook configuration:

```bash
curl -X POST "https://api.bugrelay.com/api/v1/companies/{id}/webhooks/{webhook_id}/test" \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "bug.created"
  }'
```

This sends a test payload to your webhook endpoint to verify it's working correctly.

## Best Practices

### Performance

1. **Respond Quickly**: Process webhooks asynchronously and respond within 30 seconds
2. **Queue Processing**: Use a job queue for time-consuming operations
3. **Batch Operations**: Group related operations when possible
4. **Database Optimization**: Use efficient database queries and indexing

### Reliability

1. **Idempotency**: Handle duplicate deliveries using delivery_id
2. **Error Handling**: Implement proper error handling and logging
3. **Graceful Degradation**: Continue operating even if webhook processing fails
4. **Health Checks**: Monitor your webhook endpoints for availability

### Security

1. **Signature Verification**: Always verify webhook signatures
2. **HTTPS Only**: Use HTTPS endpoints for webhook URLs
3. **Input Validation**: Validate all webhook payload data
4. **Rate Limiting**: Implement rate limiting on webhook endpoints
5. **Access Control**: Restrict access to webhook endpoints

### Monitoring

1. **Logging**: Log all webhook events and processing results
2. **Metrics**: Track webhook delivery success rates and response times
3. **Alerting**: Set up alerts for webhook failures or high error rates
4. **Dashboard**: Create dashboards to monitor webhook health

## Troubleshooting

### Common Issues

1. **Signature Verification Failures**
   - Check that you're using the correct webhook secret
   - Ensure you're computing the signature correctly
   - Verify the payload is not being modified before verification

2. **Timeout Errors**
   - Optimize your webhook processing code
   - Move time-consuming operations to background jobs
   - Increase server resources if needed

3. **SSL/TLS Errors**
   - Ensure your webhook endpoint uses valid SSL certificates
   - Check that your server supports modern TLS versions
   - Verify certificate chain is complete

4. **Duplicate Processing**
   - Implement idempotency using delivery_id
   - Use database constraints to prevent duplicate records
   - Check for race conditions in your processing logic

### Debug Checklist

- [ ] Webhook URL is accessible from the internet
- [ ] Endpoint responds with 2xx status codes
- [ ] Signature verification is implemented correctly
- [ ] Payload parsing handles all expected event types
- [ ] Error handling is implemented for all failure scenarios
- [ ] Logging is in place for debugging issues
- [ ] Idempotency is implemented using delivery_id

## Support

For webhook-related support:

- **Documentation**: [https://docs.bugrelay.com/guides/webhooks](https://docs.bugrelay.com/guides/webhooks)
- **API Reference**: [https://docs.bugrelay.com/api/webhooks](https://docs.bugrelay.com/api/webhooks)
- **Support Email**: webhooks@bugrelay.com
- **Status Page**: [https://status.bugrelay.com](https://status.bugrelay.com)

## Related Documentation

- [API Authentication](/authentication/) - JWT token setup and management
- [Company Integration](/guides/company-integration) - Company verification and management
- [Security Guide](/guides/security) - Security best practices
- [Rate Limiting](/guides/rate-limiting) - API rate limiting information