/**
 * End-to-End Test: Company Verification and Management Flow
 * 
 * This test covers the complete company verification workflow:
 * 1. User claims a company
 * 2. Verification process (DNS/Email)
 * 3. Company dashboard access
 * 4. Team member management
 * 5. Bug status management
 */

import { test, expect } from '@playwright/test'

test.describe('Company Verification and Management Flow', () => {
  let testCompanyDomain: string
  let testUserEmail: string

  test.beforeEach(async ({ page }) => {
    // Generate unique test data
    const timestamp = Date.now()
    testCompanyDomain = `testcompany${timestamp}.com`
    testUserEmail = `admin-${timestamp}@${testCompanyDomain}`

    // Navigate to the application and register a user
    await page.goto('/')
    await page.click('[data-testid="register-link"]')
    
    // Register test user
    await page.fill('[data-testid="register-email"]', testUserEmail)
    await page.fill('[data-testid="register-username"]', `admin${timestamp}`)
    await page.fill('[data-testid="register-password"]', 'AdminPassword123!')
    await page.fill('[data-testid="register-confirm-password"]', 'AdminPassword123!')
    await page.fill('[data-testid="register-first-name"]', 'Company')
    await page.fill('[data-testid="register-last-name"]', 'Admin')
    
    await page.click('[data-testid="register-submit"]')
    
    // Handle login if redirected
    if (page.url().includes('/login')) {
      await page.fill('[data-testid="login-email"]', testUserEmail)
      await page.fill('[data-testid="login-password"]', 'AdminPassword123!')
      await page.click('[data-testid="login-submit"]')
    }

    // Verify successful authentication
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('complete company verification workflow', async ({ page }) => {
    // Step 1: Initiate company claim
    await test.step('Initiate company claim', async () => {
      // Navigate to companies page
      await page.goto('/companies')
      
      // Click claim company button
      await page.click('[data-testid="claim-company-button"]')
      await expect(page).toHaveURL(/.*\/companies\/claim/)

      // Fill company information
      await page.fill('[data-testid="company-name"]', 'Test Company Inc.')
      await page.fill('[data-testid="company-domain"]', testCompanyDomain)
      await page.fill('[data-testid="company-website"]', `https://${testCompanyDomain}`)
      await page.fill('[data-testid="company-description"]', 'A test company for automated testing purposes')

      // Select verification method
      await page.selectOption('[data-testid="verification-method"]', 'email')
      
      // Submit claim
      await page.click('[data-testid="submit-claim"]')

      // Verify claim submission
      await expect(page.locator('[data-testid="claim-submitted"]')).toContainText('Company claim submitted')
      await expect(page.locator('[data-testid="verification-instructions"]')).toBeVisible()
    })

    // Step 2: Simulate email verification
    await test.step('Complete email verification', async () => {
      // In a real test, you would check email and click verification link
      // For this test, we'll simulate the verification process
      
      // Navigate to verification page (simulating email click)
      const verificationToken = 'test-verification-token-123'
      await page.goto(`/companies/verify?token=${verificationToken}&domain=${testCompanyDomain}`)

      // Verify successful verification
      await expect(page.locator('[data-testid="verification-success"]')).toContainText('Company verified successfully')
      
      // Should redirect to company dashboard
      await expect(page).toHaveURL(/.*\/companies\/[a-f0-9-]+\/dashboard/)
    })

    // Step 3: Test company dashboard functionality
    await test.step('Test company dashboard access and features', async () => {
      // Verify dashboard elements
      await expect(page.locator('[data-testid="company-name"]')).toContainText('Test Company Inc.')
      await expect(page.locator('[data-testid="company-domain"]')).toContainText(testCompanyDomain)
      
      // Check dashboard sections
      await expect(page.locator('[data-testid="bug-statistics"]')).toBeVisible()
      await expect(page.locator('[data-testid="team-management"]')).toBeVisible()
      await expect(page.locator('[data-testid="company-bugs"]')).toBeVisible()

      // Verify initial statistics
      await expect(page.locator('[data-testid="total-bugs"]')).toContainText('0')
      await expect(page.locator('[data-testid="open-bugs"]')).toContainText('0')
      await expect(page.locator('[data-testid="team-members"]')).toContainText('1') // Just the admin
    })

    // Step 4: Test team member management
    await test.step('Test team member management', async () => {
      // Navigate to team management section
      await page.click('[data-testid="team-management-tab"]')

      // Verify current admin is listed
      await expect(page.locator('[data-testid="team-member-list"]')).toContainText(testUserEmail)
      await expect(page.locator('[data-testid="member-role"]')).toContainText('Owner')

      // Add a new team member
      await page.click('[data-testid="add-team-member"]')
      
      const memberEmail = `member-${Date.now()}@${testCompanyDomain}`
      await page.fill('[data-testid="member-email"]', memberEmail)
      await page.selectOption('[data-testid="member-role-select"]', 'member')
      await page.click('[data-testid="send-invitation"]')

      // Verify invitation sent
      await expect(page.locator('[data-testid="invitation-sent"]')).toContainText('Invitation sent')
      
      // Verify pending invitation appears
      await expect(page.locator('[data-testid="pending-invitations"]')).toContainText(memberEmail)

      // Test role change for existing member
      await page.click('[data-testid="change-role-button"]')
      await page.selectOption('[data-testid="new-role-select"]', 'admin')
      await page.click('[data-testid="confirm-role-change"]')

      // Verify role change
      await expect(page.locator('[data-testid="role-updated"]')).toContainText('Role updated successfully')
    })

    // Step 5: Create a bug for the company to manage
    await test.step('Create a bug for company management testing', async () => {
      // Navigate to bug submission
      await page.goto('/bugs/new')

      // Submit a bug for this company's application
      await page.fill('[data-testid="bug-title"]', 'Company Dashboard Loading Issue')
      await page.fill('[data-testid="bug-description"]', 'The company dashboard takes too long to load')
      await page.fill('[data-testid="bug-steps"]', '1. Login to company account\n2. Navigate to dashboard\n3. Wait for loading')
      await page.fill('[data-testid="bug-expected"]', 'Dashboard should load within 2 seconds')
      await page.fill('[data-testid="bug-actual"]', 'Dashboard takes 10+ seconds to load')
      await page.selectOption('[data-testid="bug-severity"]', 'medium')
      
      // Create application for the company
      await page.fill('[data-testid="bug-application"]', `${testCompanyDomain} Dashboard`)
      
      await page.click('[data-testid="submit-bug"]')

      // Verify bug submission
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Bug report submitted')
    })

    // Step 6: Test bug management from company dashboard
    await test.step('Test bug management from company dashboard', async () => {
      // Navigate back to company dashboard
      await page.goto('/companies')
      await page.click('[data-testid="my-company-dashboard"]')

      // Verify bug appears in company bugs
      await page.click('[data-testid="company-bugs-tab"]')
      await expect(page.locator('[data-testid="company-bug-list"]')).toContainText('Company Dashboard Loading Issue')

      // Click on the bug to manage it
      await page.click('[data-testid="manage-bug-button"]')

      // Test adding company response
      await page.click('[data-testid="add-response-button"]')
      await page.fill('[data-testid="response-text"]', 'Thank you for reporting this issue. We are investigating the performance problem.')
      await page.click('[data-testid="submit-response"]')

      // Verify response added
      await expect(page.locator('[data-testid="company-response"]')).toContainText('Thank you for reporting this issue')

      // Test status update
      await page.click('[data-testid="update-status-button"]')
      await page.selectOption('[data-testid="new-status"]', 'in_progress')
      await page.fill('[data-testid="status-comment"]', 'We have identified the issue and are working on optimization.')
      await page.click('[data-testid="confirm-status-update"]')

      // Verify status update
      await expect(page.locator('[data-testid="bug-status"]')).toContainText('In Progress')
      await expect(page.locator('[data-testid="status-history"]')).toContainText('We have identified the issue')
    })

    // Step 7: Test bug resolution workflow
    await test.step('Test bug resolution workflow', async () => {
      // Update status to resolved
      await page.click('[data-testid="update-status-button"]')
      await page.selectOption('[data-testid="new-status"]', 'resolved')
      await page.fill('[data-testid="status-comment"]', 'Performance issue has been fixed. Dashboard now loads in under 2 seconds.')
      await page.click('[data-testid="confirm-status-update"]')

      // Verify resolution
      await expect(page.locator('[data-testid="bug-status"]')).toContainText('Resolved')
      
      // Verify dashboard statistics updated
      await page.click('[data-testid="dashboard-tab"]')
      await expect(page.locator('[data-testid="resolved-bugs"]')).toContainText('1')
    })

    // Step 8: Test company settings management
    await test.step('Test company settings management', async () => {
      // Navigate to company settings
      await page.click('[data-testid="company-settings-tab"]')

      // Test company information update
      await page.click('[data-testid="edit-company-info"]')
      await page.fill('[data-testid="company-description"]', 'Updated: A test company for automated testing with enhanced features')
      await page.fill('[data-testid="company-support-email"]', `support@${testCompanyDomain}`)
      await page.click('[data-testid="save-company-info"]')

      // Verify update
      await expect(page.locator('[data-testid="update-success"]')).toContainText('Company information updated')

      // Test notification settings
      await page.click('[data-testid="notification-settings"]')
      await page.check('[data-testid="email-notifications"]')
      await page.check('[data-testid="new-bug-notifications"]')
      await page.uncheck('[data-testid="comment-notifications"]')
      await page.click('[data-testid="save-notifications"]')

      // Verify notification settings saved
      await expect(page.locator('[data-testid="notifications-saved"]')).toContainText('Notification preferences saved')
    })
  })

  test('handles company verification edge cases', async ({ page }) => {
    // Test duplicate company claim
    await test.step('Test duplicate company claim prevention', async () => {
      await page.goto('/companies/claim')
      
      // Try to claim an already claimed domain
      await page.fill('[data-testid="company-name"]', 'Another Test Company')
      await page.fill('[data-testid="company-domain"]', 'google.com') // Assume this is already claimed
      await page.fill('[data-testid="company-website"]', 'https://google.com')
      
      await page.click('[data-testid="submit-claim"]')
      
      // Verify error message
      await expect(page.locator('[data-testid="claim-error"]')).toContainText('This domain has already been claimed')
    })

    // Test invalid verification token
    await test.step('Test invalid verification token handling', async () => {
      await page.goto('/companies/verify?token=invalid-token&domain=invalid.com')
      
      // Verify error handling
      await expect(page.locator('[data-testid="verification-error"]')).toContainText('Invalid verification token')
    })

    // Test unauthorized access to company dashboard
    await test.step('Test unauthorized dashboard access', async () => {
      // Try to access a company dashboard without permission
      await page.goto('/companies/00000000-0000-0000-0000-000000000000/dashboard')
      
      // Should redirect to unauthorized page or show error
      await expect(page.locator('[data-testid="unauthorized-error"]')).toContainText('You do not have access to this company')
    })
  })

  test('company verification with DNS method', async ({ page }) => {
    await test.step('Test DNS verification method', async () => {
      await page.goto('/companies/claim')
      
      // Fill company information
      await page.fill('[data-testid="company-name"]', 'DNS Test Company')
      await page.fill('[data-testid="company-domain"]', `dns-${Date.now()}.com`)
      await page.fill('[data-testid="company-website"]', `https://dns-${Date.now()}.com`)
      
      // Select DNS verification
      await page.selectOption('[data-testid="verification-method"]', 'dns')
      
      await page.click('[data-testid="submit-claim"]')
      
      // Verify DNS instructions are shown
      await expect(page.locator('[data-testid="dns-instructions"]')).toBeVisible()
      await expect(page.locator('[data-testid="dns-record"]')).toContainText('TXT')
      await expect(page.locator('[data-testid="dns-value"]')).toContainText('bugrelay-verification=')
      
      // Test DNS verification check
      await page.click('[data-testid="check-dns-verification"]')
      
      // In a real scenario, this would check actual DNS records
      // For testing, we simulate the check
      await expect(page.locator('[data-testid="dns-check-result"]')).toContainText('DNS verification pending')
    })
  })

  test('team member invitation and acceptance flow', async ({ page }) => {
    // This test would require multiple browser contexts to simulate different users
    // For now, we'll test the invitation sending part
    
    await test.step('Test team member invitation flow', async () => {
      // Assume we have a verified company from previous setup
      await page.goto('/companies')
      await page.click('[data-testid="my-company-dashboard"]')
      await page.click('[data-testid="team-management-tab"]')
      
      // Send invitation
      await page.click('[data-testid="add-team-member"]')
      const inviteEmail = `newmember-${Date.now()}@example.com`
      await page.fill('[data-testid="member-email"]', inviteEmail)
      await page.selectOption('[data-testid="member-role-select"]', 'member')
      await page.fill('[data-testid="invitation-message"]', 'Welcome to our team! Please join us to help manage bug reports.')
      await page.click('[data-testid="send-invitation"]')
      
      // Verify invitation tracking
      await expect(page.locator('[data-testid="pending-invitations"]')).toContainText(inviteEmail)
      await expect(page.locator('[data-testid="invitation-status"]')).toContainText('Pending')
      
      // Test invitation cancellation
      await page.click('[data-testid="cancel-invitation"]')
      await page.click('[data-testid="confirm-cancellation"]')
      
      // Verify invitation removed
      await expect(page.locator('[data-testid="pending-invitations"]')).not.toContainText(inviteEmail)
    })
  })
})