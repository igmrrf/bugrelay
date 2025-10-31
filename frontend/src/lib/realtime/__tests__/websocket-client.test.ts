import { WebSocketClient } from '../websocket-client'
import { useAuthStore, useBugStore, useCompanyStore, useUIStore } from '@/lib/stores'

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(public url: string) {
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.(new Event('open'))
    }, 10)
  }

  send(data: string) {
    // Mock send implementation
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close', { code, reason }))
  }
}

// Mock dependencies
jest.mock('@/lib/stores')
global.WebSocket = MockWebSocket as any

const mockAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>
const mockBugStore = useBugStore as jest.MockedFunction<typeof useBugStore>
const mockCompanyStore = useCompanyStore as jest.MockedFunction<typeof useCompanyStore>
const mockUIStore = useUIStore as jest.MockedFunction<typeof useUIStore>

describe('WebSocketClient', () => {
  let client: WebSocketClient
  let mockStoreStates: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock store states and functions
    mockStoreStates = {
      auth: {
        user: { id: '1', email: 'test@example.com' },
        isAuthenticated: true
      },
      bug: {
        updateBug: jest.fn(),
        updateVoteCount: jest.fn(),
        getBugById: jest.fn()
      },
      company: {
        updateCompany: jest.fn(),
        addMember: jest.fn(),
        removeMember: jest.fn()
      },
      ui: {
        addToast: jest.fn()
      }
    }

    mockAuthStore.getState = jest.fn().mockReturnValue(mockStoreStates.auth)
    mockBugStore.getState = jest.fn().mockReturnValue(mockStoreStates.bug)
    mockCompanyStore.getState = jest.fn().mockReturnValue(mockStoreStates.company)
    mockUIStore.getState = jest.fn().mockReturnValue(mockStoreStates.ui)

    client = new WebSocketClient()
  })

  afterEach(() => {
    client.disconnect()
  })

  describe('Connection Management', () => {
    it('should connect to WebSocket', async () => {
      await new Promise(resolve => setTimeout(resolve, 20))
      
      expect(client.isConnected()).toBe(true)
    })

    it('should handle connection errors', () => {
      const mockError = new Event('error')
      client['ws']!.onerror!(mockError)
      
      expect(mockStoreStates.ui.addToast).not.toHaveBeenCalled()
    })

    it('should reconnect on unexpected disconnection', async () => {
      await new Promise(resolve => setTimeout(resolve, 20))
      
      // Simulate unexpected disconnection
      const closeEvent = new CloseEvent('close', { code: 1006 })
      client['ws']!.onclose!(closeEvent)
      
      // Should attempt reconnection
      expect(client['reconnectAttempts']).toBe(1)
    })
  })

  describe('Message Processing', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 20))
    })

    it('should handle bug update messages', () => {
      const message = {
        type: 'bug_updated',
        data: {
          bugId: 'bug-1',
          updates: { title: 'Updated Title' }
        },
        timestamp: new Date().toISOString()
      }

      client['processMessage'](message)

      expect(mockStoreStates.bug.updateBug).toHaveBeenCalledWith('bug-1', {
        title: 'Updated Title'
      })
    })

    it('should handle bug vote messages', () => {
      const message = {
        type: 'bug_voted',
        data: {
          bugId: 'bug-1',
          voteCount: 5,
          hasUserVoted: true
        },
        timestamp: new Date().toISOString()
      }

      client['processMessage'](message)

      expect(mockStoreStates.bug.updateVoteCount).toHaveBeenCalledWith('bug-1', 5, true)
    })

    it('should handle company update messages', () => {
      const message = {
        type: 'company_updated',
        data: {
          companyId: 'company-1',
          updates: { name: 'Updated Company' }
        },
        timestamp: new Date().toISOString()
      }

      client['processMessage'](message)

      expect(mockStoreStates.company.updateCompany).toHaveBeenCalledWith('company-1', {
        name: 'Updated Company'
      })
    })

    it('should handle member added messages', () => {
      const message = {
        type: 'member_added',
        data: {
          companyId: 'company-1',
          member: { id: 'member-1', userId: 'user-1', role: 'admin' }
        },
        timestamp: new Date().toISOString()
      }

      client['processMessage'](message)

      expect(mockStoreStates.company.addMember).toHaveBeenCalledWith('company-1', {
        id: 'member-1',
        userId: 'user-1',
        role: 'admin'
      })
    })
  })

  describe('Subscriptions', () => {
    beforeEach(async () => {
      await new Promise(resolve => setTimeout(resolve, 20))
    })

    it('should subscribe to bug updates', () => {
      const sendSpy = jest.spyOn(client, 'send')
      
      client.subscribeToBug('bug-1')

      expect(sendSpy).toHaveBeenCalledWith({
        type: 'subscribe',
        data: { entity: 'bug', id: 'bug-1' }
      })
    })

    it('should unsubscribe from bug updates', () => {
      const sendSpy = jest.spyOn(client, 'send')
      
      client.unsubscribeFromBug('bug-1')

      expect(sendSpy).toHaveBeenCalledWith({
        type: 'unsubscribe',
        data: { entity: 'bug', id: 'bug-1' }
      })
    })

    it('should subscribe to company updates', () => {
      const sendSpy = jest.spyOn(client, 'send')
      
      client.subscribeToCompany('company-1')

      expect(sendSpy).toHaveBeenCalledWith({
        type: 'subscribe',
        data: { entity: 'company', id: 'company-1' }
      })
    })
  })
})