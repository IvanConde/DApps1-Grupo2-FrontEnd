import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import api from '../api/client';
import { notifyBackendOnline, subscribeToBackendEvents } from '../utils/networkEvents';

const ConnectivityContext = createContext({
  deviceOnline: true,
  backendOnline: true,
  isOffline: false,
  checkingBackend: false,
  retryBackendConnection: async () => false,
});

const HEALTH_ENDPOINT = '/';

export const ConnectivityProvider = ({ children }) => {
  const [deviceOnline, setDeviceOnline] = useState(true);
  const [backendOnline, setBackendOnline] = useState(true);
  const [checkingBackend, setCheckingBackend] = useState(false);
  const hasTriedInitialHealth = useRef(false);

  const evaluateDeviceState = useCallback((state) => {
    const isConnected = Boolean(state.isConnected);
    const isInternetReachable = state.isInternetReachable;
    const internetOk = isInternetReachable === null ? isConnected : Boolean(isInternetReachable);
    setDeviceOnline(isConnected && internetOk);
    if (!isConnected || internetOk === false) {
      setBackendOnline(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(evaluateDeviceState);
    NetInfo.fetch().then(evaluateDeviceState);
    return () => unsubscribe();
  }, [evaluateDeviceState]);

  useEffect(() => {
    const unsubscribe = subscribeToBackendEvents({
      onOffline: () => setBackendOnline(false),
      onOnline: () => setBackendOnline(true),
    });
    return unsubscribe;
  }, []);

  const pingBackend = useCallback(async () => {
    setCheckingBackend(true);
    try {
      await api.get(HEALTH_ENDPOINT);
      setBackendOnline(true);
      notifyBackendOnline();
      return true;
    } catch (error) {
      setBackendOnline(false);
      return false;
    } finally {
      setCheckingBackend(false);
    }
  }, []);

  useEffect(() => {
    if (deviceOnline && !hasTriedInitialHealth.current) {
      hasTriedInitialHealth.current = true;
      pingBackend();
    }
  }, [deviceOnline, pingBackend]);

  useEffect(() => {
    if (deviceOnline && !backendOnline) {
      pingBackend();
    }
  }, [deviceOnline, backendOnline, pingBackend]);

  const contextValue = useMemo(() => ({
    deviceOnline,
    backendOnline,
    isOffline: !deviceOnline || !backendOnline,
    checkingBackend,
    retryBackendConnection: pingBackend,
  }), [deviceOnline, backendOnline, checkingBackend, pingBackend]);

  return (
    <ConnectivityContext.Provider value={contextValue}>
      {children}
    </ConnectivityContext.Provider>
  );
};

export const useConnectivity = () => useContext(ConnectivityContext);
