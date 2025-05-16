import { useEffect, useState } from 'react';
import { useSyncStore } from '~/stores/syncStore';

/**
 * Hook to track network status with additional details
 */
export function useNetworkStatus() {
  const { isOnline } = useSyncStore();
  const [connectionType, setConnectionType] = useState<string | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'unknown'>('unknown');
  
  // Update connection details when available
  useEffect(() => {
    const updateConnectionInfo = () => {
      if (navigator.connection) {
        // @ts-ignore - Not all browsers support the connection API
        const connection = navigator.connection;
        
        if (connection.effectiveType) {
          setConnectionType(connection.effectiveType);
          
          // Determine connection quality based on effective type
          if (['4g', '3g'].includes(connection.effectiveType)) {
            setConnectionQuality('good');
          } else {
            setConnectionQuality('poor');
          }
        }
      }
    };
    
    // Initial check
    updateConnectionInfo();
    
    // Set up event listeners if the API is available
    if (navigator.connection) {
      // @ts-ignore - Not all browsers support the connection API
      navigator.connection.addEventListener('change', updateConnectionInfo);
      
      return () => {
        // @ts-ignore
        navigator.connection.removeEventListener('change', updateConnectionInfo);
      };
    }
  }, []);
  
  return {
    isOnline,
    connectionType,
    connectionQuality,
    isSlow: connectionQuality === 'poor',
  };
}
