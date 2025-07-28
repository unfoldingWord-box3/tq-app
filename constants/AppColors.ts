/**
 * Universal Color System for Language-Agnostic UI
 * 
 * This color system provides universal visual communication across cultures
 * without relying on text labels. Each color has specific semantic meaning.
 */

export const AppColors = {
  // Universal State Colors
  states: {
    active: '#007AFF',      // 🔵 Blue: Active, Selected, Primary Actions
    complete: '#4CAF50',    // 🟢 Green: Complete, Success, Recorded
    recording: '#F44336',   // 🔴 Red: Recording, Alert, Important
    bookmarked: '#FF9500',  // 🟡 Orange/Yellow: Bookmarked, Highlighted
    inactive: '#8E8E93',    // ⚫ Gray: Inactive, Disabled, Secondary
    background: '#FFFFFF',  // ⚪ White: Background, Clean space
  },

  // Semantic Colors
  semantic: {
    success: '#4CAF50',
    warning: '#FF9500', 
    error: '#F44336',
    info: '#007AFF',
    neutral: '#8E8E93',
  },

  // Progress Colors
  progress: {
    low: '#F44336',         // 0-33%: Red (needs attention)
    medium: '#FF9500',      // 34-66%: Orange (in progress)
    high: '#4CAF50',        // 67-100%: Green (good progress)
  },

  // Connectivity Status
  connectivity: {
    online: '#4CAF50',      // Connected to Door43
    offline: '#8E8E93',     // Offline mode
    syncing: '#007AFF',     // Synchronizing data
    error: '#F44336',       // Connection error
  },

  // Background Variants
  backgrounds: {
    primary: '#FFFFFF',
    secondary: '#F2F2F7',
    tertiary: '#EEEEEE',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },

  // Border and Divider Colors
  borders: {
    light: 'rgba(0, 0, 0, 0.1)',
    medium: 'rgba(0, 0, 0, 0.2)',
    heavy: 'rgba(0, 0, 0, 0.3)',
  },

  // Text Colors
  text: {
    primary: '#000000',
    secondary: '#666666',
    tertiary: '#999999',
    disabled: '#CCCCCC',
    inverse: '#FFFFFF',
  },
} as const;

/**
 * Get state color for UI elements
 */
export function getStateColor(state: 'active' | 'complete' | 'recording' | 'bookmarked' | 'inactive'): string {
  return AppColors.states[state];
}

/**
 * Get progress color based on percentage
 */
export function getProgressColor(progress: number): string {
  if (progress >= 0.67) return AppColors.progress.high;
  if (progress >= 0.34) return AppColors.progress.medium;
  return AppColors.progress.low;
}

/**
 * Get connectivity status color
 */
export function getConnectivityColor(status: 'online' | 'offline' | 'syncing' | 'error'): string {
  return AppColors.connectivity[status];
}

/**
 * Dark mode color variants
 */
export const AppColorsDark = {
  ...AppColors,
  
  // Adjusted for dark mode
  backgrounds: {
    primary: '#000000',
    secondary: '#1C1C1E',
    tertiary: '#2C2C2E',
    overlay: 'rgba(255, 255, 255, 0.1)',
  },

  text: {
    primary: '#FFFFFF',
    secondary: '#EBEBF5',
    tertiary: '#ABABAB',
    disabled: '#666666',
    inverse: '#000000',
  },

  borders: {
    light: 'rgba(255, 255, 255, 0.1)',
    medium: 'rgba(255, 255, 255, 0.2)',
    heavy: 'rgba(255, 255, 255, 0.3)',
  },
} as const; 