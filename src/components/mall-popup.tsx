"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  Check,
  Clock3,
  Compass,
  Crosshair,
  ExternalLink,
  GitCompareArrows,
  MapPin,
  Pencil,
  Route,
  Trash2,
  X,
} from "lucide-react";
import type { Mall, MallStatus } from "@phoenix/core";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MallPopupProps {
  mall: Mall;
  status: MallStatus;
  isRouted: boolean;
  onClose: () => void;
  onEdit: (mode: "marker" | "data") => void;
  onDelete: () => void;
  onAction: (action: string) => void;
}

const actions = [
  { id: "edit-marker", label: "Edit marker", Icon: Pencil },
  { id: "delete", label: "Delete marker", Icon: Trash2, danger: true },
  { id: "edit-data", label: "Edit data", Icon: MapPin },
  { id: "route", label: "Add to route", Icon: Route },
  { id: "radius", label: "Draw radius", Icon: Crosshair },
  { id: "website", label: "Go to website", Icon: ExternalLink },
  { id: "street-view", label: "Street view", Icon: Compass },
  { id: "match", label: "Match up data", Icon: GitCompareArrows },
];

export function MallPopup({
  mall,
  status,
  isRouted,
  onClose,
  onEdit,
  onDelete,
  onAction,
}: MallPopupProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const isOpen = status.hoursValid && status.isOpen;
  const imageStyle = !imageFailed
    ? { backgroundImage: `url("${mall.image}")` }
    : undefined;

  function activate(action: string) {
    if (action === "edit-marker") onEdit("marker");
    else if (action === "edit-data") onEdit("data");
    else if (action === "delete") onDelete();
    else onAction(action);
  }

  return (
    <article className="mall-popup">
      <div className="popup-photo" style={imageStyle} role="img" aria-label={`${mall.name} exterior`}>
        {imageFailed && <span className="photo-fallback">PHOENIX</span>}
        <div className={`popup-status ${isOpen ? "is-open" : "is-closed"}`}>
          <span className="status-dot" />
          {status.hoursValid ? (isOpen ? "OPEN NOW" : status.isHoliday ? "CLOSED FOR HOLIDAY" : "CLOSED") : "HOURS UNAVAILABLE"}
        </div>
        <button className="popup-close" onClick={onClose} aria-label="Close mall details">
          <X size={16} />
        </button>
        <Image
          src={mall.image}
          alt=""
          width={1}
          height={1}
          className="popup-image-check"
          onError={() => setImageFailed(true)}
        />
      </div>
      <div className="popup-content">
        <div className="popup-heading">
          <div>
            <p className="popup-eyebrow">{mall.city} · {mall.country}</p>
            <h2>{mall.name}</h2>
          </div>
          <span className="popup-sequence">PHX</span>
        </div>
        <div className="popup-meta">
          <div className="popup-detail">
            <MapPin size={14} />
            <span>{mall.address}</span>
          </div>
          <div className="popup-detail">
            <Clock3 size={14} />
            <span>
              Today · {mall.openingTime} – {mall.closingTime}
              <small>{status.localTime} local time · {mall.timezone}</small>
            </span>
          </div>
        </div>
        <div className="popup-footer">
          <span className={`hours-caption ${isOpen ? "text-open" : "text-closed"}`}>
            {status.isHoliday ? "Closed for a scheduled holiday" : status.hoursValid ? (isOpen ? "Welcoming guests" : "Opens at " + mall.openingTime) : "Check local hours"}
          </span>
          <a href={`tel:${mall.phone.replace(/[^\d+]/g, "")}`} className="popup-phone" aria-label={`Call ${mall.name}`}>
            {mall.phone}
          </a>
        </div>
        <div className="popup-actions">
          {actions.map(({ id, label, Icon, danger }) => (
            <Tooltip key={id}>
              <TooltipTrigger
                render={
                  <button
                    className={`popup-action${danger ? " is-danger" : ""}${id === "route" && isRouted ? " is-active" : ""}`}
                    aria-label={label}
                    onClick={() => activate(id)}
                  />
                }
              >
                <Icon size={16} strokeWidth={1.9} />
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
        {isRouted && (
          <div className="route-confirmation">
            <Check size={14} /> Added to your route
          </div>
        )}
        <a
          className="popup-directions"
          href={`https://www.google.com/maps/dir/?api=1&destination=${mall.latitude},${mall.longitude}`}
          target="_blank"
          rel="noreferrer"
        >
          Get directions <ArrowUpRight size={15} />
        </a>
      </div>
    </article>
  );
}
