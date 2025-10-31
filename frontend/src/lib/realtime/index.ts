// Export WebSocket client
export { wsClient, WebSocketClient } from './websocket-client'

// Export realtime hooks
export {
  useWebSocketConnection,
  useBugRealtime,
  useCompanyRealtime
} from './use-realtime'

// Export types
export type {
  WebSocketMessage,
  BugUpdateMessage,
  CompanyUpdateMessage
} from './websocket-client'