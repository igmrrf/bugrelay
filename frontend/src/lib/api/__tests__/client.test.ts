import { APIClient } from '../client'
import { useAuthStore, useUIStore } from '@/lib/stores'
import axios from 'axios'

// Mock dependencies
jest.mock('axios')
jest.mock('@/lib/stores')
jest.mock('@/lib/retry-manager')

const mockedAxios = axios as jest.Mocked<typeof axios>
const mockAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>
const mockUIStore = useUIStore as jest.MockedFunction<typeof useUIStore>

describe('APIClient', () => {
  let client: APIClient
  let mockAxiosInstance: any

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    }
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance)
    
    // Mock store states
    mockAuthStore.mockReturnValue({
      user: { id: '1', email: 'test@example.com' },
      isAuthenticated: true
    } as any)
    
    mockUIStore.mockReturnValue({
      addToast: jest.fn()
    } as any)
    
    client = new APIClient()
  })

  describe('HTTP Methods', () => {
    it('should make GET requests correctly', async () => {
      const mockResponse = {
        data: { data: { id: '1', name: 'Test' } }
      }
      mockAxiosInstance.get.mockResolvedValue(mockResponse)

      const result = await client.get('/test')

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', undefined)
      expect(result).toEqual({ id: '1', name: 'Test' })
    })

    it('should make POST requests correctly', async () => {
      const mockResponse = {
        data: { data: { id: '1', created: true } }
      }
      const postData = { name: 'New Item' }
      mockAxiosInstance.post.mockResolvedValue(mockResponse)

      const result = await client.post('/test', postData)

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', postData, undefined)
      expect(result).toEqual({ id: '1', created: true })
    })

    it('should handle API errors correctly', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input'
            }
          }
        }
      }
      mockAxiosInstance.get.mockRejectedValue(mockError)

      await expect(client.get('/test')).rejects.toThrow('Invalid input')
    })
  })

  describe('File Upload', () => {
    it('should upload files with progress tracking', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      const mockResponse = {
        data: { data: { id: '1', filename: 'test.txt' } }
      }
      const onProgress = jest.fn()
      
      mockAxiosInstance.post.mockResolvedValue(mockResponse)

      const result = await client.upload('/upload', mockFile, onProgress)

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/upload',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: expect.any(Function)
        })
      )
      expect(result).toEqual({ id: '1', filename: 'test.txt' })
    })
  })

  describe('Batch Requests', () => {
    it('should handle batch requests correctly', async () => {
      const requests = [
        () => Promise.resolve('result1'),
        () => Promise.resolve('result2'),
        () => Promise.resolve('result3')
      ]

      const results = await client.batch(requests)

      expect(results).toEqual(['result1', 'result2', 'result3'])
    })

    it('should handle partial failures in batch requests', async () => {
      const requests = [
        () => Promise.resolve('result1'),
        () => Promise.reject(new Error('Failed')),
        () => Promise.resolve('result3')
      ]

      const results = await client.batch(requests)

      expect(results).toHaveLength(3)
      expect(results[0]).toBe('result1')
      expect(results[1]).toBeUndefined()
      expect(results[2]).toBe('result3')
    })
  })
})