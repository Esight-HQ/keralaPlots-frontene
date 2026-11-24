"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../postProperty.module.css";
import SearchableSelect from "../../componants/searchableSelect/SearchableSelect";
import { KERALA_DISTRICTS, INDIAN_STATES, KERALA_LOCALITIES } from "../postPropertyData";
import {
    RiSearchLine,
    RiFocus3Line,
    RiMapPinLine,
    RiCloseLine,
} from "react-icons/ri";

export default function Step3Location({ formData, setFormData, showToast, onSelect }) {
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [searching, setSearching] = useState(false);

    const { location } = formData;

    // Auto-advancing to the next step should wait for the whole address, not
    // just the three required fields — otherwise a map click jumps ahead
    // while Village/Landmark/Pincode are still sitting blank.
    const isLocationComplete = (loc) =>
        Boolean(
            loc.state &&
                loc.district &&
                loc.locality?.trim() &&
                loc.village?.trim() &&
                loc.landmark?.trim() &&
                loc.pincode?.trim()
        );

    const updateLocationField = (field, value) => {
        setFormData((prev) => ({ ...prev, location: { ...prev.location, [field]: value } }));
    };

    const setLatLng = (lat, lng, address) => {
        setFormData((prev) => ({
            ...prev,
            location: { ...prev.location, lat, lng, address: address ?? prev.location.address },
        }));
        if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
        if (mapRef.current) mapRef.current.panTo([lat, lng]);
    };

    // Latest location, readable from async callbacks without going stale.
    const locationRef = useRef(location);
    useEffect(() => {
        locationRef.current = location;
    });
    // Each reverse-geocode gets an id; only the newest one may write, so a
    // slow response for an earlier click can't overwrite a later pin.
    const geocodeRequestRef = useRef(0);
    const [resolvingAddress, setResolvingAddress] = useState(false);

    // Picks the best locality name from a Nominatim address. Prefers a name
    // that exists in our locality list for the district (so the dropdown shows
    // a known option), then falls back to the most specific place name.
    const pickLocality = (address, displayName, district) => {
        const candidates = [
            address.suburb,
            address.neighbourhood,
            address.quarter,
            address.village,
            address.town,
            address.city_district,
            address.hamlet,
            address.city,
            address.municipality,
        ].filter(Boolean);
        const displayParts = (displayName || "")
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);

        const known = district ? KERALA_LOCALITIES[district] || [] : [];
        const norm = (v) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (known.length) {
            // Most specific name first; for each, accept an exact match or a
            // prefix match ("Kakkanad West" -> "Kakkanad") before moving on to
            // broader names like the municipality.
            // The full display name is only a last resort — it also contains
            // taluk/municipality names that aren't the pin's own locality.
            const names = candidates.length ? candidates : displayParts;
            for (const name of names) {
                const n = norm(name);
                const exact = known.find((k) => norm(k) === n);
                if (exact) return exact;
                const prefix = known.find((k) => norm(k).length >= 4 && n.startsWith(norm(k)));
                if (prefix) return prefix;
            }
        }
        return candidates[0] || "";
    };

    // Reverse-geocodes a pinned point and fills State/District/Locality/Village/
    // Pincode from it, so dropping the pin anywhere is enough to complete the
    // location step instead of requiring the dropdowns to be filled by hand.
    const reverseGeocodeAndFill = async (lat, lng) => {
        const requestId = ++geocodeRequestRef.current;
        setResolvingAddress(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`
            );
            if (!res.ok) throw new Error(`Reverse geocode failed: ${res.status}`);
            const data = await res.json();
            if (requestId !== geocodeRequestRef.current) return false; // a newer pin won
            if (!data || !data.address) {
                showToast("Couldn't read an address here — please pick the locality manually.");
                return false;
            }

            const address = data.address;
            const current = locationRef.current;
            const resolvedState = address.state || current.state || "Kerala";

            let resolvedDistrict = "";
            if (resolvedState === "Kerala") {
                for (const raw of [address.state_district, address.county, address.city]) {
                    if (!raw) continue;
                    const cleanName = raw.replace(/\s*district\s*/i, "").trim().toLowerCase();
                    const matched = KERALA_DISTRICTS.find((d) => d.toLowerCase() === cleanName);
                    if (matched) {
                        resolvedDistrict = matched;
                        break;
                    }
                }
            }
            const district = resolvedDistrict || current.district;
            const districtChanged = Boolean(resolvedDistrict) && resolvedDistrict !== current.district;

            const resolvedLocality = pickLocality(address, data.display_name, district);
            const resolvedVillage = address.village || address.hamlet || "";
            const resolvedPincode = /^\d{6}$/.test((address.postcode || "").replace(/\s/g, ""))
                ? address.postcode.replace(/\s/g, "")
                : "";

            // Only address fields — lat/lng were already set by the click/drag
            // and must not be overwritten with an older value here.
            const nextLocality = resolvedLocality || (districtChanged ? "" : current.locality || "");
            // Village/pincode typed for the previous spot don't belong to a
            // different locality — clear them instead of carrying them over.
            const localityChanged = nextLocality !== (current.locality || "");
            const patch = {
                state: resolvedState,
                district,
                // A locality from the old district is wrong for the new one.
                locality: nextLocality,
                village: resolvedVillage || (localityChanged ? "" : current.village || ""),
                pincode: resolvedPincode || (localityChanged ? "" : current.pincode || ""),
                address: data.display_name || current.address,
            };
            setFormData((prev) => ({ ...prev, location: { ...prev.location, ...patch } }));

            const merged = { ...current, ...patch };
            if (merged.state && merged.district && resolvedLocality) {
                if (isLocationComplete(merged)) {
                    showToast("Address populated successfully!");
                    if (onSelect) setTimeout(() => onSelect(), 1200);
                } else {
                    showToast(`📍 ${resolvedLocality} — add the remaining details to continue.`);
                }
                return true;
            }
            showToast("Couldn't detect the locality here — please select it from the list.");
            return false;
        } catch {
            if (requestId === geocodeRequestRef.current) {
                showToast("Couldn't fetch the address — check your connection or fill it in manually.");
            }
            return false;
        } finally {
            if (requestId === geocodeRequestRef.current) setResolvingAddress(false);
        }
    };

    // The map-click/marker-drag listeners are wired up once, inside a
    // mount-only effect below — this ref lets them always call the latest
    // reverseGeocodeAndFill (fresh formData/showToast/onSelect) instead of
    // being frozen to whatever closure existed on first mount.
    const reverseGeocodeAndFillRef = useRef(reverseGeocodeAndFill);
    useEffect(() => {
        reverseGeocodeAndFillRef.current = reverseGeocodeAndFill;
    });

    // Load Leaflet (same free, no-API-key tile stack used on the Properties
    // map) and initialize a single draggable marker once.
    useEffect(() => {
        const initMap = () => {
            const L = window.L;
            if (!L || mapRef.current) return;
            const mapDom = document.getElementById("post-property-map");
            if (!mapDom) return;

            const map = L.map("post-property-map", {
                center: [location.lat, location.lng],
                zoom: 13,
                zoomControl: true,
            });

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                subdomains: ["a", "b", "c"],
                maxZoom: 19,
            }).addTo(map);

            const marker = L.marker([location.lat, location.lng], { draggable: true }).addTo(map);
            marker.on("dragend", () => {
                const { lat, lng } = marker.getLatLng();
                setFormData((prev) => ({ ...prev, location: { ...prev.location, lat, lng } }));
                reverseGeocodeAndFillRef.current(lat, lng);
            });

            map.on("click", (e) => {
                marker.setLatLng(e.latlng);
                setFormData((prev) => ({ ...prev, location: { ...prev.location, lat: e.latlng.lat, lng: e.latlng.lng } }));
                reverseGeocodeAndFillRef.current(e.latlng.lat, e.latlng.lng);
            });

            mapRef.current = map;
            markerRef.current = marker;
        };

        if (!window.L) {
            if (!document.getElementById("leaflet-css")) {
                const link = document.createElement("link");
                link.id = "leaflet-css";
                link.rel = "stylesheet";
                link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
                document.head.appendChild(link);
            }
            if (!document.getElementById("leaflet-js")) {
                const script = document.createElement("script");
                script.id = "leaflet-js";
                script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
                script.onload = initMap;
                document.body.appendChild(script);
            } else {
                const checkReady = setInterval(() => {
                    if (window.L) {
                        clearInterval(checkReady);
                        initMap();
                    }
                }, 100);
            }
        } else {
            initMap();
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                markerRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Re-center the map when toggling fullscreen (container size changes,
    // Leaflet needs an explicit nudge to recalculate its viewport).
    useEffect(() => {
        if (mapRef.current) {
            setTimeout(() => mapRef.current.invalidateSize(), 200);
        }
    }, [isFullscreen]);

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            showToast("Geolocation isn't supported in this browser.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setLatLng(lat, lng);
                if (mapRef.current) mapRef.current.setView([lat, lng], 15);
                showToast("Pinned your current location. Fetching address details...");
                reverseGeocodeAndFill(lat, lng);
            },
            () => showToast("Couldn't access your location. You can drag the pin instead."),
            { timeout: 8000 }
        );
    };

    const districtOptions = location.state === "Kerala" ? KERALA_DISTRICTS : [];
    const localityOptions = useMemo(
        () => (location.district ? KERALA_LOCALITIES[location.district] || [] : []),
        [location.district]
    );

    // Look a place up and drop the pin on it, so picking from the dropdown
    // moves the map instead of leaving the marker somewhere unrelated.
    const centreMapOn = async (queryText, zoom) => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(queryText)}`
            );
            const data = await res.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                setLatLng(lat, lng, data[0].display_name);
                if (mapRef.current) mapRef.current.setView([lat, lng], zoom);
            }
        } catch {
            // Non-blocking: the field is still set, the pin just stays put.
        }
    };

    const handleStateChange = (nextState) => {
        // District and locality belong to the old state — clear them together
        // rather than leaving a mismatched pair behind.
        setFormData((prev) => ({
            ...prev,
            location: { ...prev.location, state: nextState, district: "", locality: "" },
        }));
    };

    const handleDistrictChange = (nextDistrict) => {
        setFormData((prev) => ({
            ...prev,
            location: { ...prev.location, district: nextDistrict, locality: "" },
        }));
        if (nextDistrict) centreMapOn(`${nextDistrict}, ${location.state}, India`, 11);
    };

    const handleLocalityChange = (nextLocality) => {
        updateLocationField("locality", nextLocality);
        if (nextLocality && location.district) {
            centreMapOn(`${nextLocality}, ${location.district}, ${location.state}, India`, 14);
            const merged = { ...location, locality: nextLocality };
            if (isLocationComplete(merged) && onSelect) {
                setTimeout(() => {
                    onSelect();
                }, 400);
            }
        }
    };

    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchContainerRef = useRef(null);

    // Debounced search suggestions for localities, cities, and landmarks
    useEffect(() => {
        if (!searchTerm.trim() || searchTerm.trim().length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        let active = true;
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=in&viewbox=74.8,12.8,77.5,8.2&q=${encodeURIComponent(
                        searchTerm.trim()
                    )}`
                );
                const data = await res.json();
                if (active && Array.isArray(data)) {
                    setSuggestions(data);
                    setShowSuggestions(data.length > 0);
                }
            } catch {
                if (active) setSuggestions([]);
            }
        }, 300);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [searchTerm]);

    // Close suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelectSuggestion = async (item) => {
        setShowSuggestions(false);
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        const mainName = item.name || (item.display_name ? item.display_name.split(",")[0] : searchTerm);

        setSearchTerm(mainName);
        setLatLng(lat, lng, item.display_name);

        if (mapRef.current) {
            mapRef.current.setView([lat, lng], 15);
        }

        showToast(`📍 Pinned to ${mainName}`);

        // Reverse geocode to populate district, locality, town, pincode
        const filled = await reverseGeocodeAndFill(lat, lng);

        // If it's a landmark or specific point of interest, fill landmark field
        if (item.type && !["administrative", "boundary", "postcode"].includes(item.type)) {
            updateLocationField("landmark", mainName);
        } else if (!filled) {
            updateLocationField("locality", mainName);
        }
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!searchTerm.trim()) return;
        setSearching(true);
        setShowSuggestions(false);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&countrycodes=in&viewbox=74.8,12.8,77.5,8.2&q=${encodeURIComponent(
                    searchTerm.trim()
                )}`
            );
            const data = await res.json();
            if (data && data.length > 0) {
                await handleSelectSuggestion(data[0]);
            } else {
                showToast(`No exact match for "${searchTerm}". You can click or drag the pin on map.`);
            }
        } catch {
            showToast("Search failed — check your connection and try again.");
        } finally {
            setSearching(false);
        }
    };

    return (
        <>
            <h2 className={styles.stepHeadline}>Where is your property located?</h2>
            <p className={styles.stepSubtext}>Search landmark/locality, use current location, or drag the pin.</p>

            <div className={styles.searchBarRow}>
                <div className={styles.searchInputContainer} ref={searchContainerRef}>
                    <form className={styles.searchInputWrap} onSubmit={handleSearch} role="search">
                        <RiMapPinLine style={{ flexShrink: 0 }} aria-hidden="true" />
                        <input
                            type="text"
                            placeholder="Search locality, city or landmark (e.g. Infopark, Lulu Mall, Pala)"
                            aria-label="Search locality, city or landmark"
                            enterKeyHint="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => {
                                if (suggestions.length > 0) setShowSuggestions(true);
                            }}
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", padding: 4 }}
                                onClick={() => {
                                    setSearchTerm("");
                                    setSuggestions([]);
                                    setShowSuggestions(false);
                                }}
                                title="Clear"
                            >
                                <RiCloseLine size={18} />
                            </button>
                        )}
                        <button
                            type="submit"
                            className={styles.searchIconBtn}
                            disabled={searching || !searchTerm.trim()}
                            aria-label={searching ? "Searching" : "Search"}
                            title="Search"
                        >
                            {searching ? <span className={styles.searchIconSpinner} aria-hidden="true" /> : <RiSearchLine size={18} />}
                        </button>
                    </form>

                    {/* Autocomplete Suggestions Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div className={styles.searchSuggestionsDropdown}>
                            {suggestions.map((item, idx) => {
                                const mainName = item.name || (item.display_name ? item.display_name.split(",")[0] : "");
                                const subName = item.display_name
                                    ? item.display_name.split(",").slice(1, 4).join(",").trim()
                                    : "";
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        className={styles.suggestionItem}
                                        onClick={() => handleSelectSuggestion(item)}
                                    >
                                        <RiMapPinLine className={styles.suggestionItemIcon} />
                                        <div className={styles.suggestionTextWrap}>
                                            <span className={styles.suggestionMainText}>{mainName}</span>
                                            {subName && <span className={styles.suggestionSubText}>{subName}</span>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <button type="button" className={styles.mapActionBtn} onClick={handleUseCurrentLocation}>
                    <RiFocus3Line /> Current Location
                </button>
            </div>

            <div className={`${styles.mapWrapper} ${isFullscreen ? styles.mapWrapperFullscreen : ""}`}>
                <div id="post-property-map" className={styles.mapContainer} />
                {/* <button
                    type="button"
                    className={styles.mapFullscreenBtn}
                    onClick={() => setIsFullscreen((f) => !f)}
                    aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen map"}
                >
                    {isFullscreen ? <RiCloseLine /> : <RiFullscreenLine />}
                </button> */}
                <span className={styles.mapHintPin}>
                    <RiMapPinLine />{" "}
                    {resolvingAddress ? "Fetching address…" : "Drag the pin or click the map to set the exact spot"}
                </span>
            </div>

            <div className={styles.fieldGrid}>
                <SearchableSelect
                    label="State"
                    value={location.state}
                    options={INDIAN_STATES}
                    placeholder="Select state"
                    searchPlaceholder="Search state…"
                    onChange={handleStateChange}
                />

                <SearchableSelect
                    id="field-district"
                    label="District"
                    required
                    value={location.district}
                    options={districtOptions}
                    placeholder="Select district"
                    searchPlaceholder="Search district…"
                    onChange={handleDistrictChange}
                    disabled={location.state !== "Kerala"}
                    helperText={location.state !== "Kerala" ? "District list currently covers Kerala only." : undefined}
                    emptyText="No district found"
                />

                <SearchableSelect
                    id="field-locality"
                    label="Locality"
                    required
                    value={location.locality}
                    options={localityOptions}
                    placeholder={location.district ? "Select locality" : "Choose a district first"}
                    searchPlaceholder="Search or type a locality…"
                    onChange={handleLocalityChange}
                    allowCustom
                    disabled={!location.district}
                    emptyText="Type to add your locality"
                />

                <div className={styles.field}>
                    <label className={styles.fieldLabel}>Village (optional)</label>
                    <input
                        type="text"
                        className={styles.textInput}
                        value={location.village}
                        onChange={(e) => updateLocationField("village", e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                if (isLocationComplete(location)) {
                                    if (onSelect) onSelect();
                                } else {
                                    showToast("Please fill in all the location fields first.");
                                }
                            }
                        }}
                    />
                </div>
                <div className={styles.field}>
                    <label className={styles.fieldLabel}>Landmark (optional)</label>
                    <input
                        type="text"
                        className={styles.textInput}
                        placeholder="e.g. Near Metro Station, Opp. Temple"
                        value={location.landmark}
                        onChange={(e) => updateLocationField("landmark", e.target.value)}
                        onBlur={() => {
                            if (location.landmark?.trim()) {
                                centreMapOn(`${location.landmark.trim()}, ${location.locality || location.district || "Kerala"}, India`, 15);
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                if (location.landmark?.trim()) {
                                    centreMapOn(`${location.landmark.trim()}, ${location.locality || location.district || "Kerala"}, India`, 15);
                                }
                                if (isLocationComplete(location)) {
                                    if (onSelect) onSelect();
                                }
                            }
                        }}
                    />
                </div>
                <div className={styles.field}>
                    <label className={styles.fieldLabel}>Pincode (optional)</label>
                    <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        className={styles.textInput}
                        value={location.pincode}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                            updateLocationField("pincode", val);
                            const merged = { ...location, pincode: val };
                            if (val.length === 6 && isLocationComplete(merged) && onSelect) {
                                setTimeout(() => {
                                    onSelect();
                                }, 400);
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                if (isLocationComplete(location)) {
                                    if (onSelect) onSelect();
                                } else {
                                    showToast("Please fill in all the location fields first.");
                                }
                            }
                        }}
                    />
                </div>
            </div>

            {location.locality && location.district && (
                <div className={styles.locationPreviewCard}>
                    <span className={styles.locationPreviewIcon}>
                        <RiMapPinLine />
                    </span>
                    <span className={styles.locationPreviewText}>
                        {location.locality}, {location.district}, {location.state}
                        {location.pincode ? ` – ${location.pincode}` : ""}
                    </span>
                </div>
            )}
        </>
    );
}
