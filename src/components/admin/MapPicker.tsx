import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon paths (Vite bundling)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Props {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  height?: number;
}

const Recenter: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom() || 15); }, [lat, lng]);
  return null;
};

const ClickCatcher: React.FC<{ onPick: (lat: number, lng: number) => void }> = ({ onPick }) => {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
};

const MapPicker: React.FC<Props> = ({ lat, lng, onChange, height = 260 }) => {
  const center = useMemo<[number, number]>(() => [lat ?? 13.0827, lng ?? 80.2707], []);
  const [pos, setPos] = useState<[number, number] | null>(lat != null && lng != null ? [lat, lng] : null);

  useEffect(() => {
    if (lat != null && lng != null) setPos([lat, lng]);
  }, [lat, lng]);

  return (
    <div className="rounded overflow-hidden border" style={{ height }}>
      <MapContainer center={center} zoom={pos ? 15 : 12} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickCatcher onPick={(la, ln) => { setPos([la, ln]); onChange(la, ln); }} />
        {pos && <Marker position={pos} />}
        {pos && <Recenter lat={pos[0]} lng={pos[1]} />}
      </MapContainer>
    </div>
  );
};

export default MapPicker;
