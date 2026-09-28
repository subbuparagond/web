"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  Clock3,
  Compass,
  Crosshair,
  Globe2,
  LocateFixed,
  MapPin,
  Moon,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { filterMalls, getMallStatus, mockMallRepository, type Mall } from "@phoenix/core";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MapView = dynamic(
  () => import("@/components/map-view").then((module) => module.MapView),
  { ssr: false, loading: () => <div className="map-loading"><span />Loading map</div> },
);

type EditMode = "marker" | "data";
type DialogState =
  | { kind: "edit"; mall: Mall; mode: EditMode }
  | { kind: "delete"; mall: Mall }
  | null;

function subscribeToTheme(callback: () => void) {
  const listener = () => callback();
  window.addEventListener("storage", listener);
  window.addEventListener("phoenix-theme-change", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("phoenix-theme-change", listener);
  };
}

function getThemeSnapshot() {
  const saved = window.localStorage.getItem("phoenix-theme");
  return saved === "dark" || (saved !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

export function MapDashboard() {
  const [malls, setMalls] = useState<Mall[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [radiusMallId, setRadiusMallId] = useState<string | null>(null);
  const [routedMallIds, setRoutedMallIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState("");
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const [countrySelection, setCountrySelection] = useState<string | null>(null);
  const [openFilter, setOpenFilter] = useState<"all" | "open" | "closed">("all");
  const isDark = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => false);
  const [networkState, setNetworkState] = useState<"online" | "degraded" | "offline">("online");
  const [tileRetryKey, setTileRetryKey] = useState(0);
  const selectedMall = malls.find((mall) => mall.id === selectedId) ?? null;
  const openCount = malls.filter((mall) => {
    const status = getMallStatus(mall, now);
    return status.hoursValid && status.isOpen;
  }).length;
  const country = countrySelection ?? "Global";

  useEffect(() => {
    let active = true;
    mockMallRepository.getMalls("India").then((items) => {
      if (!active) return;
      setMalls(items);
      setLoading(false);
    }).catch((error: unknown) => {
      if (!active) return;
      setLoadError(error instanceof Error ? error.message : "Unable to load mall data.");
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const visibleMalls = useMemo(() => {
    return filterMalls(malls, {
      country: countrySelection,
      query: search,
      status: openFilter,
      now,
    });
  }, [countrySelection, malls, now, openFilter, search]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
  }, [isDark]);

  useEffect(() => {
    const updateNetwork = () => {
      if (navigator.onLine) {
        setNetworkState("online");
        setTileRetryKey((key) => key + 1);
      } else {
        setNetworkState("offline");
      }
    };
    window.addEventListener("online", updateNetwork);
    window.addEventListener("offline", updateNetwork);
    updateNetwork();
    return () => {
      window.removeEventListener("online", updateNetwork);
      window.removeEventListener("offline", updateNetwork);
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.querySelector<HTMLInputElement>(".search-field input")?.focus();
      }
      if (event.key === "Escape") setSelectedId(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onLocationError() {
      setNotice("Location permission was not available");
    }
    window.addEventListener("phoenix-location-error", onLocationError);
    return () => window.removeEventListener("phoenix-location-error", onLocationError);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function openEdit(mall: Mall, mode: EditMode) {
    setFormName(mall.name);
    setFormAddress(mall.address);
    setDialog({ kind: "edit", mall, mode });
  }

  function saveEdit() {
    if (!dialog || dialog.kind !== "edit") return;
    const name = formName.trim();
    const address = formAddress.trim();
    if (!name || !address) {
      setNotice("Name and address are required");
      return;
    }
    setMalls((current) =>
      current.map((mall) =>
        mall.id === dialog.mall.id ? { ...mall, name, address } : mall,
      ),
    );
    setDialog(null);
    setNotice("Mall details updated");
  }

  function deleteMall() {
    if (!dialog || dialog.kind !== "delete") return;
    const removedId = dialog.mall.id;
    setMalls((current) => current.filter((mall) => mall.id !== removedId));
    setRoutedMallIds((current) => {
      const next = new Set(current);
      next.delete(removedId);
      return next;
    });
    if (selectedId === removedId) setSelectedId(null);
    if (radiusMallId === removedId) setRadiusMallId(null);
    setDialog(null);
    setNotice("Mall removed from this view");
  }

  function handleAction(action: string, mall: Mall) {
    if (action === "route") {
      setRoutedMallIds((current) => {
        const next = new Set(current);
        if (next.has(mall.id)) next.delete(mall.id);
        else next.add(mall.id);
        return next;
      });
      return;
    }
    if (action === "radius") {
      setRadiusMallId((current) => current === mall.id ? null : mall.id);
      setNotice(radiusMallId === mall.id ? "Radius removed" : "5 km radius shown");
      return;
    }
    if (action === "website") {
      window.open(mall.website, "_blank", "noopener,noreferrer");
      return;
    }
    if (action === "street-view") {
      window.open(
        `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${mall.latitude},${mall.longitude}`,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }
    if (action === "match") setNotice("Mall matched with Phoenix directory data");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Phoenix Malls home">
          <span className="brand-mark"><span>p</span><i /></span>
          <span className="brand-name">phoenix<span>malls</span></span>
        </Link>
        <div className="topbar-divider" />
        <div className="topbar-context">
          <span className="context-kicker">DISCOVER</span>
          <span className="context-title">{country === "Global" ? "Around the world" : country}</span>
        </div>
        <div className="topbar-spacer" />
        <div className="live-indicator"><span /> Live mall status</div>
        <button
          className="theme-toggle"
          title={`Switch to ${isDark ? "light" : "dark"} mode`}
          aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
          onClick={() => {
            const next = !isDark;
            window.localStorage.setItem("phoenix-theme", next ? "dark" : "light");
            window.dispatchEvent(new Event("phoenix-theme-change"));
          }}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="topbar-avatar" title="Your profile" aria-label="Your profile">A</button>
      </header>

      <main className="workspace">
        <aside className="discovery-panel">
          <div className="panel-heading">
            <div className="panel-kicker"><Sparkles size={13} /> YOUR NEXT STOP</div>
            <h1>Find your<br /><em>happy place.</em></h1>
            <p>Explore destinations, wherever you are.</p>
          </div>

          <div className="country-picker-wrap">
            <button className="country-picker" onClick={() => setCountryMenuOpen((open) => !open)}>
              <span className="country-flag">{country === "Global" ? <Globe2 size={15} /> : "IN"}</span>
              <span className="country-picker-copy">
                <small>EXPLORING</small>
                <strong>{country}</strong>
              </span>
              <ChevronDown size={17} className={countryMenuOpen ? "rotate" : ""} />
            </button>
            {countryMenuOpen && (
              <div className="country-menu">
                <button onClick={() => {
                  setCountryMenuOpen(false);
                  setCountrySelection("India");
                  setSelectedId(null);
                }}>
                  <span className="country-flag">IN</span> India <span className="country-result">{malls.length} malls</span>
                </button>
                <button onClick={() => {
                  setCountryMenuOpen(false);
                  setCountrySelection(null);
                  setSelectedId(null);
                }}>
                  <Globe2 size={16} /> Global view <span className="country-result">Explore map</span>
                </button>
              </div>
            )}
          </div>

          <div className="list-toolbar">
            <div className="list-title">
              <div>
                <span className="section-label">DESTINATIONS</span>
                <h2>Phoenix Malls <span>{malls.length}</span></h2>
              </div>
              <button
                className={`soft-icon-button${openFilter !== "all" ? " is-filtered" : ""}`}
                aria-label={`Filter malls, currently ${openFilter}`}
                title={`Filter malls: ${openFilter}`}
                onClick={() => setOpenFilter((filter) =>
                  filter === "all" ? "open" : filter === "open" ? "closed" : "all",
                )}
              >
                <SlidersHorizontal size={16} />
              </button>
            </div>
            <label className="search-field">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search malls or cities"
                aria-label="Search malls or cities"
              />
              {search && <button onClick={() => setSearch("")} aria-label="Clear search"><X size={14} /></button>}
              {!search && <kbd>⌘ K</kbd>}
            </label>
            <div className="list-subline">
              <span>{visibleMalls.length} places to explore · {openFilter === "all" ? "all statuses" : `${openFilter} only`}</span>
              <button onClick={() => {
                if (!navigator.geolocation) {
                  setNotice("Location is not available in this browser");
                  return;
                }
                navigator.geolocation.getCurrentPosition(
                  ({ coords }) => {
                    const distance = (mall: Mall) => {
                      const lat1 = coords.latitude * Math.PI / 180;
                      const lat2 = mall.latitude * Math.PI / 180;
                      const deltaLat = lat2 - lat1;
                      const deltaLon = (mall.longitude - coords.longitude) * Math.PI / 180;
                      const a = Math.sin(deltaLat / 2) ** 2 +
                        Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
                      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    };
                    const nearest = [...visibleMalls].sort((a, b) => distance(a) - distance(b))[0];
                    if (!nearest) {
                      setNotice("No malls match the current filters");
                      return;
                    }
                    setSelectedId(nearest.id);
                    setNotice(`Nearest: ${nearest.name} · ${Math.round(distance(nearest))} km`);
                  },
                  () => setNotice("Location permission was not available"),
                  { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
                );
              }}><LocateFixed size={13} /> Nearby</button>
            </div>
          </div>

          <div className="mall-list" aria-label="Phoenix malls in India">
            {loading && <div className="empty-search"><span className="map-loading-spinner" /><strong>Finding malls…</strong></div>}
            {!loading && loadError && (
              <div className="empty-search" role="alert">
                <strong>We couldn’t load the malls</strong>
                <span>{loadError}</span>
                <button className="retry-button" onClick={() => {
                  setLoading(true);
                  setLoadError(null);
                  mockMallRepository.getMalls("India").then((items) => {
                    setMalls(items);
                    setLoading(false);
                  }).catch((error: unknown) => {
                    setLoadError(error instanceof Error ? error.message : "Unable to load mall data.");
                    setLoading(false);
                  });
                }}>Try again</button>
              </div>
            )}
            {countrySelection && visibleMalls.map((mall, index) => {
              const status = getMallStatus(mall, now);
              const active = selectedId === mall.id;
              return (
                <button
                  key={mall.id}
                  className={`mall-row${active ? " is-selected" : ""}`}
                  onClick={() => setSelectedId(mall.id)}
                  aria-pressed={active}
                >
                  <span className="mall-row-count">{String(index + 1).padStart(2, "0")}</span>
                  <span className={`mall-row-icon ${status.isOpen ? "is-open" : "is-closed"}`}>
                    <Building2 size={18} />
                  </span>
                  <span className="mall-row-copy">
                    <strong>{mall.name}</strong>
                    <span><MapPin size={12} />{mall.city}, India</span>
                  </span>
                  <span className={`mall-row-status ${status.isOpen ? "is-open" : "is-closed"}`}>
                    <i />{status.hoursValid ? (status.isHoliday ? "Holiday" : status.isOpen ? "Open" : "Closed") : "Hours n/a"}
                  </span>
                  <ArrowRight size={15} className="mall-row-arrow" />
                </button>
              );
            })}
            {!loading && !loadError && country === "Global" && (
              <div className="empty-search">
                <Globe2 size={22} />
                <strong>Select India on the map</strong>
                <span>Choose a highlighted country to see its Phoenix Malls.</span>
              </div>
            )}
            {!loading && !loadError && country !== "Global" && visibleMalls.length === 0 && (
              <div className="empty-search">
                <Search size={22} />
                <strong>No malls found</strong>
                <span>Try another mall name or city.</span>
              </div>
            )}
          </div>

          <div className="panel-bottom">
            <div className="panel-bottom-copy">
              <span className="bottom-icon"><Compass size={17} /></span>
              <span><strong>Make a day of it</strong><small>Plan a visit to your favourite mall</small></span>
            </div>
            <button onClick={() => selectedMall && handleAction("route", selectedMall)} aria-label="Plan your visit">
              <ArrowRight size={17} />
            </button>
          </div>
        </aside>

        <section className="map-section" aria-label="Interactive Phoenix Malls map">
          <div className="map-section-heading">
            <div className="map-heading-title">
              <span className="map-heading-icon"><Globe2 size={18} /></span>
              <div>
                <h2>Explore the map</h2>
                <p><span /> Phoenix destinations in {country}</p>
              </div>
            </div>
            <div className="map-heading-right">
              <span className="map-open-summary"><span className="status-dot" />{openCount} open now</span>
              <button className="map-locate" onClick={() => window.dispatchEvent(new Event("phoenix-locate-me"))}>
                <LocateFixed size={15} /><span>My area</span>
              </button>
            </div>
          </div>
          <div className="map-frame">
            <MapView
              malls={visibleMalls}
              selectedCountry={countrySelection}
              selectedMall={selectedMall && visibleMalls.some((mall) => mall.id === selectedMall.id) ? selectedMall : null}
              now={now}
              radiusMallId={radiusMallId}
              routedMallIds={routedMallIds}
              onSelectMall={setSelectedId}
              onSelectCountry={(selectedCountry) => {
                setCountrySelection(selectedCountry);
                setSelectedId(null);
                setCountryMenuOpen(false);
              }}
              onClosePopup={() => setSelectedId(null)}
              onEdit={openEdit}
              onDelete={(mall) => setDialog({ kind: "delete", mall })}
              onAction={handleAction}
              tileRetryKey={tileRetryKey}
              onTileStateChange={setNetworkState}
            />
            {networkState !== "online" && (
              <div className="map-network-notice" role="status">
                <strong>{networkState === "offline" ? "You’re offline" : "Map tiles are unavailable"}</strong>
                <span>{networkState === "offline" ? "Mall details and saved data remain available." : "Some map tiles did not load."}</span>
                <button
                  onClick={() => {
                    if (!navigator.onLine) {
                      setNetworkState("offline");
                      return;
                    }
                    setNetworkState("degraded");
                    setTileRetryKey((key) => key + 1);
                  }}
                >
                  Retry map
                </button>
              </div>
            )}
            <div className="map-caption">
              <span><Globe2 size={14} /> {country === "Global" ? "WORLD VIEW" : "MUMBAI · PUNE REGION"}</span>
              <span>Drag to explore <i>·</i> Scroll to zoom</span>
            </div>
            {radiusMallId && <div className="map-radius-chip"><Crosshair size={13} /> 5 km radius <button onClick={() => setRadiusMallId(null)} aria-label="Remove radius"><X size={13} /></button></div>}
          </div>
          <div className="map-bottom-line">
            <span><Clock3 size={14} /> Live hours updated every minute</span>
            <span><span className="privacy-dot" /> OpenStreetMap</span>
          </div>
        </section>
      </main>

      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="action-dialog">
          {dialog?.kind === "edit" && (
            <>
              <DialogHeader>
                <div className="dialog-icon"><Building2 size={18} /></div>
                <DialogTitle>{dialog.mode === "marker" ? "Edit map marker" : "Edit mall details"}</DialogTitle>
                <DialogDescription>Changes apply to this local preview.</DialogDescription>
              </DialogHeader>
              <div className="dialog-fields">
                <label>Mall name<input value={formName} onChange={(event) => setFormName(event.target.value)} autoFocus /></label>
                <label>Address<input value={formAddress} onChange={(event) => setFormAddress(event.target.value)} /></label>
                {dialog.mode === "marker" && (
                  <p className="dialog-note">Marker position: {dialog.mall.latitude.toFixed(4)}, {dialog.mall.longitude.toFixed(4)}</p>
                )}
              </div>
              <DialogFooter className="dialog-actions">
                <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
                <Button onClick={saveEdit}><Check size={15} /> Save changes</Button>
              </DialogFooter>
            </>
          )}
          {dialog?.kind === "delete" && (
            <>
              <DialogHeader>
                <div className="dialog-icon danger"><MapPin size={18} /></div>
                <DialogTitle>Remove this mall?</DialogTitle>
                <DialogDescription>
                  <strong>{dialog.mall.name}</strong> will be removed from this map view. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="dialog-actions">
                <Button variant="outline" onClick={() => setDialog(null)}>Keep mall</Button>
                <Button variant="destructive" onClick={deleteMall}>Delete marker</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      {notice && <div className="toast-message" role="status"><Check size={15} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><X size={14} /></button></div>}
    </div>
  );
}
