import React from 'react';
import { View } from 'react-native';

interface ScrollFadeIndicatorProps {
  position: 'top' | 'bottom';
  show: boolean;
  backgroundColor: string;
  height?: number;
}

export const ScrollFadeIndicator: React.FC<ScrollFadeIndicatorProps> = ({
  position,
  show,
  backgroundColor,
  height = 48
}) => {
  if (!show) return null;

  // Create 8 layers for smoother gradient
  const layers = 8;
  const layerHeight = height / layers;

  return (
    <View 
      className={`absolute left-0 right-0 z-20 pointer-events-none`}
      style={{
        [position]: 0,
        height: height
      }}
    >
      <View className="h-full w-full relative">
        {/* Create smooth fade effect with multiple layers */}
        {Array.from({ length: layers }, (_, index) => {
          // Create smooth exponential fade curve
          const progress = index / (layers - 1);
          const opacity = position === 'top' 
            ? Math.pow(1 - progress, 2) // Quadratic fade from solid to transparent
            : Math.pow(progress, 2);    // Quadratic fade from transparent to solid
          
          const layerPosition = position === 'top' 
            ? index * layerHeight 
            : (layers - 1 - index) * layerHeight;

          return (
            <View 
              key={index}
              className="absolute left-0 right-0"
              style={{ 
                [position === 'top' ? 'top' : 'bottom']: layerPosition,
                height: layerHeight,
                backgroundColor,
                opacity: opacity
              }}
            />
          );
        })}
      </View>
    </View>
  );
}; 