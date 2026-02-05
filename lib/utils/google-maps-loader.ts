import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_CONFIG } from '@/lib/constants/google-maps';

let isLoading = false;
let isLoaded = false;
const callbacks: (() => void)[] = [];

/**
 * Loads Google Maps JavaScript API only once, even if called from multiple components
 * Uses a singleton pattern to prevent multiple script tags
 */
export function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (isLoaded || window.google?.maps?.places) {
      isLoaded = true;
      resolve();
      return;
    }

    // Currently loading - add to callback queue
    if (isLoading) {
      callbacks.push(resolve);
      return;
    }

    // Check if script already exists in DOM
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      isLoaded = true;
      resolve();
      return;
    }

    // Start loading
    isLoading = true;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=${GOOGLE_MAPS_CONFIG.LIBRARIES.join(',')}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      isLoading = false;
      isLoaded = true;
      resolve();
      // Resolve all queued callbacks
      callbacks.forEach(cb => cb());
      callbacks.length = 0;
    };

    script.onerror = () => {
      isLoading = false;
      const error = new Error('Failed to load Google Maps script');
      reject(error);
      console.error(error);
    };

    document.head.appendChild(script);
  });
}
