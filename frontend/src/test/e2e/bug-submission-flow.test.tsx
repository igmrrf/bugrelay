/**
 * End-to-End Test: Bug Submission and Management Flow
 * 
 * This test covers the complete user journey from bug submission to resolution:
 * 1. User submits a bug report
 * 2. Bug appears in the public list
 * 3. Other users can vote and comment
 * 4. Company representative responds
 * 5. Bug status is updated
 */

import { test, expect } from '@playwright/test'

test.describe('Bug Submission and Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/')
    
    // Wait for the page to load
    await expect(page.locator('h1')).toContainText('BugRelay')
  })

  test('complete bug submission and management workflow', async ({ page }) => {
    // Step 1: Submit a new bug report
    await test.step('Submit a new bug report', async () => {
      // Navigate to bug submission page
      await page.click('text=Report Bug')
      await expect(page).toHaveURL(/.*\/bugs\/new/)

      // Fill out the bug report form
      await page.fill('[data-testid="bug-title"]', 'Login button not working on mobile Safari')
      await page.fill('[data-testid="bug-description"]', 'When using Safari on iOS, the login button appears to be unresponsive. Tapping it does not trigger any action.')
      
      // Fill steps to reproduce
      await page.fill('[data-testid="bug-steps"]', `1. Open the app in Safari on iOS
2. Navigate to the login page
3. Enter valid credentials
4. Tap the "Login" button
5. Nothing happens`)

      // Fill expected and actual results
      await page.fill('[data-testid="bug-expected"]', 'User should be logged in and redirected to dashboard')
      await page.fill('[data-testid="bug-actual"]', 'Login button is unresponsive, no feedback provided')

      // Select severity
      await page.selectOption('[data-testid="bug-severity"]', 'high')

      // Select or create application
      await page.fill('[data-testid="bug-application"]', 'BugRelay Web App')

      // Submit the bug report
      await page.click('[data-testid="submit-bug"]')

      // Verify successful submission
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Bug report submitted successfully')
      
      // Should redirect to the bug detail page
      await expect(page).toHaveURL(/.*\/bugs\/[a-f0-9-]+/)
    })

    // Step 2: Verify bug appears in public list
    await test.step('Verify bug appears in public bug list', async () => {
      // Navigate to bugs list
      await page.goto('/bugs')
      
      // Wait for bugs to load
      await page.waitForSelector('[data-testid="bug-list"]')
      
      // Verify our bug appears in the list
      await expect(page.locator('[data-testid="bug-card"]').first()).toContainText('Login button not working on mobile Safari')
      
      // Verify bug details are displayed
      const bugCard = page.locator('[data-testid="bug-card"]').first()
      await expect(bugCard).toContainText('High')
      await expect(bugCard).toContainText('Open')
      await expect(bugCard).toContainText('BugRelay Web App')
    })

    // Step 3: Test voting functionality
    await test.step('Test bug voting functionality', async () => {
      // Click on the bug to view details
      await page.click('[data-testid="bug-card"]')
      
      // Verify we're on the bug detail page
      await expect(page.locator('h1')).toContainText('Login button not working on mobile Safari')
      
      // Test upvoting (should require login for anonymous users)
      await page.click('[data-testid="upvote-button"]')
      
      // Should show login prompt or redirect to login
      await expect(page.locator('[data-testid="login-prompt"]')).toBeVisible()
    })

    // Step 4: Register and login to test authenticated features
    await test.step('Register and login to test authenticated features', async () => {
      // Navigate to registration
      await page.click('[data-testid="register-link"]')
      await expect(page).toHaveURL(/.*\/register/)

      // Fill registration form
      const timestamp = Date.now()
      const testEmail = `test-user-${timestamp}@example.com`
      
      await page.fill('[data-testid="register-email"]', testEmail)
      await page.fill('[data-testid="register-username"]', `testuser${timestamp}`)
      await page.fill('[data-testid="register-password"]', 'TestPassword123!')
      await page.fill('[data-testid="register-confirm-password"]', 'TestPassword123!')
      await page.fill('[data-testid="register-first-name"]', 'Test')
      await page.fill('[data-testid="register-last-name"]', 'User')

      // Submit registration
      await page.click('[data-testid="register-submit"]')

      // For testing purposes, assume email verification is bypassed
      // In a real scenario, you'd need to handle email verification
      
      // Should be redirected to dashboard or login
      await expect(page).toHaveURL(/.*\/(dashboard|login)/)
      
      // If redirected to login, log in
      if (page.url().includes('/login')) {
        await page.fill('[data-testid="login-email"]', testEmail)
        await page.fill('[data-testid="login-password"]', 'TestPassword123!')
        await page.click('[data-testid="login-submit"]')
      }

      // Verify successful login
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    })

    // Step 5: Test authenticated bug interactions
    await test.step('Test authenticated bug interactions', async () => {
      // Navigate back to the bug
      await page.goto('/bugs')
      await page.click('[data-testid="bug-card"]')

      // Test upvoting as authenticated user
      const initialVotes = await page.locator('[data-testid="vote-count"]').textContent()
      await page.click('[data-testid="upvote-button"]')
      
      // Verify vote count increased
      await expect(page.locator('[data-testid="vote-count"]')).not.toContainText(initialVotes || '0')
      
      // Test commenting
      await page.fill('[data-testid="comment-input"]', 'I can confirm this issue. Also happening on Chrome mobile.')
      await page.click('[data-testid="submit-comment"]')
      
      // Verify comment appears
      await expect(page.locator('[data-testid="comment-list"]')).toContainText('I can confirm this issue')
    })

    // Step 6: Test company claim and response flow
    await test.step('Test company claim and response flow', async () => {
      // Navigate to company claim page
      await page.goto('/companies')
      await page.click('[data-testid="claim-company"]')

      // Fill company claim form
      await page.fill('[data-testid="company-name"]', 'BugRelay Inc.')
      await page.fill('[data-testid="company-domain"]', 'bugrelay.com')
      await page.fill('[data-testid="company-website"]', 'https://bugrelay.com')
      await page.fill('[data-testid="verification-method"]', 'DNS')

      // Submit claim
      await page.click('[data-testid="submit-claim"]')

      // For testing, assume verification is automatic
      await expect(page.locator('[data-testid="claim-success"]')).toContainText('Company claimed successfully')

      // Navigate back to the bug to add company response
      await page.goto('/bugs')
      await page.click('[data-testid="bug-card"]')

      // Add company response
      await page.click('[data-testid="add-company-response"]')
      await page.fill('[data-testid="company-response"]', 'Thank you for reporting this issue. We have identified the problem and will release a fix in the next update.')
      await page.click('[data-testid="submit-response"]')

      // Verify company response appears
      await expect(page.locator('[data-testid="company-responses"]')).toContainText('Thank you for reporting this issue')
    })

    // Step 7: Test bug status updates
    await test.step('Test bug status updates', async () => {
      // Update bug status (as company representative)
      await page.click('[data-testid="update-status"]')
      await page.selectOption('[data-testid="status-select"]', 'in_progress')
      await page.fill('[data-testid="status-comment"]', 'We are currently working on a fix for this issue.')
      await page.click('[data-testid="confirm-status-update"]')

      // Verify status update
      await expect(page.locator('[data-testid="bug-status"]')).toContainText('In Progress')
      await expect(page.locator('[data-testid="status-history"]')).toContainText('We are currently working on a fix')

      // Test final resolution
      await page.click('[data-testid="update-status"]')
      await page.selectOption('[data-testid="status-select"]', 'resolved')
      await page.fill('[data-testid="status-comment"]', 'This issue has been fixed in version 1.2.0. Please update your app.')
      await page.click('[data-testid="confirm-status-update"]')

      // Verify resolution
      await expect(page.locator('[data-testid="bug-status"]')).toContainText('Resolved')
    })

    // Step 8: Verify bug appears correctly in filtered lists
    await test.step('Verify bug filtering and search', async () => {
      // Navigate to bugs list
      await page.goto('/bugs')

      // Test status filter
      await page.click('[data-testid="filter-status"]')
      await page.click('[data-testid="status-resolved"]')
      
      // Verify our resolved bug appears
      await expect(page.locator('[data-testid="bug-card"]')).toContainText('Login button not working on mobile Safari')
      await expect(page.locator('[data-testid="bug-card"]')).toContainText('Resolved')

      // Test search functionality
      await page.fill('[data-testid="search-input"]', 'login button')
      await page.press('[data-testid="search-input"]', 'Enter')
      
      // Verify search results
      await expect(page.locator('[data-testid="bug-card"]')).toContainText('Login button not working on mobile Safari')

      // Test severity filter
      await page.click('[data-testid="filter-severity"]')
      await page.click('[data-testid="severity-high"]')
      
      // Verify high severity bugs are shown
      await expect(page.locator('[data-testid="bug-card"]')).toContainText('High')
    })
  })

  test('handles error scenarios gracefully', async ({ page }) => {
    // Test form validation
    await test.step('Test form validation errors', async () => {
      await page.goto('/bugs/new')
      
      // Try to submit empty form
      await page.click('[data-testid="submit-bug"]')
      
      // Verify validation errors
      await expect(page.locator('[data-testid="title-error"]')).toContainText('Title is required')
      await expect(page.locator('[data-testid="description-error"]')).toContainText('Description is required')
    })

    // Test network error handling
    await test.step('Test network error handling', async () => {
      // Intercept API calls and simulate network error
      await page.route('**/api/v1/bugs', route => {
        route.abort('failed')
      })

      await page.goto('/bugs/new')
      
      // Fill form with valid data
      await page.fill('[data-testid="bug-title"]', 'Test Bug')
      await page.fill('[data-testid="bug-description"]', 'Test Description')
      await page.fill('[data-testid="bug-steps"]', 'Test Steps')
      await page.fill('[data-testid="bug-expected"]', 'Expected Result')
      await page.fill('[data-testid="bug-actual"]', 'Actual Result')
      
      // Try to submit
      await page.click('[data-testid="submit-bug"]')
      
      // Verify error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Network error')
    })
  })

  test('responsive design works on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await test.step('Test mobile bug submission', async () => {
      await page.goto('/bugs/new')
      
      // Verify mobile layout
      await expect(page.locator('[data-testid="mobile-form"]')).toBeVisible()
      
      // Test form functionality on mobile
      await page.fill('[data-testid="bug-title"]', 'Mobile Test Bug')
      await page.fill('[data-testid="bug-description"]', 'Testing mobile submission')
      
      // Verify mobile-specific UI elements
      await expect(page.locator('[data-testid="mobile-submit-button"]')).toBeVisible()
    })

    await test.step('Test mobile bug list navigation', async () => {
      await page.goto('/bugs')
      
      // Verify mobile bug cards
      await expect(page.locator('[data-testid="mobile-bug-card"]')).toBeVisible()
      
      // Test mobile navigation
      await page.click('[data-testid="mobile-menu-toggle"]')
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
    })
  })
})