import { Page, expect } from '@playwright/test'

/**
 * Test utilities and helpers for E2E tests
 */

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Generate unique test data
   */
  static generateTestData() {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    
    return {
      timestamp,
      random,
      email: `test-${timestamp}-${random}@example.com`,
      username: `testuser${timestamp}${random}`,
      companyName: `Test Company ${timestamp}`,
      companyDomain: `test-${timestamp}-${random}.com`,
      bugTitle: `Test Bug ${timestamp} - ${random}`,
    }
  }

  /**
   * Wait for element to be visible with custom timeout
   */
  async waitForElement(selector: string, timeout = 10000) {
    await this.page.waitForSelector(selector, { timeout, state: 'visible' })
  }

  /**
   * Fill form field with validation
   */
  async fillField(selector: string, value: string, validate = true) {
    await this.page.fill(selector, value)
    
    if (validate) {
      const fieldValue = await this.page.inputValue(selector)
      expect(fieldValue).toBe(value)
    }
  }

  /**
   * Click element and wait for navigation
   */
  async clickAndWaitForNavigation(selector: string, urlPattern?: RegExp) {
    await Promise.all([
      this.page.waitForLoadState('networkidle'),
      this.page.click(selector)
    ])
    
    if (urlPattern) {
      await expect(this.page).toHaveURL(urlPattern)
    }
  }

  /**
   * Register a new user
   */
  async registerUser(userData?: {
    email?: string
    username?: string
    password?: string
    firstName?: string
    lastName?: string
  }) {
    const testData = TestHelpers.generateTestData()
    const user = {
      email: userData?.email || testData.email,
      username: userData?.username || testData.username,
      password: userData?.password || 'TestPassword123!',
      firstName: userData?.firstName || 'Test',
      lastName: userData?.lastName || 'User'
    }

    await this.page.goto('/register')
    
    await this.fillField('[data-testid="register-email"]', user.email)
    await this.fillField('[data-testid="register-username"]', user.username)
    await this.fillField('[data-testid="register-password"]', user.password)
    await this.fillField('[data-testid="register-confirm-password"]', user.password)
    await this.fillField('[data-testid="register-first-name"]', user.firstName)
    await this.fillField('[data-testid="register-last-name"]', user.lastName)
    
    await this.page.click('[data-testid="register-submit"]')
    
    // Handle email verification or direct login
    if (this.page.url().includes('/login')) {
      await this.loginUser(user.email, user.password)
    }
    
    return user
  }

  /**
   * Login user
   */
  async loginUser(email: string, password: string) {
    await this.page.goto('/login')
    
    await this.fillField('[data-testid="login-email"]', email)
    await this.fillField('[data-testid="login-password"]', password)
    await this.page.click('[data-testid="login-submit"]')
    
    // Wait for successful login
    await expect(this.page.locator('[data-testid="user-menu"]')).toBeVisible()
  }

  /**
   * Login as admin
   */
  async loginAsAdmin() {
    await this.page.goto('/admin/login')
    
    await this.fillField('[data-testid="admin-email"]', 'admin@bugrelay.com')
    await this.fillField('[data-testid="admin-password"]', 'AdminPassword123!')
    await this.page.click('[data-testid="admin-login-submit"]')
    
    await expect(this.page).toHaveURL(/.*\/admin\/dashboard/)
  }

  /**
   * Submit a bug report
   */
  async submitBugReport(bugData?: {
    title?: string
    description?: string
    steps?: string
    expected?: string
    actual?: string
    severity?: string
    application?: string
  }) {
    const testData = TestHelpers.generateTestData()
    const bug = {
      title: bugData?.title || testData.bugTitle,
      description: bugData?.description || 'Test bug description for automated testing',
      steps: bugData?.steps || '1. Open application\n2. Perform action\n3. Observe issue',
      expected: bugData?.expected || 'Expected behavior should occur',
      actual: bugData?.actual || 'Actual behavior is different from expected',
      severity: bugData?.severity || 'medium',
      application: bugData?.application || 'Test Application'
    }

    await this.page.goto('/bugs/new')
    
    await this.fillField('[data-testid="bug-title"]', bug.title)
    await this.fillField('[data-testid="bug-description"]', bug.description)
    await this.fillField('[data-testid="bug-steps"]', bug.steps)
    await this.fillField('[data-testid="bug-expected"]', bug.expected)
    await this.fillField('[data-testid="bug-actual"]', bug.actual)
    await this.page.selectOption('[data-testid="bug-severity"]', bug.severity)
    await this.fillField('[data-testid="bug-application"]', bug.application)
    
    await this.page.click('[data-testid="submit-bug"]')
    
    // Wait for success message
    await expect(this.page.locator('[data-testid="success-message"]')).toBeVisible()
    
    return bug
  }

  /**
   * Claim a company
   */
  async claimCompany(companyData?: {
    name?: string
    domain?: string
    website?: string
    description?: string
    verificationMethod?: string
  }) {
    const testData = TestHelpers.generateTestData()
    const company = {
      name: companyData?.name || testData.companyName,
      domain: companyData?.domain || testData.companyDomain,
      website: companyData?.website || `https://${testData.companyDomain}`,
      description: companyData?.description || 'Test company for automated testing',
      verificationMethod: companyData?.verificationMethod || 'email'
    }

    await this.page.goto('/companies/claim')
    
    await this.fillField('[data-testid="company-name"]', company.name)
    await this.fillField('[data-testid="company-domain"]', company.domain)
    await this.fillField('[data-testid="company-website"]', company.website)
    await this.fillField('[data-testid="company-description"]', company.description)
    await this.page.selectOption('[data-testid="verification-method"]', company.verificationMethod)
    
    await this.page.click('[data-testid="submit-claim"]')
    
    // Wait for claim submission
    await expect(this.page.locator('[data-testid="claim-submitted"]')).toBeVisible()
    
    return company
  }

  /**
   * Wait for API response
   */
  async waitForAPIResponse(urlPattern: string | RegExp, timeout = 10000) {
    return await this.page.waitForResponse(
      response => {
        const url = response.url()
        if (typeof urlPattern === 'string') {
          return url.includes(urlPattern)
        }
        return urlPattern.test(url)
      },
      { timeout }
    )
  }

  /**
   * Mock API response
   */
  async mockAPIResponse(urlPattern: string | RegExp, responseData: any, status = 200) {
    await this.page.route(urlPattern, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(responseData)
      })
    })
  }

  /**
   * Take screenshot with timestamp
   */
  async takeScreenshot(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    })
  }

  /**
   * Check for console errors
   */
  async checkConsoleErrors() {
    const errors: string[] = []
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    return errors
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingComplete() {
    // Wait for any loading spinners to disappear
    await this.page.waitForSelector('[data-testid="loading"]', { state: 'hidden', timeout: 10000 })
      .catch(() => {
        // Loading spinner might not exist, that's okay
      })
    
    // Wait for network to be idle
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Verify toast message
   */
  async verifyToast(message: string, type?: 'success' | 'error' | 'warning' | 'info') {
    const toastSelector = type ? `[data-testid="toast-${type}"]` : '[data-testid="toast"]'
    await expect(this.page.locator(toastSelector)).toContainText(message)
  }

  /**
   * Clear all form fields
   */
  async clearForm(formSelector: string) {
    const inputs = this.page.locator(`${formSelector} input, ${formSelector} textarea`)
    const count = await inputs.count()
    
    for (let i = 0; i < count; i++) {
      await inputs.nth(i).clear()
    }
  }

  /**
   * Upload file
   */
  async uploadFile(inputSelector: string, filePath: string) {
    await this.page.setInputFiles(inputSelector, filePath)
  }

  /**
   * Scroll to element
   */
  async scrollToElement(selector: string) {
    await this.page.locator(selector).scrollIntoViewIfNeeded()
  }

  /**
   * Wait for element to contain text
   */
  async waitForText(selector: string, text: string, timeout = 10000) {
    await expect(this.page.locator(selector)).toContainText(text, { timeout })
  }

  /**
   * Get element count
   */
  async getElementCount(selector: string): Promise<number> {
    return await this.page.locator(selector).count()
  }

  /**
   * Check if element exists
   */
  async elementExists(selector: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout: 1000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * Logout user
   */
  async logout() {
    await this.page.click('[data-testid="user-menu"]')
    await this.page.click('[data-testid="logout-button"]')
    
    // Verify logout
    await expect(this.page.locator('[data-testid="login-link"]')).toBeVisible()
  }

  /**
   * Navigate and wait for page load
   */
  async navigateAndWait(url: string) {
    await this.page.goto(url)
    await this.waitForLoadingComplete()
  }
}