import { AppColors, getConnectivityColor, getStateColor } from '@/constants/AppColors';
import { useConnectivity } from '@/hooks/useConnectivity';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { IconSymbol } from './IconSymbol';

interface ConnectivityIndicatorProps {
  showSyncButton?: boolean;
  compact?: boolean;
  style?: any;
}

export function ConnectivityIndicator({ 
  showSyncButton = false, 
  compact = false, 
  style 
}: ConnectivityIndicatorProps) {
  const connectivity = useConnectivity();

  const handleSync = async () => {
    if (connectivity.pendingSyncItems > 0) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await connectivity.syncPendingData();
    }
  };

  const getConnectionIcon = () => {
    if (!connectivity.isConnected) return 'wifi.slash';
    if (!connectivity.isInternetReachable) return 'wifi.exclamationmark';
    return 'wifi';
  };

  const getConnectionColor = () => {
    if (!connectivity.isConnected || !connectivity.isInternetReachable) {
      return getConnectivityColor('offline');
    }
    return getConnectivityColor('online');
  };

  const getSyncIcon = () => {
    switch (connectivity.syncStatus) {
      case 'syncing': return 'arrow.clockwise';
      case 'success': return 'checkmark.circle.fill';
      case 'error': return 'exclamationmark.circle.fill';
      default: return connectivity.pendingSyncItems > 0 ? 'cloud.fill' : 'checkmark.circle.fill';
    }
  };

  const getSyncColor = () => {
    switch (connectivity.syncStatus) {
      case 'syncing': return getStateColor('active');
      case 'success': return getStateColor('complete');
      case 'error': return getStateColor('recording');
      default: return connectivity.pendingSyncItems > 0 ? getStateColor('bookmarked') : getStateColor('complete');
    }
  };

  if (compact) {
    return (
      <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
        {/* Connection Status */}
        <View style={{ marginRight: 8 }}>
          <IconSymbol 
            name={getConnectionIcon()} 
            size={16} 
            color={getConnectionColor()} 
          />
        </View>

        {/* Sync Status */}
        {connectivity.syncStatus === 'syncing' ? (
          <ActivityIndicator size="small" color={getSyncColor()} />
        ) : (
          <View style={{ position: 'relative' }}>
            <IconSymbol 
              name={getSyncIcon()} 
              size={16} 
              color={getSyncColor()} 
            />
            {connectivity.pendingSyncItems > 0 && (
              <View style={{
                position: 'absolute',
                top: -4,
                right: -4,
                backgroundColor: getStateColor('recording'),
                borderRadius: 6,
                minWidth: 12,
                height: 12,
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Text style={{
                  fontSize: 8,
                  fontWeight: 'bold',
                  color: '#FFFFFF'
                }}>
                  {connectivity.pendingSyncItems > 9 ? '9+' : connectivity.pendingSyncItems}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[{
      backgroundColor: AppColors.backgrounds.secondary,
      borderRadius: 12,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    }, style]}>
      {/* Connection Info */}
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <View style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: getConnectionColor() + '20',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12
        }}>
          <IconSymbol 
            name={getConnectionIcon()} 
            size={18} 
            color={getConnectionColor()} 
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: AppColors.text.primary
          }}>
            {connectivity.isConnected && connectivity.isInternetReachable ? 'Online' : 'Offline'}
          </Text>
          <Text style={{
            fontSize: 12,
            color: AppColors.text.secondary
          }}>
            {connectivity.isConnected && connectivity.isInternetReachable 
              ? `${connectivity.connectionType} connection`
              : 'Working offline'
            }
          </Text>
        </View>
      </View>

      {/* Sync Info */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {connectivity.syncStatus === 'syncing' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
            <ActivityIndicator size="small" color={getSyncColor()} />
            <Text style={{
              fontSize: 12,
              color: AppColors.text.secondary,
              marginLeft: 6
            }}>
              Syncing...
            </Text>
          </View>
        ) : (
          <View style={{ alignItems: 'center', marginRight: 12 }}>
            <View style={{ position: 'relative' }}>
              <IconSymbol 
                name={getSyncIcon()} 
                size={20} 
                color={getSyncColor()} 
              />
              {connectivity.pendingSyncItems > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  backgroundColor: getStateColor('recording'),
                  borderRadius: 6,
                  minWidth: 12,
                  height: 12,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Text style={{
                    fontSize: 8,
                    fontWeight: 'bold',
                    color: '#FFFFFF'
                  }}>
                    {connectivity.pendingSyncItems > 9 ? '9+' : connectivity.pendingSyncItems}
                  </Text>
                </View>
              )}
            </View>
            <Text style={{
              fontSize: 10,
              color: AppColors.text.secondary,
              marginTop: 2
            }}>
              {connectivity.pendingSyncItems > 0 
                ? `${connectivity.pendingSyncItems} pending`
                : connectivity.lastSyncTime 
                ? 'Synced'
                : 'No data to sync'
              }
            </Text>
          </View>
        )}

        {/* Sync Button */}
        {showSyncButton && connectivity.pendingSyncItems > 0 && (
          <TouchableOpacity
            onPress={handleSync}
            disabled={!connectivity.isConnected || connectivity.syncStatus === 'syncing'}
            style={{
              backgroundColor: connectivity.isConnected && connectivity.syncStatus !== 'syncing'
                ? getStateColor('active')
                : AppColors.backgrounds.tertiary,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 6,
              opacity: connectivity.isConnected && connectivity.syncStatus !== 'syncing' ? 1 : 0.5
            }}
          >
            <Text style={{
              fontSize: 12,
              fontWeight: '600',
              color: connectivity.isConnected && connectivity.syncStatus !== 'syncing'
                ? '#FFFFFF'
                : AppColors.text.secondary
            }}>
              Sync
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
} 