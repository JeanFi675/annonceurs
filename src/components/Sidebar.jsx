import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { createEntity, updateEntity } from '../services/api';
import { useLocation, useNavigate } from 'react-router-dom';

const Sidebar = ({ filters, setFilters, entities, refreshEntities, newLocation, setNewLocation, setIsAddMode }) => {
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
        acc[type] = (acc[type] || 0) + parseFloat(e.Recette);
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

    const location = useLocation();
    const navigate = useNavigate();

    // Effect to handle Edit Mode from EntityDetails
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
            setIsEditing(true);
            setEditingId(entity.Id);
            setShowAddModal(true);

            // Clear state so it doesn't re-trigger on refresh/nav
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);


    // Reverse geocoding function
    const reverseGeocode = async (lat, lng) => {
        try {
            // Using BigDataCloud free API to avoid Nominatim CORS/403 issues on localhost
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=fr`);
            const data = await response.json();
            if (data) {
                // Construct address from available fields
                const parts = [];
                if (data.locality) parts.push(data.locality);
                if (data.city && data.city !== data.locality) parts.push(data.city);
                if (data.postcode) parts.push(data.postcode);
                if (data.principalSubdivision) parts.push(data.principalSubdivision);

                const address = parts.join(', ');

                if (address) {
                    setFormData(prev => ({
                        ...prev,
                        address: address
                    }));
                }
            }
        } catch (e) {
            console.error('Reverse geocoding error:', e);
        }
    }
    // Effect to update form when a location is picked on map
    useEffect(() => {
        if (newLocation) {
            const googleMapsUrl = `https://www.google.com/maps?q=${newLocation.lat},${newLocation.lng}`;
            setFormData(prev => ({
                ...prev,
                gps: `${newLocation.lat};${newLocation.lng}`,
                Place: googleMapsUrl
            }));

            // Trigger reverse geocoding
            reverseGeocode(newLocation.lat, newLocation.lng);

            if (!showAddModal) {
                setShowAddModal(true);
            }
        }
    }, [newLocation]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
                await updateEntity(editingId, entityData);
                alert('Lieu modifié avec succès !');
            } else {
                await createEntity(entityData);
                alert('Lieu ajouté !');
            }

            setShowAddModal(false);
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
            setNewLocation(null); // Clear map marker
            setIsEditing(false);
            setEditingId(null);
            setIsAddMode(false); // Ensure add mode is off

            if (refreshEntities) refreshEntities();
        } catch (e) {
            const errorMsg = e.response?.data?.message || e.response?.data?.msg || e.message || 'Erreur lors de l\'opération';
            alert(`Erreur : ${errorMsg}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setNewLocation(null); // Clear temporary marker on cancel
        setIsEditing(false);
        setEditingId(null);
        setIsAddMode(false); // Ensure add mode is off
        // Reset form data on cancel to avoid stale data for next add
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

    const handleRelocate = () => {
        setShowAddModal(false);
        // Do NOT clear isEditing or editingId
        // Do NOT clear formData
        // Just hide modal so user can click map
        setIsAddMode(true); // Enable map clicking
        alert("Cliquez sur la carte pour définir la nouvelle position.");
    };

    return (
        <>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Filtres</h2>

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

            {/* Financial Summary Section */}
            {totalRevenue > 0 && (
                <div style={{ marginTop: '20px', borderTop: '2px solid black', paddingTop: '10px' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Suivi Financier</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '5px' }}>
                        <span>Total Recettes:</span>
                        <span>{totalRevenue.toLocaleString('fr-FR')} €</span>
                    </div>
                    <div style={{ fontSize: '0.9rem' }}>
                        {Object.entries(revenueByType).map(([type, amount]) => (
                            <div key={type} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                <span>{type}:</span>
                                <span>{amount.toLocaleString('fr-FR')} €</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ marginTop: '20px' }}>
                <p style={{ fontSize: '0.8rem', marginTop: '5px', color: '#666' }}>
                    Pour ajouter un lieu, activez le mode ajout (+) sur la carte et cliquez sur l'emplacement souhaité.
                </p>
            </div>

            {showAddModal && ReactDOM.createPortal(
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 10000
                }}>
                    <div style={{
                        backgroundColor: 'var(--brutal-white)', padding: '20px',
                        border: 'var(--brutal-border)', boxShadow: 'var(--brutal-shadow)',
                        width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto'
                    }}>
                        <h3 style={{ marginTop: 0 }}>{isEditing ? 'Modifier le lieu' : 'Ajouter un nouveau lieu'}</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                            <div>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                                    Nom du lieu <span style={{ color: 'red' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleFormChange}
                                    placeholder="Ex: Restaurant Le Gourmet"
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                                    Adresse
                                </label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleFormChange}
                                    placeholder="Ex: 123 Rue de la Paix, 74000 Annecy"
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                                    Téléphone
                                </label>
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleFormChange}
                                    placeholder="Ex: 04 50 12 34 56"
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                                    Lien Google Maps (Optionnel)
                                </label>
                                <input
                                    type="text"
                                    name="Place"
                                    value={formData.Place}
                                    onChange={handleFormChange}
                                    placeholder="https://maps.app.goo.gl/..."
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                                    Coordonnées GPS <span style={{ color: 'red' }}>*</span>
                                </label>
                                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        name="gps"
                                        value={formData.gps}
                                        readOnly
                                        placeholder="Cliquez sur la carte pour définir la position"
                                        style={{ width: '100%', backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                                    />
                                    {formData.gps && <span style={{ color: 'green' }}>✓</span>}
                                </div>
                                {isEditing && (
                                    <button
                                        onClick={handleRelocate}
                                        style={{ marginTop: '5px', fontSize: '0.8rem', padding: '5px', backgroundColor: '#ffeb3b', border: '1px solid black', cursor: 'pointer' }}
                                    >
                                        📍 Replacer sur la carte
                                    </button>
                                )}
                            </div>

                            <div>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                                    Site web
                                </label>
                                <input
                                    type="url"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleFormChange}
                                    placeholder="Ex: https://www.exemple.fr"
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                                    Statut
                                </label>
                                <select
                                    name="Statuts"
                                    value={formData.Statuts}
                                    onChange={handleFormChange}
                                    style={{ width: '100%' }}
                                >
                                    <option value="">Par défaut (À contacter)</option>
                                    {statusOptions.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                                    Type
                                </label>
                                <select
                                    name="Type"
                                    value={formData.Type}
                                    onChange={handleFormChange}
                                    style={{ width: '100%' }}
                                >
                                    <option value="">Non spécifié</option>
                                    {typeOptions.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                                    Référent
                                </label>
                                <input
                                    type="text"
                                    name="Referent"
                                    value={formData.Referent}
                                    onChange={handleFormChange}
                                    placeholder="Sélectionnez ou tapez un nom"
                                    list="referent-options"
                                    style={{ width: '100%' }}
                                />
                                <datalist id="referent-options">
                                    {referentOptions.map(opt => (
                                        <option key={opt} value={opt} />
                                    ))}
                                </datalist>
                            </div>

                            <div>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                                    Recette (€)
                                </label>
                                <input
                                    type="number"
                                    name="Recette"
                                    value={formData.Recette}
                                    onChange={handleFormChange}
                                    placeholder="Ex: 500"
                                    style={{ width: '100%' }}
                                    step="0.01"
                                    min="0"
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button onClick={handleCloseModal}>Annuler</button>
                            <button onClick={handleAddOrUpdate} disabled={isSubmitting} style={{ backgroundColor: 'var(--brutal-ice)' }}>
                                {isSubmitting ? (isEditing ? 'Modification...' : 'Ajout...') : (isEditing ? 'Enregistrer' : 'Ajouter')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <div style={{ marginTop: 'auto' }}>
                <p style={{ fontSize: '0.8rem' }}>
                    <strong>Total:</strong> {entities.length} entités <br />
                    <strong>Attribués:</strong> {entities.filter(e => e.Référent_partenariat_club).length} / {entities.length}
                </p>
            </div>
        </>
    );
};

export default Sidebar;
