import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix leaflet icon issue in react
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface EventMapProps {
  mapEmbedUrl: string;
  venueName: string;
  onDirectionsClick?: () => void;
}

const customIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapUpdater({ lat, lng }: { lat: number, lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 15);
  }, [lat, lng, map]);
  return null;
}

export const EventMap: React.FC<EventMapProps> = ({ mapEmbedUrl, venueName, onDirectionsClick }) => {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Try to extract from google maps embed URL format
    const match = mapEmbedUrl.match(/!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/);
    if (match) {
      setCoords({ lng: parseFloat(match[1]), lat: parseFloat(match[2]) });
    } else {
      // Fallback coordinates if parsing fails (Mumbai)
      setCoords({ lat: 19.0760, lng: 72.8777 });
    }
  }, [mapEmbedUrl]);

  if (!coords) return <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-500 rounded-xl">Loading map...</div>;

  const uberUrl = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${coords.lat}&dropoff[longitude]=${coords.lng}&dropoff[nickname]=${encodeURIComponent(venueName)}`;
  const olaUrl = `https://book.olacabs.com/?drop_lat=${coords.lat}&drop_lng=${coords.lng}&drop_name=${encodeURIComponent(venueName)}`;

  return (
    <div className="w-full h-64 md:h-72 rounded-xl overflow-hidden border-2 border-gold-500/20 shadow-inner bg-gray-100 relative group z-0">
      <MapContainer center={[coords.lat, coords.lng]} zoom={15} scrollWheelZoom={false} style={{ height: "100%", width: "100%", zIndex: 1 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[coords.lat, coords.lng]} icon={customIcon}>
          <Popup>
            <div className="text-center font-sans">
              <strong className="text-red-700">{venueName}</strong>
              <div className="flex gap-2 mt-2 justify-center">
                <a href={uberUrl} target="_blank" rel="noreferrer" onClick={onDirectionsClick} className="text-xs bg-black text-white px-2 py-1 rounded hover:bg-gray-800 flex items-center gap-1">
                  Uber
                </a>
                <a href={olaUrl} target="_blank" rel="noreferrer" onClick={onDirectionsClick} className="text-xs bg-yellow-400 text-black px-2 py-1 rounded hover:bg-yellow-500 flex items-center gap-1">
                  Ola
                </a>
              </div>
            </div>
          </Popup>
        </Marker>
        <MapUpdater lat={coords.lat} lng={coords.lng} />
      </MapContainer>
      <div className="absolute top-2 right-2 z-[400] flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <a href={uberUrl} target="_blank" rel="noreferrer" onClick={onDirectionsClick} className="bg-black text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-lg flex items-center gap-1">
          Get Uber
        </a>
        <a href={olaUrl} target="_blank" rel="noreferrer" onClick={onDirectionsClick} className="bg-yellow-400 text-black text-[10px] font-bold px-3 py-1.5 rounded shadow-lg flex items-center gap-1">
          Get Ola
        </a>
      </div>
    </div>
  );
};
