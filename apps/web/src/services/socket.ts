import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  public connect(token?: string) {
    if (this.socket?.connected) return this.socket;

    const rawApi = (import.meta as any).env?.VITE_API_URL || '';
    const socketUrl = rawApi ? rawApi.replace(/\/api\/?$/, '') : window.location.origin;

    this.socket = io(socketUrl, {
      auth: { token: token || localStorage.getItem('chatflow_token') },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      const orgId = localStorage.getItem('chatflow_org_id');
      if (orgId) {
        this.joinOrg(orgId);
      }
    });

    return this.socket;
  }

  public joinOrg(orgId: string) {
    if (this.socket && orgId) {
      this.socket.emit('join:org', orgId);
    }
  }

  public joinConversation(convId: string) {
    if (this.socket && convId) {
      this.socket.emit('join:conversation', convId);
    }
  }

  public leaveConversation(convId: string) {
    if (this.socket && convId) {
      this.socket.emit('leave:conversation', convId);
    }
  }

  public on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  public off(event: string, callback?: (...args: any[]) => void) {
    this.socket?.off(event, callback);
  }

  public onMessage(callback: (msg: any) => void) {
    this.socket?.on('message:new', callback);
    this.socket?.on('message:received', callback);
  }

  public offMessage(callback?: (msg: any) => void) {
    this.socket?.off('message:new', callback);
    this.socket?.off('message:received', callback);
  }

  public onConversationUpdated(callback: (conv: any) => void) {
    this.socket?.on('conversation:updated', callback);
  }

  public offConversationUpdated(callback?: (conv: any) => void) {
    this.socket?.off('conversation:updated', callback);
  }

  public disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketService = new SocketService();
