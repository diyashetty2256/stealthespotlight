import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";

let sharedSocket: Socket | null = null;

function getSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io("/", {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
    });
  }
  return sharedSocket;
}

export function useSocketState<T>(fallback: T | null = null) {
  const [state, setState] = useState<T | null>(fallback);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const onState = (next: T) => setState(next);
    const onConnect = () => {
      setConnected(true);
      socket.emit("request_state");
    };
    const onDisconnect = () => setConnected(false);

    socket.on("state", onState);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    setConnected(socket.connected);
    socket.emit("request_state");

    return () => {
      socket.off("state", onState);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  const requestState = useCallback(() => {
    socketRef.current?.emit("request_state");
  }, []);

  return { state, connected, requestState };
}

/**
 * Authoritative countdown driven by the server deadline.
 * We measure the offset between the server clock and local clock once,
 * then compute remaining time from the server deadline so all devices agree.
 */
export function useServerClock() {
  const offsetRef = useRef(0);

  useEffect(() => {
    const socket = getSocket();
    const onClock = (payload: { serverTime: string }) => {
      const receivedLocally = Date.now();
      const sentServer = new Date(payload.serverTime).getTime();
      // Approximate one-way latency as negligible relative to a 10s countdown.
      offsetRef.current = sentServer - receivedLocally;
    };
    socket.on("clock", onClock);
    // Also estimate offset from the most recent state payload's serverTime.
    const onState = (payload: { serverTime?: string }) => {
      if (payload?.serverTime) {
        offsetRef.current = new Date(payload.serverTime).getTime() - Date.now();
      }
    };
    socket.on("state", onState);
    return () => {
      socket.off("clock", onClock);
      socket.off("state", onState);
    };
  }, []);

  const now = useCallback(() => Date.now() + offsetRef.current, []);
  const subscribe = useCallback((fn: () => void) => {
    const id = window.setInterval(fn, 200);
    return () => window.clearInterval(id);
  }, []);

  return { now, subscribe, offset: offsetRef };
}

export function useCountdown(deadline: string | null): number {
  const { now, subscribe } = useServerClock();
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!deadline) {
      setRemaining(0);
      return;
    }
    const deadlineMs = new Date(deadline).getTime();
    const tick = () => {
      const ms = deadlineMs - now();
      setRemaining(ms > 0 ? Math.ceil(ms / 1000) : 0);
    };
    tick();
    return subscribe(tick);
  }, [deadline, now, subscribe]);

  return remaining;
}
