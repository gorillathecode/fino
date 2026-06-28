// No-op shim for @supabase/realtime-js on the web platform.
// Expo Router's static generation runs in Node.js 20 which has no native
// WebSocket. FINO does not use realtime subscriptions, so all methods are
// safe to stub out. The real package is used on iOS/Android as normal.

class RealtimeChannel {
  subscribe() { return this; }
  unsubscribe() { return Promise.resolve('ok'); }
  on() { return this; }
  off() { return this; }
  send() { return Promise.resolve('ok'); }
  track() { return Promise.resolve('ok'); }
  untrack() { return Promise.resolve('ok'); }
  presenceState() { return {}; }
}

class RealtimeClient {
  constructor() {
    this.channels = [];
    this.accessTokenValue = null;
  }
  connect() { return this; }
  disconnect(_, cb) { if (cb) cb(); return this; }
  channel() { return new RealtimeChannel(); }
  removeChannel() { return Promise.resolve('ok'); }
  removeAllChannels() { return Promise.resolve([]); }
  getChannels() { return []; }
  setAuth() {}
  log() {}
  accessToken() { return this.accessTokenValue; }
}

const REALTIME_LISTEN_TYPES = {
  BROADCAST: 'broadcast',
  PRESENCE: 'presence',
  POSTGRES_CHANGES: 'postgres_changes',
  SYSTEM: 'system',
};

const REALTIME_PRESENCE_LISTEN_EVENTS = {
  SYNC: 'sync',
  JOIN: 'join',
  LEAVE: 'leave',
};

const REALTIME_SUBSCRIBE_STATES = {
  SUBSCRIBED: 'SUBSCRIBED',
  TIMED_OUT: 'TIMED_OUT',
  CLOSED: 'CLOSED',
  CHANNEL_ERROR: 'CHANNEL_ERROR',
};

const REALTIME_POSTGRES_CHANGES_LISTEN_EVENT = {
  ALL: '*',
  INSERT: 'INSERT',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
};

module.exports = {
  RealtimeClient,
  RealtimeChannel,
  REALTIME_LISTEN_TYPES,
  REALTIME_PRESENCE_LISTEN_EVENTS,
  REALTIME_SUBSCRIBE_STATES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
};
