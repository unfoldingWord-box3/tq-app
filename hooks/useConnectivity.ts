import { databaseService } from '@/services/databaseService';
import { door43ServiceDCS as door43Service } from '@/services/door43ServiceDCS';
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export interface ConnectivityState {
  isConnected: boolean;
  isInternetReachable: boolean;
  connectionType: string;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncTime: Date | null;
  pendingSyncItems: number;
  door43Available: boolean;
}

export function useConnectivity() {
  const [connectivity, setConnectivity] = useState<ConnectivityState>({
    isConnected: false,
    isInternetReachable: false,
    connectionType: 'unknown',
    syncStatus: 'idle',
    lastSyncTime: null,
    pendingSyncItems: 0,
    door43Available: false
  });

  const testDoor43Connection = async (): Promise<boolean> => {
    try {
      return await door43Service.checkConnectivity();
    } catch {
      console.error('Failed to test Door43 connection');
      return false;
    }
  };

  const checkPendingSyncItems = async () => {
    try {
      const pendingItems = await databaseService.getPendingSyncItems();
      setConnectivity(prev => ({
        ...prev,
        pendingSyncItems: pendingItems.length
      }));
    } catch (error) {
      console.error('Failed to check pending sync items:', error);
    }
  };

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(async state => {
      const isConnected = !!state.isConnected;
      const isInternetReachable = !!state.isInternetReachable;
      
      setConnectivity(prev => ({
        ...prev,
        isConnected,
        isInternetReachable,
        connectionType: state.type || 'unknown'
      }));

      // Check Door43 connectivity when we have internet
      if (isConnected && isInternetReachable) {
        checkPendingSyncItems();
        // Test Door43 connectivity
        const door43Available = await testDoor43Connection();
        setConnectivity(prev => ({
          ...prev,
          door43Available
        }));
      } else {
        setConnectivity(prev => ({
          ...prev,
          door43Available: false
        }));
      }
    });

    // Initial connectivity check
    NetInfo.fetch().then(async state => {
      const isConnected = !!state.isConnected;
      const isInternetReachable = !!state.isInternetReachable;
      
      setConnectivity(prev => ({
        ...prev,
        isConnected,
        isInternetReachable,
        connectionType: state.type || 'unknown'
      }));

      // Test Door43 connectivity if we have internet
      if (isConnected && isInternetReachable) {
        const door43Available = await testDoor43Connection();
        setConnectivity(prev => ({
          ...prev,
          door43Available
        }));
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);



  const syncPendingData = async (): Promise<boolean> => {
    if (!connectivity.isConnected || !connectivity.isInternetReachable) {
      return false;
    }

    try {
      setConnectivity(prev => ({ ...prev, syncStatus: 'syncing' }));

      const pendingItems = await databaseService.getPendingSyncItems();
      
      // Process each pending sync item
      for (const item of pendingItems) {
        try {
          // In a real app, this would upload the data to Door43 or backend
          // For now, just mark as synced
          await databaseService.updateSyncAttempt(item.id, true);
        } catch (error) {
          await databaseService.updateSyncAttempt(item.id, false, error instanceof Error ? error.message : 'Sync failed');
        }
      }

      setConnectivity(prev => ({
        ...prev,
        syncStatus: 'success',
        lastSyncTime: new Date(),
        pendingSyncItems: 0
      }));

      // Reset sync status after a delay
      setTimeout(() => {
        setConnectivity(prev => ({ ...prev, syncStatus: 'idle' }));
      }, 3000);

      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      setConnectivity(prev => ({ ...prev, syncStatus: 'error' }));
      
      setTimeout(() => {
        setConnectivity(prev => ({ ...prev, syncStatus: 'idle' }));
      }, 3000);

      return false;
    }
  };

  return {
    ...connectivity,
    testDoor43Connection,
    syncPendingData,
    checkPendingSyncItems
  };
} 