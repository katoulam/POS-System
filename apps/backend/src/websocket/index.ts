import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | undefined;

export function initWebSocket(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, { cors: { origin: "*" } });
  return io;
}

// Used by any module to push a live update to every connected screen —
// e.g. the kitchen queue changing, or a table's lock status flipping.
export function broadcast(event: string, payload: unknown) {
  io?.emit(event, payload);
}
