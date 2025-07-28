import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { TouchableOpacity, View, ViewStyle } from 'react-native';
import { IconSymbol } from './IconSymbol';

export type IconButtonState = 'inactive' | 'active' | 'complete' | 'recording';
export type IconButtonSize = 'small' | 'medium' | 'large';

interface IconButtonProps {
  icon: string; // IconSymbol name
  state: IconButtonState;
  onPress: () => void;
  size?: IconButtonSize;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

const SIZES = {
  small: { container: 32, icon: 16 },
  medium: { container: 44, icon: 20 },
  large: { container: 56, icon: 24 }
};

const getStateColors = (state: IconButtonState, colorScheme: 'light' | 'dark') => {
  const colors = Colors[colorScheme];
  
  switch (state) {
    case 'active':
      return {
        background: colors.tint,
        icon: '#FFFFFF',
        border: colors.tint
      };
    case 'complete':
      return {
        background: '#4CAF50',
        icon: '#FFFFFF', 
        border: '#4CAF50'
      };
    case 'recording':
      return {
        background: '#F44336',
        icon: '#FFFFFF',
        border: '#F44336'
      };
    case 'inactive':
    default:
      return {
        background: 'rgba(0,0,0,0.1)',
        icon: colors.tabIconDefault,
        border: 'rgba(0,0,0,0.2)'
      };
  }
};

export function IconButton({
  icon,
  state,
  onPress,
  size = 'medium',
  disabled = false,
  style,
  accessibilityLabel
}: IconButtonProps) {
  const colorScheme = useColorScheme();
  const dimensions = SIZES[size];
  const stateColors = getStateColors(state, colorScheme ?? 'light');

  const handlePress = async () => {
    if (disabled) return;
    
    // Haptic feedback based on state
    switch (state) {
      case 'complete':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'recording':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'active':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      default:
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
    }
    
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      style={[
        {
          width: dimensions.container,
          height: dimensions.container,
          borderRadius: dimensions.container / 2,
          backgroundColor: disabled ? 'rgba(0,0,0,0.05)' : stateColors.background,
          borderWidth: 1,
          borderColor: disabled ? 'rgba(0,0,0,0.1)' : stateColors.border,
          justifyContent: 'center',
          alignItems: 'center',
          opacity: disabled ? 0.5 : 1,
        },
        style
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <IconSymbol
        name={icon}
        size={dimensions.icon}
        color={disabled ? 'rgba(0,0,0,0.3)' : stateColors.icon}
      />
      
      {/* Recording indicator dot */}
      {state === 'recording' && (
        <View
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#FFFFFF',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.3,
            shadowRadius: 2,
            elevation: 2,
          }}
        />
      )}
    </TouchableOpacity>
  );
} 