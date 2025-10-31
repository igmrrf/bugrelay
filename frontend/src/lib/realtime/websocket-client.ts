import { useAuthStore, useBugStore, useCompanyStore, useUIStore } from '@/lib/stores'
import { errorHandler } from '@/lib/error-handler'

export interface WebSocketMessage {
  type: string
  data: any
  timestamp: string
}

export interface BugUpdateMessage {
  type: 'bug_updated' | 'bug_voted' | 'bug_commented'
  data: {
    bugId: string
    updates?: any
    voteCount?: number
    hasUserVoted?: boolean
    comment?: any
  }
}

export interface CompanyUpdateMessage {
  type: 'company_updated' | 'member_added' | 'member_removed'
  data: {
    companyId: string
    updates?: any
    member?: any
  }
}

class WebSocketClient {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private heartbeatInterval: NodeJS.Timeout | null = null
  private isConnecting = false

  constructor() {
    this.connect()
  }

  private getWebSocketURL(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = process.env.NEXT_PUBLIC_WS_URL || `${protocol}//${window.location.host}/ws`
    return host
  }

  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    this.isConnecting = true
    const { user } = useAuthStore.getState()
    
    if (!user) {
      this.isConnecting = false
      return
    }

    try {
      const wsUrl = this.getWebSocketURL()
      this.ws = new WebSocket(wsUrl)
      
      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)
      this.ws.onclose = this.handleClose.bind(this)
      this.ws.onerror = this.handleError.bind(this)
    } catch (error) {
      this.isConnecting = false
      errorHandler.handle(error, 'WebSocket connection')
    }
  }  
private handleOpen() {
    console.log('WebSocket connected')
    this.isConnecting = false
    this.reconnectAttempts = 0
    
    // Send authentication
    const { user } = useAuthStore.getState()
    if (user) {
      this.send({
        type: 'auth',
        data: { userId: user.id }
      })
    }

    // Start heartbeat
    this.startHeartbeat()

    // Show connection status
    const { addToast } = useUIStore.getState()
    addToast({
      title: 'Connected',
      description: 'Real-time updates are now active.',
      type: 'success',
      duration: 3000
    })
  }

  private handleMessage(event: MessageEvent) {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)
      this.processMessage(message)
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  private handleClose(event: CloseEvent) {
    console.log('WebSocket disconnected:', event.code, event.reason)
    this.isConnecting = false
    this.stopHeartbeat()

    // Attempt reconnection if not a normal closure
    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect()
    }
  }

  private handleError(error: Event) {
    console.error('WebSocket error:', error)
    this.isConnecting = false
    errorHandler.handle(new Error('WebSocket connection failed'), 'WebSocket')
  }

  private scheduleReconnect() {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    setTimeout(() => {
      this.connect()
    }, delay)
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', data: {} })
      }
    }, 30000) // 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }  
private processMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'bug_updated':
        this.handleBugUpdate(message as BugUpdateMessage)
        break
      case 'bug_voted':
        this.handleBugVote(message as BugUpdateMessage)
        break
      case 'bug_commented':
        this.handleBugComment(message as BugUpdateMessage)
        break
      case 'company_updated':
        this.handleCompanyUpdate(message as CompanyUpdateMessage)
        break
      case 'member_added':
      case 'member_removed':
        this.handleMemberUpdate(message as CompanyUpdateMessage)
        break
      case 'pong':
        // Heartbeat response
        break
      default:
        console.log('Unknown message type:', message.type)
    }
  }

  private handleBugUpdate(message: BugUpdateMessage) {
    const { updateBug } = useBugStore.getState()
    const { data } = message
    
    if (data.updates) {
      updateBug(data.bugId, data.updates)
    }
  }

  private handleBugVote(message: BugUpdateMessage) {
    const { updateVoteCount } = useBugStore.getState()
    const { data } = message
    
    if (data.voteCount !== undefined && data.hasUserVoted !== undefined) {
      updateVoteCount(data.bugId, data.voteCount, data.hasUserVoted)
    }
  }

  private handleBugComment(message: BugUpdateMessage) {
    const { updateBug } = useBugStore.getState()
    const { data } = message
    
    // Update comment count
    if (data.comment) {
      const { getBugById } = useBugStore.getState()
      const bug = getBugById(data.bugId)
      if (bug) {
        updateBug(data.bugId, { commentCount: bug.commentCount + 1 })
      }
    }
  }

  private handleCompanyUpdate(message: CompanyUpdateMessage) {
    const { updateCompany } = useCompanyStore.getState()
    const { data } = message
    
    if (data.updates) {
      updateCompany(data.companyId, data.updates)
    }
  }

  private handleMemberUpdate(message: CompanyUpdateMessage) {
    const { addMember, removeMember } = useCompanyStore.getState()
    const { data } = message
    
    if (message.type === 'member_added' && data.member) {
      addMember(data.companyId, data.member)
    } else if (message.type === 'member_removed' && data.member) {
      removeMember(data.companyId, data.member.id)
    }
  }  
send(message: { type: string; data: any }) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString()
      }))
    }
  }

  // Subscribe to specific bug updates
  subscribeToBug(bugId: string) {
    this.send({
      type: 'subscribe',
      data: { entity: 'bug', id: bugId }
    })
  }

  // Unsubscribe from bug updates
  unsubscribeFromBug(bugId: string) {
    this.send({
      type: 'unsubscribe',
      data: { entity: 'bug', id: bugId }
    })
  }

  // Subscribe to company updates
  subscribeToCompany(companyId: string) {
    this.send({
      type: 'subscribe',
      data: { entity: 'company', id: companyId }
    })
  }

  // Unsubscribe from company updates
  unsubscribeFromCompany(companyId: string) {
    this.send({
      type: 'unsubscribe',
      data: { entity: 'company', id: companyId }
    })
  }

  disconnect() {
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// Create singleton instance
export const wsClient = new WebSocketClient()

// Export for testing and advanced usage
export { WebSocketClient }