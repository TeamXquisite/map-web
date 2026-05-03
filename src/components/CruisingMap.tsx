'use client';

import { useState, useEffect, useMemo } from 'react';
import Map, { Source, Layer } from 'react-map-gl';
import { io, Socket } from 'socket.io-client';
import 'mapbox-gl/dist/mapbox-gl.css';
import AuthModal from './AuthModal';
import UpgradeModal from './UpgradeModal';
import ChatBox from './ChatBox';

const userLayerStyle = {
  id: 'active-users-layer',
  type: 'circle',
  paint: {
    'circle-radius': 8,
    'circle-color': '#ff4d4d', 
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff'
  }
};

export default function CruisingMap() {
  // 1. STATE VARIABLES (This is where currentUser lives!)
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [myLocation, setMyLocation] = useState({ lat: 21.289, lng: -157.892 });
  const [locationHint, setLocationHint] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<Record<string, { lat: number, lng: number }>>({});
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // 2. REAL-TIME ENGINE (Connects to Node.js)
  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));

    newSocket.on('map_sync', (data) => {
      // Don't show our own fuzzed pin on our screen
      if (currentUser && data.userId === currentUser.id) return;

      setActiveUsers((prev) => ({
        ...prev,
        [data.userId]: data.fuzzed_location
      }));
    });

    if ('geolocation' in navigator) {
      const onGeoError = (error: GeolocationPositionError) => {
        // Timeout/unavailable are common in dev (WSL, VPN, privacy); avoid noisy terminal logs.
        // Only warn when the user can fix it by changing site permission.
        if (process.env.NODE_ENV === 'development' && error.code === error.PERMISSION_DENIED) {
          console.warn('[CruisingMap] Geolocation blocked — allow location for this site in the browser.');
        }
        setLocationHint(
          error.code === error.PERMISSION_DENIED
            ? 'Location access denied — allow it in the site settings, or the map stays on the default area.'
            : 'Could not get your position (browser/network). The map uses the default center; you can still use Simulate Movement after login.'
        );
      };

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMyLocation({ lat: latitude, lng: longitude });
          setLocationHint(null);

          // Only broadcast location if we are actually logged in
          if (currentUser) {
            newSocket.emit('location_update', {
              userId: currentUser.id, 
              lat: latitude,
              lng: longitude
            });
          }
        },
        onGeoError,
        // Low accuracy + longer timeout: fewer failures on desktop / WSL / blocked network location APIs.
        { enableHighAccuracy: false, maximumAge: 120000, timeout: 20000 }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
        newSocket.disconnect();
      };
    }
  }, [currentUser]); // Re-run this effect when the user logs in

  // 3. MAP DATA PREPARATION
  const geojsonFeatureCollection = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: Object.entries(activeUsers).map(([id, loc]) => ({
        type: 'Feature',
        properties: { userId: id },
        geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] }
      }))
    };
  }, [activeUsers]);

  return (
    <div className="w-screen h-screen relative bg-gray-900 overflow-hidden">
      
      {/* 🔴 THE MAP 🔴 */}
      <Map
        initialViewState={{
          longitude: myLocation.lng,
          latitude: myLocation.lat,
          zoom: 14
        }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'placeholder_key'}
      >
        <Source id="active-users" type="geojson" data={geojsonFeatureCollection as any}>
          <Layer {...userLayerStyle as any} />
        </Source>
      </Map>
      
      {/* 🔴 THE UI DASHBOARD 🔴 */}
      <div className="absolute top-4 left-4 z-10 bg-black/90 text-white p-4 rounded-xl border border-gray-700 shadow-2xl min-w-[250px]">
        {currentUser ? (
          <div>
            <h1 className="text-xl font-bold text-pink-500 mb-1">@{currentUser.username}</h1>
            
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs uppercase tracking-wider text-gray-400 border border-gray-700 inline-block px-2 py-1 rounded">
                {currentUser.membership_tier} Tier
              </p>
              {/* Only show the upgrade button if they aren't Elite yet! */}
              {currentUser.membership_tier !== 'elite' && (
                <button 
                  onClick={() => setShowUpgradeModal(true)}
                  className="bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-bold px-2 py-1 rounded uppercase tracking-wider hover:scale-105 transition-transform"
                >
                  Upgrade
                </button>
              )}
            </div>
            
            <div className="w-full h-px bg-gray-700 my-2"></div>
            <p className="text-sm text-gray-300 mb-2">Active Pins Nearby: <span className="font-bold text-pink-400">{Object.keys(activeUsers).length}</span></p>
            
            {/* Simulation Button */}
            <button 
              onClick={() => {
                if (socket && currentUser) {
                  const randomLat = myLocation.lat + (Math.random() * 0.01 - 0.005);
                  const randomLng = myLocation.lng + (Math.random() * 0.01 - 0.005);
                  socket.emit('location_update', {
                    userId: currentUser.id,
                    lat: randomLat,
                    lng: randomLng
                  });
                  console.log("Fired fake location to backend!");
                }
              }}
              className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-1 px-2 rounded-md transition-colors text-xs mt-2"
            >
              Simulate Movement
            </button>
          </div>
        ) : (
          <div>
            <h1 className="text-lg font-bold text-gray-400">Map Locked</h1>
            <p className="text-xs text-gray-500">Please authenticate to connect.</p>
          </div>
        )}
      </div>

      {/* 🔴 THE LIVE CHAT BOX 🔴 */}
      {currentUser && (
        <ChatBox 
          currentUser={currentUser} 
          socket={socket} 
          myLocation={myLocation} // <-- Add this single prop!
        />
      )}

      {/* 🔴 THE UPGRADE GATE 🔴 */}
      {showUpgradeModal && currentUser && (
        <UpgradeModal 
          currentUser={currentUser} 
          onClose={() => setShowUpgradeModal(false)} 
        />
      )}

      {/* 🔴 THE AUTHENTICATION GATE 🔴 */}
      {!currentUser && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <AuthModal onAuthSuccess={(user) => setCurrentUser(user)} />
        </div>
      )}

      
    </div>
  );
}