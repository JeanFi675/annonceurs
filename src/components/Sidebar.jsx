import React from 'react';

const Sidebar = ({ filters, setFilters, entities }) => {
    // Extract unique values for filters
    const statusOptions = [...new Set(entities.map(e => e.Statuts).filter(Boolean))];
    const typeOptions = [...new Set(entities.map(e => e.Type).filter(Boolean))];

    // Extract Referents
    const referentOptions = [...new Set(entities.map(e => e.Référent_partenariat_club).filter(Boolean))];

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div style={{
            padding: '20px',
            backgroundColor: 'var(--brutal-white)',
            borderRight: 'var(--brutal-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            overflowY: 'auto',
            height: '100%'
        }}>
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

            <div style={{ marginTop: 'auto' }}>
                <p style={{ fontSize: '0.8rem' }}>
                    <strong>Total:</strong> {entities.length} entités
                </p>
            </div>
        </div>
    );
};

export default Sidebar;
