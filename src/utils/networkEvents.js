const NETWORK_EVENT = {
  BACKEND_OFFLINE: 'BACKEND_OFFLINE',
  BACKEND_ONLINE: 'BACKEND_ONLINE',
};

const listeners = {
  [NETWORK_EVENT.BACKEND_OFFLINE]: new Set(),
  [NETWORK_EVENT.BACKEND_ONLINE]: new Set(),
};

const emit = (event) => {
  listeners[event].forEach((callback) => {
    try {
      callback();
    } catch (err) {
      console.warn('[networkEvents] listener error', err);
    }
  });
};

export const notifyBackendOffline = () => {
  emit(NETWORK_EVENT.BACKEND_OFFLINE);
};

export const notifyBackendOnline = () => {
  emit(NETWORK_EVENT.BACKEND_ONLINE);
};

export const subscribeToBackendEvents = ({ onOffline, onOnline } = {}) => {
  if (onOffline) {
    listeners[NETWORK_EVENT.BACKEND_OFFLINE].add(onOffline);
  }
  if (onOnline) {
    listeners[NETWORK_EVENT.BACKEND_ONLINE].add(onOnline);
  }

  return () => {
    if (onOffline) {
      listeners[NETWORK_EVENT.BACKEND_OFFLINE].delete(onOffline);
    }
    if (onOnline) {
      listeners[NETWORK_EVENT.BACKEND_ONLINE].delete(onOnline);
    }
  };
};
