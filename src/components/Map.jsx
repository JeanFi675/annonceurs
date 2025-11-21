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

const MapComponent = ({ entities }) => {
    // Center on Haute-Savoie (approx) - Zoom increased
    const position = [45.9, 6.1];

    return (
        <div style={{ height: '100%', width: '100%', border: 'var(--brutal-border)', boxShadow: 'var(--brutal-shadow)' }}>
            <MapContainer center={position} zoom={11} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {entities.map((entity) => {
                    // Extract coordinates
                    let lat, lng;

                    if (entity.Place) {
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
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    }
                    return null;
                })}
            </MapContainer>
        </div>
    );
};

export default MapComponent;
