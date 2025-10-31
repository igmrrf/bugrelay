import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test setup...')

  // Start browser for setup tasks
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Wait for the application to be ready
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000'
    console.log(`📡 Checking if application is ready at ${baseURL}`)

    // Wait for the application to respond
    let retries = 0
    const maxRetries = 30

    while (retries < maxRetries) {
      try {
        await page.goto(`${baseURL}/health`, { timeout: 5000 })
        const response = await page.waitForResponse(response =>
          response.url().includes('/health') && response.status() === 200,
          { timeout: 5000 }
        )

        if (response.ok()) {
          console.log('✅ Application is ready')
          break
        }
      } catch (error) {
        retries++
        console.log(`⏳ Waiting for application... (${retries}/${maxRetries})`)
        await page.waitForTimeout(2000)
      }
    }

    if (retries >= maxRetries) {
      throw new Error('❌ Application failed to start within timeout period')
    }

    // Setup test data if needed
    await setupTestData(page, baseURL)

    console.log('✅ E2E test setup completed successfully')

  } catch (error) {
    console.error('❌ E2E test setup failed:', error)
    throw error
  } finally {
    await context.close()
    await browser.close()
  }
}

async function setupTestData(page: any, baseURL: string) {
  console.log('📊 Setting up test data...')

  try {
    // Check if we need to seed the database
    await page.goto(`${baseURL}/api/health`)
    const healthResponse = await page.evaluate(() => {
      return fetch('/api/health').then(res => res.json())
    })

    console.log('🔍 Health check response:', healthResponse)

    // Setup admin user if needed
    await setupAdminUser(page, baseURL)

    // Setup test companies if needed
    await setupTestCompanies(page, baseURL)

    console.log('✅ Test data setup completed')

  } catch (error) {
    console.warn('⚠️ Test data setup failed, tests will create data as needed:', error)
  }
}

async function setupAdminUser(page: any, baseURL: string) {
  try {
    // Check if admin user exists
    const adminExists = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/v1/admin/dashboard', {
          method: 'GET',
          credentials: 'include'
        })
        return response.status !== 404
      } catch {
        return false
      }
    })

    if (!adminExists) {
      console.log('👤 Creating admin user for testing...')

      // Create admin user through API or seeding
      await page.evaluate(async () => {
        try {
          await fetch('/api/v1/admin/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'admin@bugrelay.com',
              password: 'AdminPassword123!',
              firstName: 'Admin',
              lastName: 'User'
            })
          })
        } catch (error) {
          console.warn('Admin setup API not available, will use existing admin')
        }
      })
    }

    console.log('✅ Admin user ready')
  } catch (error) {
    console.warn('⚠️ Admin user setup failed:', error)
  }
}

interface TestCompany {
  name: string
  domain: string
  website: string
  verified: boolean
}

async function setupTestCompanies(page: any, baseURL: string) {
  try {
    console.log('🏢 Setting up test companies...')

    // Create test companies for E2E tests
    const testCompanies: TestCompany[] = [
      {
        name: 'Test Company Alpha',
        domain: 'alpha-test.com',
        website: 'https://alpha-test.com',
        verified: true
      },
      {
        name: 'Test Company Beta',
        domain: 'beta-test.com',
        website: 'https://beta-test.com',
        verified: false
      }
    ]

    for (const company of testCompanies) {
      await page.evaluate(async (companyData: TestCompany) => {
        try {
          await fetch('/api/v1/test/companies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(companyData)
          })
        } catch (error) {
          // Test endpoint might not exist, that's okay
        }
      }, company)
    }

    console.log('✅ Test companies setup completed')
  } catch (error) {
    console.warn('⚠️ Test companies setup failed:', error)
  }
}

export default globalSetup