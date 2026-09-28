"use client";

import { useCallback, useEffect, useMemo, useRef, type ComponentProps, type ReactNode } from "react";
import L from "leaflet";
import {
  Circle,
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
  Tooltip as LeafletTooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { Crosshair, LocateFixed, Minus, Plus } from "lucide-react";
import { getMallBounds, getMallStatus, type Mall } from "@phoenix/core";
import { MallPopup } from "@/components/mall-popup";

interface MapViewProps {
  malls: Mall[];
  selectedCountry: string | null;
  selectedMall: Mall | null;
  now: Date;
  radiusMallId: string | null;
  routedMallIds: Set<string>;
  onSelectMall: (id: string) => void;
  onSelectCountry: (country: string | null) => void;
  onClosePopup: () => void;
  onEdit: (mall: Mall, mode: "marker" | "data") => void;
  onDelete: (mall: Mall) => void;
  onAction: (action: string, mall: Mall) => void;
  tileRetryKey: number;
  onTileStateChange: (state: "online" | "degraded" | "offline") => void;
}

const markerIcons = new Map<string, L.DivIcon>();

function iconFor(mall: Mall, isOpen: boolean, selected: boolean, index: number) {
  const key = `${mall.id}-${index}-${isOpen}-${selected}`;
  const cached = markerIcons.get(key);
  if (cached) return cached;
  const icon = L.divIcon({
    className: "mall-marker-icon",
    html: `<div class="mall-marker${isOpen ? " is-open" : ""}${selected ? " is-selected" : ""}" aria-label="${isOpen ? "Open" : "Closed"} mall"><span>${index + 1}</span></div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
  markerIcons.set(key, icon);
  return icon;
}

function MapControls({
  onWorldView,
}: {
  onWorldView: () => void;
}) {
  const map = useMap();
  const locateMe = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => map.flyTo([coords.latitude, coords.longitude], 11),
      () => window.dispatchEvent(new CustomEvent("phoenix-location-error")),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }, [map]);
  useEffect(() => {
    window.addEventListener("phoenix-locate-me", locateMe);
    return () => window.removeEventListener("phoenix-locate-me", locateMe);
  }, [locateMe]);
  return (
    <div className="map-controls" aria-label="Map controls">
      <button aria-label="Zoom in" title="Zoom in" onClick={() => map.zoomIn()}>
        <Plus size={17} />
      </button>
      <button aria-label="Zoom out" title="Zoom out" onClick={() => map.zoomOut()}>
        <Minus size={17} />
      </button>
      <span className="map-controls-divider" />
      <button
        aria-label="Show world view"
        title="Show world view"
        onClick={() => {
          onWorldView();
          map.setView([20, 15], 2, { animate: true });
        }}
      >
        <Crosshair size={16} />
      </button>
      <button aria-label="Find my location" title="Find my location" onClick={locateMe}>
        <LocateFixed size={16} />
      </button>
    </div>
  );
}

function MapSizer() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    observer.observe(container);
    map.invalidateSize({ animate: false });
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function CountryViewport({
  malls,
  selectedCountry,
}: {
  malls: Mall[];
  selectedCountry: string | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (selectedCountry) {
      const countryMalls = malls.filter((mall) => mall.country === selectedCountry);
      const mallBounds = getMallBounds(countryMalls);
      map.flyToBounds(mallBounds ?? [[8, 68], [35.8, 97.5]], {
        padding: [28, 28],
        maxZoom: 12,
        duration: 0.7,
      });
    } else {
      map.flyTo([20, 15], 2, { duration: 0.7 });
    }
  }, [map, malls, selectedCountry]);
  return null;
}

function MallMarker({
  mall,
  index,
  isOpen,
  selected,
  onSelect,
  children,
}: {
  mall: Mall;
  index: number;
  isOpen: boolean;
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  const marker = useRef<L.Marker | null>(null);
  const map = useMap();
  useEffect(() => {
    if (!selected || !marker.current) return;
    const target = L.latLng(mall.latitude, mall.longitude);
    const targetZoom = Math.max(map.getZoom(), 12);
    const needsMove =
      map.getZoom() !== targetZoom ||
      map.getCenter().distanceTo(target) > 80;

    if (needsMove) {
      const openSelectedPopup = () => marker.current?.openPopup();
      map.once("moveend", openSelectedPopup);
      map.flyTo(target, targetZoom, { animate: true, duration: 0.65 });
      return () => {
        map.off("moveend", openSelectedPopup);
      };
    }

    marker.current.openPopup();
  }, [map, mall.latitude, mall.longitude, selected]);
  return (
    <Marker
      ref={marker}
      position={[mall.latitude, mall.longitude]}
      icon={iconFor(mall, isOpen, selected, index)}
      eventHandlers={{ click: onSelect }}
    >
      {children}
    </Marker>
  );
}

function MapInteractions({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({ click: onMapClick });
  return null;
}

const indiaOutline: L.LatLngExpression[] = [
  [35.5, 74.8], [35.0, 77.8], [32.7, 78.8], [31.0, 79.0],
  [30.0, 80.0], [28.5, 88.0], [27.0, 89.0], [26.5, 92.0],
  [24.0, 94.0], [22.0, 93.5], [21.0, 90.0], [20.0, 87.0],
  [21.0, 85.0], [20.0, 82.0], [18.0, 84.0], [16.0, 82.0],
  [13.0, 80.0], [10.0, 77.0], [8.0, 77.0], [8.5, 75.0],
  [11.0, 74.0], [14.0, 73.0], [16.0, 72.0], [19.0, 72.0],
  [21.0, 69.0], [23.0, 68.0], [25.0, 70.0], [28.0, 70.0],
  [30.0, 70.0], [32.0, 74.0], [35.5, 74.8],
];

export function MapView({
  malls,
  selectedCountry,
  selectedMall,
  now,
  radiusMallId,
  routedMallIds,
  onSelectMall,
  onSelectCountry,
  onClosePopup,
  onEdit,
  onDelete,
  onAction,
  tileRetryKey,
  onTileStateChange,
}: MapViewProps) {
  const markerRows = useMemo(
    () =>
      (selectedCountry ? malls.filter((mall) => mall.country === selectedCountry) : []).map((mall, index) => ({
        mall,
        index,
        status: getMallStatus(mall, now),
      })),
    [malls, now, selectedCountry],
  );

  return (
    <div className="map-canvas">
      <MapContainer
        center={[20, 15]}
        zoom={selectedCountry ? 5 : 2}
        minZoom={2}
        maxZoom={18}
        zoomControl={false}
        scrollWheelZoom
        doubleClickZoom
        worldCopyJump
      >
        <TileLayer
          key={tileRetryKey}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          eventHandlers={{
            tileerror: () => onTileStateChange(navigator.onLine ? "degraded" : "offline"),
            tileload: () => {
              if (navigator.onLine) onTileStateChange("online");
            },
          }}
        />
        <MapControls
          onWorldView={() => {
            onClosePopup();
            onSelectCountry(null);
          }}
        />
        <MapSizer />
        <CountryViewport malls={malls} selectedCountry={selectedCountry} />
        <MapInteractions onMapClick={onClosePopup} />
        <Polygon
          positions={indiaOutline}
          pathOptions={{
            color: "#16734e",
            fillColor: "#3fac79",
            fillOpacity: selectedCountry ? 0.12 : 0.26,
            weight: selectedCountry ? 1.5 : 2.5,
          }}
          eventHandlers={{ click: () => onSelectCountry("India") }}
        >
          <LeafletTooltip sticky>
            <strong>India</strong> · {malls.length} Phoenix Malls
            <br />
            Select to explore
          </LeafletTooltip>
        </Polygon>
        {markerRows.map(({ mall, index, status }) => (
            <MallMarker
              key={mall.id}
              mall={mall}
              index={index}
              isOpen={status.hoursValid && status.isOpen}
              selected={selectedMall?.id === mall.id}
              onSelect={() => onSelectMall(mall.id)}
            >
              <Popup autoPan closeButton={false} offset={[0, -5]}>
                <PopupContent
                  mall={mall}
                  status={status}
                  isRouted={routedMallIds.has(mall.id)}
                  onClose={onClosePopup}
                  onEdit={(mode) => onEdit(mall, mode)}
                  onDelete={() => onDelete(mall)}
                  onAction={(action) => onAction(action, mall)}
                />
              </Popup>
            </MallMarker>
          ))}
        {radiusMallId &&
          malls
            .filter((mall) => mall.id === radiusMallId)
            .map((mall) => (
              <Circle
                key={mall.id}
                center={[mall.latitude, mall.longitude]}
                radius={5000}
                pathOptions={{
                  color: "#187c58",
                  fillColor: "#3bac7c",
                  fillOpacity: 0.12,
                  weight: 1.5,
                }}
              />
            ))}
      </MapContainer>
      <div className="map-atmosphere" aria-hidden="true">
        <div className="map-map-label">WESTERN INDIA</div>
        <div className="map-live-legend">
          <span className="legend-dot live" /> Open now
          <span className="legend-dot closed" /> Closed
        </div>
      </div>
    </div>
  );
}

type PopupContentProps = Omit<ComponentProps<typeof MallPopup>, "onClose"> & {
  onClose: () => void;
};

function PopupContent({ onClose, ...props }: PopupContentProps) {
  const map = useMap();
  return (
    <MallPopup
      {...props}
      onClose={() => {
        map.closePopup();
        onClose();
      }}
    />
  );
}
