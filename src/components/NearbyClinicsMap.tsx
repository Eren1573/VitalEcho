import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

export default function NearbyClinicsMap() {
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '');
  const [center, setCenter] = useState({ lat: 37.7749, lng: -122.4194 }); // SF default

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          console.warn('Geolocation failed or denied. Using default center.');
        }
      );
    }
  }, []);

  if (!apiKey || !apiKey.startsWith('AIza')) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
        <h3 className="font-bold text-yellow-900 mb-2">Google Maps Setup Required</h3>
        <p className="text-sm text-yellow-800 mb-2">
          To view nearby clinics and pharmacies, please configure your Google Maps API Key.
        </p>
        <p className="text-sm text-yellow-800">
          Get a free Demo Key here: <a href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio" target="_blank" rel="noopener noreferrer" className="underline">Maps Demo Key</a>
        </p>
        <p className="text-sm text-yellow-800 mt-2">
          Add it as <code>VITE_GOOGLE_MAPS_API_KEY</code> in the Settings tab.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-96 rounded-xl overflow-hidden border border-slate-200">
      <APIProvider apiKey={apiKey} onLoad={() => console.log('Maps API loaded')}>
        <Map
          defaultZoom={13}
          center={center}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
        >
          <PlacesLayer center={center} />
        </Map>
      </APIProvider>
    </div>
  );
}

function PlacesLayer({ center }: { center: google.maps.LatLngLiteral }) {
  const map = useMap();
  const placesLibrary = useMapsLibrary('places');
  const [places, setPlaces] = useState<google.maps.places.Place[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!placesLibrary || !map) return;

    async function fetchPlaces() {
      // Use Places API New programmatic searchNearby
      // Required to use placesLibrary.Place
      const request = {
        fields: ['displayName', 'location', 'types'],
        locationRestriction: {
          center: center,
          radius: 3000,
        },
        includedPrimaryTypes: ['hospital', 'pharmacy', 'medical_clinic', 'doctor'],
        maxResultCount: 10,
      };

      try {
        setError(null);
        const { places } = await placesLibrary.Place.searchNearby(request);
        setPlaces(places);
      } catch (err: any) {
        console.error('Error fetching places:', err);
        setError(err.message || 'Error fetching places. Please check your API key.');
      }
    }

    fetchPlaces();
  }, [placesLibrary, map, center]);

  return (
    <>
      {error && (
        <div className="absolute top-2 left-2 right-2 bg-red-100 border border-red-300 text-red-800 p-3 rounded-lg z-10 text-sm shadow-md">
          <p className="font-bold">Map Error</p>
          <p>{error}</p>
        </div>
      )}
      <AdvancedMarker position={center} title="Your Location">
        <Pin background={'#0f9d58'} borderColor={'#006425'} glyphColor={'#fff'} />
      </AdvancedMarker>
      {places.map((place, i) => (
        place.location ? (
          <AdvancedMarker key={i} position={place.location} title={place.displayName}>
            <Pin background={'#ea4335'} borderColor={'#c5221f'} glyphColor={'#fff'} />
          </AdvancedMarker>
        ) : null
      ))}
    </>
  );
}
