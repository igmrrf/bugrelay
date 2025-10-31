import { chromium, FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test teardown...')

  // Start browser for cleanup tasks
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000'
    
    // Clean up test data
    await cleanupTestData(page, baseURL)

    console.log('✅ E2E test teardown completed successfully')

  } catch (error) {
    console.error('❌ E2E test teardown failed:', error)
    // Don't throw error in teardown to avoid masking test failures
  } finally {
    await context.close()
    await browser.close()
  }
}

async function cleanupTestData(page: any, baseURL: string) {
  console.log('🗑️ Cleaning up test data...')

  try {
    // Clean up test users (except admin)
    await page.evaluate(async () => {
      try {
        await fetch('/api/v1/test/cleanup/users', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        })
      } catch (error) {
        // Cleanup endpoint might not exist
      }
    })

    // Clean up test companies
    await page.evaluate(async () => {
      try {
        await fetch('/api/v1/test/cleanup/companies', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        })
      } catch (error) {
        // Cleanup endpoint might not exist
      }
    })

    // Clean up test bugs
    await page.evaluate(async () => {
      try {
        await fetch('/api/v1/test/cleanup/bugs', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        })
      } catch (error) {
        // Cleanup endpoint might not exist
      }
    })

    // Clean up uploaded files
    await page.evaluate(async () => {
      try {
        await fetch('/api/v1/test/cleanup/files', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        })
      } catch (error) {
        // Cleanup endpoint might not exist
      }
    })

    console.log('✅ Test data cleanup completed')

  } catch (error) {
    console.warn('⚠️ Test data cleanup failed:', error)
  }
}

export default globalTeardown