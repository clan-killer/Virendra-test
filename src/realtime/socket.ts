import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('access_token');
    socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true,
      // If you later secure the socket, pass the JWT:
      auth: token ? { token } : undefined,
    });

    socket.on('connect', () => console.log('[WS] connected', socket?.id));
    socket.on('connect_error', (err) => console.error('[WS] connect_error', err));
    socket.on('disconnect', (reason) => console.warn('[WS] disconnected', reason));
  }
  return socket;
}