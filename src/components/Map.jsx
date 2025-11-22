import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Custom Neo-brutalist Marker Icons
const createCustomIcon = (isAssigned) => {
    const color = isAssigned ? '#4ade80' : '#ffffff'; // Green if assigned, White if not
    const borderColor = '#000000';

    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
      background-color: ${color};
      width: 20px;
      height: 20px;
      border: 3px solid ${borderColor};
      box-shadow: 3px 3px 0px ${borderColor};
      transform: rotate(45deg);
    "></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -10]
    });
};

import { useMapEvents } from 'react-leaflet';

import { useState } from 'react';

// Component to handle map events
const MapEvents = ({ onMapClick, isAddMode }) => {
    useMapEvents({
        click(e) {
            if (isAddMode) {
                onMapClick(e.latlng.lat, e.latlng.lng);
            }
        },
        contextmenu(e) {
            // Optional: allow right click to always add? Or respect mode?
            // Let's respect mode for consistency, or maybe allow right click as shortcut?
            // User asked for "clique long", contextmenu is close to that.
            // Let's allow contextmenu to ALWAYS add, as a power user feature?
            // Or stick to the requested "Add Mode" button for clarity.
            if (isAddMode) {
                onMapClick(e.latlng.lat, e.latlng.lng);
            }
        }
    });
    return null;
};

const MapComponent = ({ entities, onMapClick, newLocation, isAddMode, setIsAddMode }) => {
    // Center on Saint-Pierre-en-Faucigny
    // La Roche and Bonneville should be visible
    const position = [46.0608, 6.3725];

    const toggleAddMode = () => {
        setIsAddMode(!isAddMode);
    };

    return (
        <div style={{ height: '100%', width: '100%', border: 'var(--brutal-border)', boxShadow: 'var(--brutal-shadow)', position: 'relative' }}>
            <MapContainer
                center={position}
                zoom={12}
                style={{ height: '100%', width: '100%', cursor: isAddMode ? 'crosshair' : 'grab' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapEvents onMapClick={(lat, lng) => {
                    onMapClick(lat, lng);
                    setIsAddMode(false); // Exit add mode after picking
                }} isAddMode={isAddMode} />

                {newLocation && (
                    <Marker
                        position={[newLocation.lat, newLocation.lng]}
                        icon={createCustomIcon(false)}
                    >
                        <Popup>Nouveau lieu sélectionné</Popup>
                    </Marker>
                )}

                {entities.map((entity) => {
                    // Extract coordinates
                    let lat, lng;

                    if (entity.gps) {
                        // GeoData format is lat;lng
                        const parts = entity.gps.split(';');
                        if (parts.length === 2) {
                            lat = parseFloat(parts[0]);
                            lng = parseFloat(parts[1]);
                        } else {
                            // Fallback for comma if mixed
                            const partsComma = entity.gps.split(',');
                            if (partsComma.length === 2) {
                                lat = parseFloat(partsComma[0]);
                                lng = parseFloat(partsComma[1]);
                            }
                        }
                    }

                    if (!lat && !lng && entity.Place) {
                        const latMatch = entity.Place.match(/!3d(-?\d+\.\d+)/);
                        const lngMatch = entity.Place.match(/!4d(-?\d+\.\d+)/);

                        if (latMatch && lngMatch) {
                            lat = parseFloat(latMatch[1]);
                            lng = parseFloat(lngMatch[1]);
                        }
                    }

                    if (!lat && entity.Latitude) lat = entity.Latitude;
                    if (!lng && entity.Longitude) lng = entity.Longitude;

                    if (lat && lng) {
                        const isAssigned = !!entity.Référent_partenariat_club;

                        return (
                            <Marker
                                key={entity.Id}
                                position={[lat, lng]}
                                icon={createCustomIcon(isAssigned)}
                            >
                                <Popup>
                                    <div style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                        <strong style={{ fontSize: '1.1rem' }}>{entity.title}</strong><br />
                                        <span style={{ fontSize: '0.9rem', color: '#666' }}>{entity.address}</span><br />
                                        <div style={{ margin: '5px 0', borderTop: '1px solid #ccc', paddingTop: '5px' }}>
                                            <strong>Statut:</strong> {entity.Statuts}<br />
                                            <strong>Référent:</strong> {entity.Référent_partenariat_club || 'Non attribué'}
                                        </div>
                                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            {entity.Place && <a href={entity.Place} target="_blank" rel="noopener noreferrer">Voir sur Google Maps</a>}
                                            <Link to={`/entity/${entity.Id}`} style={{
                                                backgroundColor: 'var(--brutal-black)',
                                                color: 'var(--brutal-white)',
                                                padding: '5px 10px',
                                                textDecoration: 'none',
                                                textAlign: 'center',
                                                fontWeight: 'bold'
                                            }}>
                                                Voir la fiche
                                            </Link>
                                            <Link to="/" state={{ editEntity: entity }} style={{
                                                backgroundColor: '#ffeb3b',
                                                color: 'black',
                                                padding: '5px 10px',
                                                textDecoration: 'none',
                                                textAlign: 'center',
                                                fontWeight: 'bold',
                                                border: '1px solid black'
                                            }}>
                                                ✎ Modifier
                                            </Link>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    }
                    return null;
                })}
            </MapContainer>

            {/* Add Mode Toggle Button */}
            <button
                onClick={toggleAddMode}
                style={{
                    position: 'absolute',
                    bottom: '30px',
                    right: '30px',
                    zIndex: 1000,
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: isAddMode ? '#ff4d4d' : 'var(--brutal-ice)',
                    border: '3px solid black',
                    boxShadow: '4px 4px 0px black',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    transition: 'transform 0.1s'
                }}
                title={isAddMode ? "Annuler l'ajout" : "Ajouter un lieu"}
            >
                {isAddMode ? '×' : '+'}
            </button>
            {isAddMode && (
                <div style={{
                    position: 'absolute',
                    bottom: '100px',
                    right: '30px',
                    zIndex: 1000,
                    backgroundColor: 'white',
                    padding: '10px',
                    border: '2px solid black',
                    boxShadow: '3px 3px 0px black',
                    fontWeight: 'bold'
                }}>
                    Cliquez sur la carte pour placer le point
                </div>
            )}
        </div>
    );
};

export default MapComponent;
