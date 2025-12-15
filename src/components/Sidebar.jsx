import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
// ... (previous imports)
import { createEntity, updateEntity, createTrackingRecord } from '../services/api';

// ...

const handleAddOrUpdate = async () => {
    if (isSubmitting) return;

    if (!formData.gps) {
        alert('Il est impératif d\'avoir un point GPS. Veuillez géolocaliser l\'adresse ou cliquer sur la carte.');
        return;
    }
    if (!formData.title) {
        alert('Le nom du lieu est obligatoire.');
        return;
    }

    setIsSubmitting(true);
    try {
        const entityData = {
            title: formData.title,
            Statuts: formData.Statuts || "À contacter",
            gps: formData.gps
        };

        // Add optional fields only if they have values
        if (formData.Place) entityData.Place = formData.Place;
        if (formData.address) entityData.address = formData.address;
        if (formData.phoneNumber) entityData.phoneNumber = formData.phoneNumber;
        if (formData.website) entityData.website = formData.website;
        if (formData.Type) entityData.Type = formData.Type;
        if (formData.Referent) entityData.Référent_partenariat_club = formData.Referent;
        if (formData.Recette) entityData.Recette = parseFloat(formData.Recette);

        if (isEditing && editingId) {
            // Automatic Logging
            const originalEntity = entities.find(e => e.Id === editingId);
            if (originalEntity) {
                const changes = [];
                if (entityData.Statuts !== originalEntity.Statuts) changes.push(`Statut: ${originalEntity.Statuts || 'Vide'} -> ${entityData.Statuts}`);
                if (entityData.Type !== originalEntity.Type) changes.push(`Type: ${originalEntity.Type || 'Vide'} -> ${entityData.Type}`);
                if (entityData.Recette !== originalEntity.Recette) changes.push(`Recette: ${originalEntity.Recette || 0} -> ${entityData.Recette}`);

                if (changes.length > 0) {
                    const now = new Date();
                    const timestamp = `${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
                    const logMessage = `[${timestamp}] Modification système:\n${changes.join('\n')}`;
                    const existingComments = originalEntity.Comments || '';
                    entityData.Comments = existingComments ? `${existingComments}\n${logMessage}` : logMessage;
                }
            }

            await updateEntity(editingId, entityData);

            // Attempt to create tracking if Type is set (and wasn't before, or just ensuring it exists)
            // Note: Ideally we check if it exists, but for now we rely on the Suivi page lazy load or user action.
            // However, user asked for "modification" trigger. 
            // Creating blindly might duplicate if logic isn't robust, so we proceed with caution:
            // We ONLY do it for CREATION below. For modification, we assume the user manages it via Suivi.

            alert('Lieu modifié avec succès !');
        } else {
            // Automatic Logging for Creation
            const now = new Date();
            const timestamp = `${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
            entityData.Comments = `[${timestamp}] Création du lieu`;

            const createdEntity = await createEntity(entityData);

            // --- AUTO TRACKING CREATION ---
            if (createdEntity && createdEntity.Id && entityData.Type) {
                // Try to init tracking record
                try {
                    console.log("Auto-creating tracking record for:", entityData.Type);
                    await createTrackingRecord(entityData.Type, {
                        Link_Annonceur: createdEntity.Id,
                        Titre: createdEntity.title || 'Suivi'
                    });
                } catch (trackError) {
                    console.error("Auto-tracking failed (non-blocking):", trackError);
                }
            }

            alert('Lieu ajouté !');
        }

        handleCloseModal();

        // Restore sidebar on mobile
        if (setIsSidebarHidden && window.innerWidth <= 768) {
            setIsSidebarHidden(false);
        }

        if (refreshEntities) refreshEntities();
    } catch (e) {
        const errorMsg = e.response?.data?.message || e.response?.data?.msg || e.message || 'Erreur lors de l\'opération';
        alert(`Erreur : ${errorMsg}`);
        handleCloseModal();
    } finally {
        setIsSubmitting(false);
    }
};
import { useLocation, useNavigate, Link } from 'react-router-dom';
import ReferentEntitiesList from './ReferentEntitiesList';
import axios from 'axios';

const Sidebar = ({ filters, setFilters, entities, refreshEntities, newLocation, setNewLocation, setIsAddMode, isMapHidden, setIsMapHidden, setIsSidebarHidden, userRole }) => {
    // Define all possible options from NocoDB schema
    const allStatusOptions = ['À contacter', 'En discussion', 'Confirmé (en attente de paiement)', 'Paiement effectué', 'Refusé', 'Sans réponse'];
    const allTypeOptions = ['Encart Pub', 'Tombola (Lots)', 'Partenaires', 'Mécénat', 'Stand'];

    // Extract unique values for filters (merge with schema options)
    const statusOptions = [...new Set([...allStatusOptions, ...entities.map(e => e.Statuts).filter(Boolean)])];
    const typeOptions = [...new Set([...allTypeOptions, ...entities.map(e => e.Type).filter(Boolean)])];

    // Extract Referents
    const referentOptions = [...new Set(entities.map(e => e.Référent_partenariat_club).filter(Boolean))];

    // Calculate Financial Summary
    const entitiesWithRevenue = entities.filter(e => e.Recette && parseFloat(e.Recette) > 0);
    const totalRevenue = entitiesWithRevenue.reduce((sum, e) => sum + parseFloat(e.Recette), 0);

    // Group revenue by Type
    const revenueByType = entitiesWithRevenue.reduce((acc, e) => {
        const type = e.Type || 'Non spécifié';
        if (!acc[type]) {
            acc[type] = { amount: 0, count: 0 };
        }
        acc[type].amount += parseFloat(e.Recette);
        acc[type].count += 1;
        return acc;
    }, {});

    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({
        Place: '',
        title: '',
        address: '',
        phoneNumber: '',
        website: '',
        Statuts: '',
        Type: '',
        Referent: '',
        Recette: '',
        gps: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isDetectingLocation, setIsDetectingLocation] = useState(false);

    // Nearby Places Search State
    const [showPlaceSelector, setShowPlaceSelector] = useState(false);
    const [nearbyPlaces, setNearbyPlaces] = useState([]);
    const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);



    // Toggle for secondary details
    const [showDetails, setShowDetails] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Reset filters on load if needed or handle initial state
    // ...

    useEffect(() => {
        if (location.state && location.state.editEntity) {
            const entity = location.state.editEntity;
            setFormData({
                Place: entity.Place || '',
                title: entity.title || '',
                address: entity.address || '',
                phoneNumber: entity.phoneNumber || '',
                website: entity.website || '',
                Statuts: entity.Statuts || '',
                Type: entity.Type || '',
                Referent: entity.Référent_partenariat_club || '',
                Recette: entity.Recette || '',
                gps: entity.gps || ''
            });
            setEditingId(entity.Id);
            setIsEditing(true);
            setShowAddModal(true);
            // Clear state so it doesn't reopen on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location, navigate]);

    useEffect(() => {
        if (newLocation) {
            setFormData(prev => ({
                ...prev,
                gps: `${newLocation.lat};${newLocation.lng}`
            }));

            // Trigger address lookup immediately (User request: restore original behavior)
            reverseGeocode(newLocation.lat, newLocation.lng);

            // Trigger nearby places search
            fetchNearbyPlaces(newLocation.lat, newLocation.lng);
            setShowPlaceSelector(true);
        }
    }, [newLocation]);

    const fetchNearbyPlaces = async (lat, lng) => {
        setIsLoadingPlaces(true);
        setNearbyPlaces([]);
        try {
            const query = `
                [out:json];
                (
                  node(around:50,${lat},${lng})["name"];
                  way(around:50,${lat},${lng})["name"];
                );
                out center;
            `;
            const response = await axios.get(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
            const places = response.data.elements.filter(el => {
                if (!el.tags || !el.tags.name) return false;
                const { amenity, shop, tourism, leisure, craft, office } = el.tags;

                // Filter: Must have a relevant type (amenity, shop, etc.)
                if (!amenity && !shop && !tourism && !leisure && !craft && !office) return false;

                // Explicit exclude parking
                if (amenity === 'parking') return false;

                return true;
            });
            setNearbyPlaces(places);
        } catch (error) {
            console.error("Error fetching nearby places:", error);
            // Fallback or just show empty list
        } finally {
            setIsLoadingPlaces(false);
        }
    };

    const formatPlaceSubtitle = (tags) => {
        return tags.amenity || tags.shop || tags.tourism || tags.leisure || tags.craft || tags.office || 'Lieu';
    };

    const handleSelectPlace = (place) => {
        let lat = place.lat;
        let lon = place.lon;
        if (!lat && place.center) {
            lat = place.center.lat;
            lon = place.center.lon;
        }

        const addressFromTags = place.tags['addr:street']
            ? `${place.tags['addr:housenumber'] || ''} ${place.tags['addr:street']}, ${place.tags['addr:city'] || ''}`
            : '';

        setFormData(prev => ({
            ...prev,
            title: place.tags.name || '',
            // address: We rely on the API call below, or the one from useEffect. 
            // We do NOT overwrite it with OSM tags often missing number.
            website: place.tags.website || '',
            phoneNumber: place.tags.phone || place.tags['contact:phone'] || '',
            gps: (lat && lon) ? `${lat};${lon}` : prev.gps
        }));

        // Always refresh address from API using exact POI coordinates for best precision
        if (lat && lon) {
            reverseGeocode(lat, lon);
        } else if (newLocation) {
            reverseGeocode(newLocation.lat, newLocation.lng);
        }

        setShowPlaceSelector(false);
        setShowAddModal(true);
    };

    const handleManualAdd = () => {
        setShowPlaceSelector(false);
        setFormData(prev => ({
            ...prev,
            title: '',
            address: '',
            website: '',
            phoneNumber: ''
        }));

        if (newLocation) {
            reverseGeocode(newLocation.lat, newLocation.lng);
        }

        setShowAddModal(true);
    };

    const handleCancelPlaceSelection = () => {
        setShowPlaceSelector(false);
        setNewLocation(null); // Cancel the whole add action
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setShowPlaceSelector(false);
        setFormToInitial();
        setNewLocation(null);
        setIsEditing(false);
        setEditingId(null);
    };

    const setFormToInitial = () => {
        setFormData({
            Place: '',
            title: '',
            address: '',
            phoneNumber: '',
            website: '',
            Statuts: '',
            Type: '',
            Referent: '',
            Recette: '',
            gps: ''
        });
    };

    const handleAddOrUpdate = async () => {
        if (isSubmitting) return;

        if (!formData.gps) {
            alert('Il est impératif d\'avoir un point GPS. Veuillez géolocaliser l\'adresse ou cliquer sur la carte.');
            return;
        }
        if (!formData.title) {
            alert('Le nom du lieu est obligatoire.');
            return;
        }

        setIsSubmitting(true);
        try {
            const entityData = {
                title: formData.title,
                Statuts: formData.Statuts || "À contacter",
                gps: formData.gps
            };

            // Add optional fields only if they have values
            if (formData.Place) entityData.Place = formData.Place;
            if (formData.address) entityData.address = formData.address;
            if (formData.phoneNumber) entityData.phoneNumber = formData.phoneNumber;
            if (formData.website) entityData.website = formData.website;
            if (formData.Type) entityData.Type = formData.Type;
            if (formData.Referent) entityData.Référent_partenariat_club = formData.Referent;
            if (formData.Recette) entityData.Recette = parseFloat(formData.Recette);

            if (isEditing && editingId) {
                // Automatic Logging
                const originalEntity = entities.find(e => e.Id === editingId);
                if (originalEntity) {
                    const changes = [];
                    if (entityData.Statuts !== originalEntity.Statuts) changes.push(`Statut: ${originalEntity.Statuts || 'Vide'} -> ${entityData.Statuts}`);
                    if (entityData.Type !== originalEntity.Type) changes.push(`Type: ${originalEntity.Type || 'Vide'} -> ${entityData.Type}`);
                    if (entityData.Recette !== originalEntity.Recette) changes.push(`Recette: ${originalEntity.Recette || 0} -> ${entityData.Recette}`);

                    if (changes.length > 0) {
                        const now = new Date();
                        const timestamp = `${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
                        const logMessage = `[${timestamp}] Modification système:\n${changes.join('\n')}`;
                        const existingComments = originalEntity.Comments || '';
                        entityData.Comments = existingComments ? `${existingComments}\n${logMessage}` : logMessage;
                    }
                }

                await updateEntity(editingId, entityData);
                alert('Lieu modifié avec succès !');
            } else {
                // Automatic Logging for Creation
                const now = new Date();
                const timestamp = `${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
                entityData.Comments = `[${timestamp}] Création du lieu`;

                await createEntity(entityData);
                alert('Lieu ajouté !');
            }

            handleCloseModal();

            // Restore sidebar on mobile
            if (setIsSidebarHidden && window.innerWidth <= 768) {
                setIsSidebarHidden(false);
            }

            if (refreshEntities) refreshEntities();
        } catch (e) {
            const errorMsg = e.response?.data?.message || e.response?.data?.msg || e.message || 'Erreur lors de l\'opération';
            alert(`Erreur : ${errorMsg}`);
            handleCloseModal();
        } finally {
            setIsSubmitting(false);
        }
    };

    const reverseGeocode = async (lat, lng) => {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            if (data && data.address) {
                const addr = data.address;
                const formattedAddress = `${addr.house_number ? addr.house_number + ' ' : ''}${addr.road || ''}, ${addr.postcode || ''} ${addr.city || addr.town || addr.village || ''}`;
                setFormData(prev => ({
                    ...prev,
                    address: formattedAddress.replace(/^, /, '')
                }));
            }
        } catch (error) {
            console.error("Reverse geocoding error:", error);
        }
    };

    const detectUserLocation = () => {
        if (!navigator.geolocation) {
            alert("La géolocalisation n'est pas supportée par votre navigateur.");
            return;
        }

        setIsDetectingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
                setFormData(prev => ({
                    ...prev,
                    gps: `${latitude};${longitude}`,
                    // Place: googleMapsUrl // We mainly want gps
                }));

                // Trigger reverse geocoding
                reverseGeocode(latitude, longitude);

                setIsDetectingLocation(false);
                alert("Position détectée avec succès !");
            },
            (error) => {
                console.error('Geolocation error:', error);
                let errorMessage = "Impossible de détecter votre position.";
                alert(errorMessage);
                setIsDetectingLocation(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Filtres</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {userRole === 'ADMIN' && (
                        <>
                            <Link to="/dashboard" style={{ fontSize: '0.9rem', textDecoration: 'underline', color: 'red', fontWeight: 'bold' }}>
                                Dashboard
                            </Link>
                            <Link to="/suivi" style={{ fontSize: '0.9rem', textDecoration: 'underline', color: 'blue', fontWeight: 'bold' }}>
                                Suivi
                            </Link>
                        </>
                    )}
                    <Link to="/history" style={{ fontSize: '0.9rem', textDecoration: 'underline', color: 'var(--brutal-black)' }}>
                        Historique
                    </Link>
                </div>
            </div>

            {/* Mobile Map Toggle */}
            <button
                className="mobile-map-toggle"
                onClick={() => setIsMapHidden(!isMapHidden)}
                style={{
                    marginBottom: '15px',
                    width: '100%',
                    padding: '10px',
                    backgroundColor: isMapHidden ? 'var(--brutal-ice)' : 'var(--brutal-white)',
                }}
            >
                {isMapHidden ? '🗺️ Afficher la carte' : '📋 Masquer la carte'}
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontWeight: 'bold' }}>Recherche</label>
                <input
                    type="text"
                    name="Search"
                    placeholder="Nom ou adresse..."
                    value={filters.Search || ''}
                    onChange={handleFilterChange}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontWeight: 'bold' }}>Statut</label>
                <select name="Statuts" value={filters.Statuts || ''} onChange={handleFilterChange}>
                    <option value="">Tous</option>
                    {statusOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontWeight: 'bold' }}>Type</label>
                <select name="Type" value={filters.Type || ''} onChange={handleFilterChange}>
                    <option value="">Tous</option>
                    {typeOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontWeight: 'bold' }}>Référent</label>
                <select name="Referent" value={filters.Referent || ''} onChange={handleFilterChange}>
                    <option value="">Tous</option>
                    <option value="Non attribué">Non attribué</option>
                    {referentOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>

            {/* Assigned Entities List */}
            {
                filters.Referent && filters.Referent !== 'Non attribué' && (() => {
                    const assignedEntities = entities.filter(e => e.Référent_partenariat_club === filters.Referent);
                    // Simple sort
                    const sortedEntities = [...assignedEntities].sort((a, b) => (a.title || '').localeCompare(b.title || ''));

                    return sortedEntities.length > 0 && (
                        <ReferentEntitiesList entities={sortedEntities} referentName={filters.Referent} />
                    );
                })()
            }

            {/* Financial Summary Section */}
            {
                totalRevenue > 0 && (
                    <div style={{ marginTop: '20px', borderTop: '2px solid black', paddingTop: '10px' }}>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Suivi Financier</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '5px' }}>
                            <span>Total Recettes:</span>
                            <span>{totalRevenue.toLocaleString('fr-FR')} €</span>
                        </div>
                        <div style={{ fontSize: '0.9rem' }}>
                            {Object.entries(revenueByType).map(([type, data]) => (
                                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                    <span>{type} ({data.count}):</span>
                                    <span>{data.amount.toLocaleString('fr-FR')} €</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            <div style={{ marginTop: 'auto' }}>
                <p style={{ fontSize: '0.8rem' }}>
                    <strong>Total:</strong> {entities.length} entités <br />
                    <strong>Attribués:</strong> {entities.filter(e => e.Référent_partenariat_club).length} / {entities.length}
                </p>
            </div>

            {/* Add / Edit Modal */}
            {showAddModal && ReactDOM.createPortal(
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 10000
                }}>
                    <div className="add-modal" style={{
                        backgroundColor: 'var(--brutal-white)', padding: '20px',
                        border: 'var(--brutal-border)', boxShadow: 'var(--brutal-shadow)',
                        width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto'
                    }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', textTransform: 'uppercase' }}>
                            {isEditing ? 'MODIFIER LE LIEU' : 'AJOUTER UN NOUVEAU LIEU'}
                        </h2>

                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Nom du lieu *</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleFormChange}
                                required
                                placeholder="Ex: Restaurant Le Gourmet"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Référent</label>
                            <select name="Referent" value={formData.Referent} onChange={handleFormChange} style={{ width: '100%' }}>
                                <option value="">Non attribué</option>
                                {referentOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Statut</label>
                            <select name="Statuts" value={formData.Statuts} onChange={handleFormChange} style={{ width: '100%' }}>
                                <option value="">Par défaut (À contacter)</option>
                                {allStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Type</label>
                            <select name="Type" value={formData.Type} onChange={handleFormChange} style={{ width: '100%' }}>
                                <option value="">Sélectionner...</option>
                                {allTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Recette (€)</label>
                            <input
                                type="number"
                                name="Recette"
                                value={formData.Recette}
                                onChange={handleFormChange}
                                step="0.01"
                                min="0"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Coordonnées GPS *</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <input
                                    type="text"
                                    name="gps"
                                    value={formData.gps || ''}
                                    onChange={handleFormChange}
                                    readOnly
                                    style={{ width: '100%', backgroundColor: '#eee' }}
                                />
                                {formData.gps && <span style={{ color: 'green', fontSize: '1.2rem' }}>✓</span>}
                            </div>
                        </div>

                        {!isEditing && (
                            <button
                                type="button"
                                onClick={detectUserLocation}
                                disabled={isDetectingLocation}
                                style={{
                                    marginBottom: '15px',
                                    fontSize: '0.9rem',
                                    width: '100%',
                                    backgroundColor: 'var(--brutal-ice)',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <span style={{ fontSize: '1.2rem' }}>📍</span>
                                {isDetectingLocation ? 'Localisation...' : 'Me localiser'}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setShowDetails(!showDetails)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                marginBottom: '15px',
                                backgroundColor: '#f0f0f0',
                                border: '1px solid black',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                textAlign: 'left',
                                display: 'flex',
                                justifyContent: 'space-between'
                            }}
                        >
                            <span>{showDetails ? 'Masquer les détails' : 'Plus de détails (Adresse, Contact...)'}</span>
                            <span>{showDetails ? '▲' : '▼'}</span>
                        </button>

                        {showDetails && (
                            <div style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '15px', backgroundColor: '#fafafa' }}>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Téléphone</label>
                                    <input
                                        type="text"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleFormChange}
                                        placeholder="Ex: 04 50 12 34 56"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Adresse</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleFormChange}
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Site web</label>
                                    <input
                                        type="text"
                                        name="website"
                                        value={formData.website}
                                        onChange={handleFormChange}
                                        placeholder="Ex: https://www.exemple.fr"
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Lien Google Maps (Optionnel)</label>
                                    <input
                                        type="text"
                                        name="Place"
                                        value={formData.Place}
                                        onChange={handleFormChange}
                                        placeholder="https://www.google.com/maps?q=..."
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                        )}


                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button onClick={handleCloseModal} style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>Annuler</button>
                            <button onClick={handleAddOrUpdate} disabled={isSubmitting} style={{ backgroundColor: 'var(--brutal-ice)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                {isSubmitting ? (isEditing ? 'Modification...' : 'Ajout...') : (isEditing ? 'Enregistrer' : 'Ajouter')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Place Selector Modal - Kept as requested for functionality */}
            {showPlaceSelector && ReactDOM.createPortal(
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 10001
                }}>
                    <div style={{
                        backgroundColor: 'var(--brutal-white)', padding: '20px',
                        border: 'var(--brutal-border)', boxShadow: 'var(--brutal-shadow)',
                        width: '90%', maxWidth: '400px', maxHeight: '80vh', overflowY: 'auto'
                    }}>
                        <h3 style={{ marginTop: 0 }}>Lieux à proximité</h3>
                        <p style={{ fontSize: '0.9rem', color: '#666' }}>
                            Sélectionnez un lieu pour préremplir la fiche, ou créez-le manuellement.
                        </p>

                        {isLoadingPlaces ? (
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                Chargement des lieux... (Overpass API)
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                {nearbyPlaces.length > 0 ? (
                                    nearbyPlaces.map((place, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSelectPlace(place)}
                                            style={{
                                                padding: '10px',
                                                textAlign: 'left',
                                                border: '1px solid #ccc',
                                                backgroundColor: 'white',
                                                cursor: 'pointer',
                                                borderRadius: '4px'
                                            }}
                                        >
                                            <strong>{place.tags.name}</strong>
                                            <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                                {formatPlaceSubtitle(place.tags)}
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div style={{ padding: '10px', textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                                        Aucun lieu commercial identifié à proximité immédiate.
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ borderTop: '1px solid #ccc', paddingTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                onClick={handleManualAdd}
                                style={{
                                    padding: '10px',
                                    backgroundColor: 'var(--brutal-ice)',
                                    border: '2px solid black',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                ✍️ Pas dans la liste ? Créer manuellement
                            </button>
                            <button
                                onClick={handleCancelPlaceSelection}
                                style={{
                                    padding: '8px',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    textDecoration: 'underline',
                                    cursor: 'pointer'
                                }}
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default Sidebar;
