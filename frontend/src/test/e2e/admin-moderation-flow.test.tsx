/**
 * End-to-End Test: Admin Moderation and Management Flow
 * 
 * This test covers the complete admin workflow:
 * 1. Admin login and dashboard access
 * 2. Bug moderation (flagging, removal, restoration)
 * 3. Duplicate bug merging
 * 4. User management
 * 5. Audit log monitoring
 * 6. System statistics and reporting
 */

import { test, expect } from '@playwright/test'

test.describe('Admin Moderation and Management Flow', () => {
  let adminEmail: string
  let testBugIds: string[] = []

  test.beforeEach(async ({ page }) => {
    // Generate unique admin credentials
    const timestamp = Date.now()
    adminEmail = `admin-${timestamp}@bugrelay.com`

    // For testing purposes, we'll assume an admin user exists
    // In a real scenario, you'd need to create admin users through a separate process
    await page.goto('/admin/login')
    
    // Use test admin credentials
    await page.fill('[data-testid="admin-email"]', 'admin@bugrelay.com')
    await page.fill('[data-testid="admin-password"]', 'AdminPassword123!')
    await page.click('[data-testid="admin-login-submit"]')

    // Verify admin access
    await expect(page).toHaveURL(/.*\/admin\/dashboard/)
    await expect(page.locator('[data-testid="admin-header"]')).toContainText('Admin Dashboard')
  })

  test('complete admin moderation workflow', async ({ page }) => {
    // Step 1: Review admin dashboard overview
    await test.step('Review admin dashboard and statistics', async () => {
      // Verify dashboard sections
      await expect(page.locator('[data-testid="total-bugs"]')).toBeVisible()
      await expect(page.locator('[data-testid="pending-moderation"]')).toBeVisible()
      await expect(page.locator('[data-testid="total-users"]')).toBeVisible()
      await expect(page.locator('[data-testid="total-companies"]')).toBeVisible()

      // Check recent activity
      await expect(page.locator('[data-testid="recent-activity"]')).toBeVisible()
      await expect(page.locator('[data-testid="flagged-content"]')).toBeVisible()

      // Verify admin navigation
      await expect(page.locator('[data-testid="nav-bug-moderation"]')).toBeVisible()
      await expect(page.locator('[data-testid="nav-user-management"]')).toBeVisible()
      await expect(page.locator('[data-testid="nav-audit-logs"]')).toBeVisible()
    })

    // Step 2: Test bug moderation functionality
    await test.step('Test bug moderation and flagging', async () => {
      // Navigate to bug moderation
      await page.click('[data-testid="nav-bug-moderation"]')
      await expect(page).toHaveURL(/.*\/admin\/bugs/)

      // Verify moderation interface
      await expect(page.locator('[data-testid="bug-moderation-list"]')).toBeVisible()
      await expect(page.locator('[data-testid="moderation-filters"]')).toBeVisible()

      // Filter for flagged bugs
      await page.click('[data-testid="filter-flagged"]')
      
      // If there are flagged bugs, test moderation actions
      const flaggedBugs = page.locator('[data-testid="flagged-bug-item"]')
      const bugCount = await flaggedBugs.count()

      if (bugCount > 0) {
        // Test bug review
        await flaggedBugs.first().click()
        
        // Verify bug details modal
        await expect(page.locator('[data-testid="bug-review-modal"]')).toBeVisible()
        await expect(page.locator('[data-testid="bug-content"]')).toBeVisible()
        await expect(page.locator('[data-testid="flag-reasons"]')).toBeVisible()

        // Test moderation actions
        await page.click('[data-testid="approve-bug"]')
        await page.fill('[data-testid="moderation-note"]', 'Bug content is appropriate and follows guidelines.')
        await page.click('[data-testid="confirm-approval"]')

        // Verify approval
        await expect(page.locator('[data-testid="moderation-success"]')).toContainText('Bug approved successfully')
      }

      // Test manual bug flagging
      await page.click('[data-testid="filter-all-bugs"]')
      const allBugs = page.locator('[data-testid="bug-item"]')
      
      if (await allBugs.count() > 0) {
        await allBugs.first().click()
        await page.click('[data-testid="flag-bug"]')
        
        // Select flag reason
        await page.selectOption('[data-testid="flag-reason"]', 'inappropriate_content')
        await page.fill('[data-testid="flag-details"]', 'Testing admin flagging functionality')
        await page.click('[data-testid="confirm-flag"]')

        // Verify flagging
        await expect(page.locator('[data-testid="flag-success"]')).toContainText('Bug flagged successfully')
      }
    })

    // Step 3: Test bug removal and restoration
    await test.step('Test bug removal and restoration', async () => {
      // Find a bug to remove
      const bugs = page.locator('[data-testid="bug-item"]')
      
      if (await bugs.count() > 0) {
        await bugs.first().click()
        
        // Remove bug
        await page.click('[data-testid="remove-bug"]')
        await page.selectOption('[data-testid="removal-reason"]', 'spam')
        await page.fill('[data-testid="removal-note"]', 'Removing for testing purposes - will restore shortly')
        await page.click('[data-testid="confirm-removal"]')

        // Verify removal
        await expect(page.locator('[data-testid="removal-success"]')).toContainText('Bug removed successfully')

        // Navigate to removed bugs
        await page.click('[data-testid="filter-removed"]')
        
        // Find the removed bug and restore it
        const removedBugs = page.locator('[data-testid="removed-bug-item"]')
        if (await removedBugs.count() > 0) {
          await removedBugs.first().click()
          await page.click('[data-testid="restore-bug"]')
          await page.fill('[data-testid="restoration-note"]', 'Restoring after testing removal functionality')
          await page.click('[data-testid="confirm-restoration"]')

          // Verify restoration
          await expect(page.locator('[data-testid="restoration-success"]')).toContainText('Bug restored successfully')
        }
      }
    })

    // Step 4: Test duplicate bug merging
    await test.step('Test duplicate bug merging functionality', async () => {
      // Navigate to duplicate management
      await page.click('[data-testid="nav-duplicate-management"]')
      
      // Look for potential duplicates
      await page.click('[data-testid="find-duplicates"]')
      
      // If duplicates are found, test merging
      const duplicateGroups = page.locator('[data-testid="duplicate-group"]')
      
      if (await duplicateGroups.count() > 0) {
        await duplicateGroups.first().click()
        
        // Select primary bug
        await page.click('[data-testid="select-primary-bug"]')
        
        // Select bugs to merge
        await page.check('[data-testid="merge-checkbox"]')
        
        // Initiate merge
        await page.click('[data-testid="merge-bugs"]')
        await page.fill('[data-testid="merge-reason"]', 'These bugs report the same issue with similar symptoms')
        await page.click('[data-testid="confirm-merge"]')

        // Verify merge
        await expect(page.locator('[data-testid="merge-success"]')).toContainText('Bugs merged successfully')
      } else {
        // If no duplicates found, create test scenario
        await expect(page.locator('[data-testid="no-duplicates"]')).toContainText('No potential duplicates found')
      }
    })

    // Step 5: Test user management
    await test.step('Test user management functionality', async () => {
      // Navigate to user management
      await page.click('[data-testid="nav-user-management"]')
      await expect(page).toHaveURL(/.*\/admin\/users/)

      // Verify user list
      await expect(page.locator('[data-testid="user-list"]')).toBeVisible()
      
      // Test user search
      await page.fill('[data-testid="user-search"]', 'test')
      await page.press('[data-testid="user-search"]', 'Enter')
      
      // Test user filtering
      await page.selectOption('[data-testid="user-role-filter"]', 'user')
      
      // Test user actions
      const users = page.locator('[data-testid="user-item"]')
      
      if (await users.count() > 0) {
        await users.first().click()
        
        // Verify user details modal
        await expect(page.locator('[data-testid="user-details-modal"]')).toBeVisible()
        
        // Test user suspension (if not admin)
        const userRole = await page.locator('[data-testid="user-role"]').textContent()
        
        if (userRole !== 'admin') {
          await page.click('[data-testid="suspend-user"]')
          await page.fill('[data-testid="suspension-reason"]', 'Testing suspension functionality')
          await page.selectOption('[data-testid="suspension-duration"]', '7') // 7 days
          await page.click('[data-testid="confirm-suspension"]')

          // Verify suspension
          await expect(page.locator('[data-testid="suspension-success"]')).toContainText('User suspended successfully')

          // Test unsuspension
          await page.click('[data-testid="unsuspend-user"]')
          await page.fill('[data-testid="unsuspension-note"]', 'Removing test suspension')
          await page.click('[data-testid="confirm-unsuspension"]')

          // Verify unsuspension
          await expect(page.locator('[data-testid="unsuspension-success"]')).toContainText('User unsuspended successfully')
        }
      }
    })

    // Step 6: Test audit log monitoring
    await test.step('Test audit log monitoring', async () => {
      // Navigate to audit logs
      await page.click('[data-testid="nav-audit-logs"]')
      await expect(page).toHaveURL(/.*\/admin\/audit-logs/)

      // Verify audit log interface
      await expect(page.locator('[data-testid="audit-log-list"]')).toBeVisible()
      await expect(page.locator('[data-testid="audit-filters"]')).toBeVisible()

      // Test filtering by action type
      await page.selectOption('[data-testid="action-filter"]', 'bug_flag')
      await page.click('[data-testid="apply-filters"]')

      // Verify filtered results
      const auditEntries = page.locator('[data-testid="audit-entry"]')
      
      if (await auditEntries.count() > 0) {
        // Verify audit entry details
        await auditEntries.first().click()
        await expect(page.locator('[data-testid="audit-details"]')).toBeVisible()
        await expect(page.locator('[data-testid="audit-timestamp"]')).toBeVisible()
        await expect(page.locator('[data-testid="audit-user"]')).toBeVisible()
        await expect(page.locator('[data-testid="audit-action"]')).toBeVisible()
      }

      // Test date range filtering
      const today = new Date().toISOString().split('T')[0]
      await page.fill('[data-testid="date-from"]', today)
      await page.fill('[data-testid="date-to"]', today)
      await page.click('[data-testid="apply-date-filter"]')

      // Test export functionality
      await page.click('[data-testid="export-audit-logs"]')
      await page.selectOption('[data-testid="export-format"]', 'csv')
      await page.click('[data-testid="confirm-export"]')

      // Verify export initiated
      await expect(page.locator('[data-testid="export-success"]')).toContainText('Export initiated')
    })

    // Step 7: Test system statistics and reporting
    await test.step('Test system statistics and reporting', async () => {
      // Navigate to reports
      await page.click('[data-testid="nav-reports"]')
      
      // Test bug statistics report
      await page.click('[data-testid="bug-statistics-report"]')
      
      // Verify report interface
      await expect(page.locator('[data-testid="report-filters"]')).toBeVisible()
      await expect(page.locator('[data-testid="date-range-picker"]')).toBeVisible()

      // Generate report for last 30 days
      await page.selectOption('[data-testid="report-period"]', '30')
      await page.click('[data-testid="generate-report"]')

      // Verify report generation
      await expect(page.locator('[data-testid="report-loading"]')).toBeVisible()
      await expect(page.locator('[data-testid="report-results"]')).toBeVisible({ timeout: 10000 })

      // Verify report sections
      await expect(page.locator('[data-testid="bug-trends-chart"]')).toBeVisible()
      await expect(page.locator('[data-testid="severity-distribution"]')).toBeVisible()
      await expect(page.locator('[data-testid="resolution-times"]')).toBeVisible()

      // Test user activity report
      await page.click('[data-testid="user-activity-report"]')
      await page.selectOption('[data-testid="activity-period"]', '7')
      await page.click('[data-testid="generate-activity-report"]')

      // Verify user activity metrics
      await expect(page.locator('[data-testid="active-users-chart"]')).toBeVisible()
      await expect(page.locator('[data-testid="user-engagement-metrics"]')).toBeVisible()
    })
  })

  test('admin security and access control', async ({ page }) => {
    // Test admin-only access restrictions
    await test.step('Test admin access restrictions', async () => {
      // Verify admin navigation is available
      await expect(page.locator('[data-testid="admin-nav"]')).toBeVisible()
      
      // Test direct URL access to admin functions
      await page.goto('/admin/users')
      await expect(page.locator('[data-testid="user-management"]')).toBeVisible()
      
      await page.goto('/admin/audit-logs')
      await expect(page.locator('[data-testid="audit-log-list"]')).toBeVisible()
    })

    // Test admin action confirmations
    await test.step('Test admin action confirmations', async () => {
      await page.goto('/admin/bugs')
      
      const bugs = page.locator('[data-testid="bug-item"]')
      
      if (await bugs.count() > 0) {
        await bugs.first().click()
        
        // Test that destructive actions require confirmation
        await page.click('[data-testid="remove-bug"]')
        
        // Verify confirmation dialog
        await expect(page.locator('[data-testid="confirmation-dialog"]')).toBeVisible()
        await expect(page.locator('[data-testid="confirm-warning"]')).toContainText('This action cannot be undone')
        
        // Cancel the action
        await page.click('[data-testid="cancel-action"]')
        await expect(page.locator('[data-testid="confirmation-dialog"]')).not.toBeVisible()
      }
    })

    // Test admin session timeout
    await test.step('Test admin session security', async () => {
      // Verify admin session indicators
      await expect(page.locator('[data-testid="admin-session-info"]')).toBeVisible()
      
      // Test logout functionality
      await page.click('[data-testid="admin-logout"]')
      
      // Verify redirect to login
      await expect(page).toHaveURL(/.*\/admin\/login/)
      
      // Verify admin areas are no longer accessible
      await page.goto('/admin/dashboard')
      await expect(page).toHaveURL(/.*\/admin\/login/)
    })
  })

  test('bulk admin operations', async ({ page }) => {
    // Test bulk bug operations
    await test.step('Test bulk bug moderation', async () => {
      await page.goto('/admin/bugs')
      
      // Select multiple bugs
      const bugCheckboxes = page.locator('[data-testid="bug-checkbox"]')
      const checkboxCount = await bugCheckboxes.count()
      
      if (checkboxCount > 1) {
        // Select first few bugs
        for (let i = 0; i < Math.min(3, checkboxCount); i++) {
          await bugCheckboxes.nth(i).check()
        }
        
        // Verify bulk actions are available
        await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible()
        
        // Test bulk approval
        await page.click('[data-testid="bulk-approve"]')
        await page.fill('[data-testid="bulk-note"]', 'Bulk approval for testing')
        await page.click('[data-testid="confirm-bulk-action"]')
        
        // Verify bulk operation success
        await expect(page.locator('[data-testid="bulk-success"]')).toContainText('Bulk operation completed')
      }
    })

    // Test bulk user operations
    await test.step('Test bulk user management', async () => {
      await page.goto('/admin/users')
      
      // Test bulk user actions if available
      const userCheckboxes = page.locator('[data-testid="user-checkbox"]')
      const userCount = await userCheckboxes.count()
      
      if (userCount > 1) {
        // Select non-admin users for bulk operations
        await page.selectOption('[data-testid="user-role-filter"]', 'user')
        
        const regularUsers = page.locator('[data-testid="user-checkbox"]')
        const regularUserCount = await regularUsers.count()
        
        if (regularUserCount > 0) {
          await regularUsers.first().check()
          
          // Verify bulk user actions
          await expect(page.locator('[data-testid="bulk-user-actions"]')).toBeVisible()
        }
      }
    })
  })

  test('admin notification and alert management', async ({ page }) => {
    // Test admin notification system
    await test.step('Test admin notifications', async () => {
      await page.goto('/admin/dashboard')
      
      // Check for admin notifications
      await expect(page.locator('[data-testid="admin-notifications"]')).toBeVisible()
      
      // Test notification actions
      const notifications = page.locator('[data-testid="notification-item"]')
      
      if (await notifications.count() > 0) {
        // Mark notification as read
        await notifications.first().click()
        await page.click('[data-testid="mark-read"]')
        
        // Verify notification status update
        await expect(page.locator('[data-testid="notification-read"]')).toBeVisible()
      }
    })

    // Test system alert configuration
    await test.step('Test system alert configuration', async () => {
      await page.goto('/admin/settings')
      
      // Navigate to alert settings
      await page.click('[data-testid="alert-settings"]')
      
      // Test alert threshold configuration
      await page.fill('[data-testid="high-error-rate-threshold"]', '5')
      await page.fill('[data-testid="response-time-threshold"]', '3000')
      await page.check('[data-testid="email-alerts-enabled"]')
      
      // Save alert settings
      await page.click('[data-testid="save-alert-settings"]')
      
      // Verify settings saved
      await expect(page.locator('[data-testid="settings-saved"]')).toContainText('Alert settings saved')
    })
  })
})