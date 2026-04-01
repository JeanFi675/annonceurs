import React, { useEffect, useState } from 'react';
import { fetchTrackingData, fetchTombolaLots, updateTombolaLot, fetchTombolaConfig, saveTombolaConfig } from '../services/api';
import { Link } from 'react-router-dom';

const VALID_STATUSES = ['Confirmé (en attente de paiement)', 'Paiement effectué'];

const TombolaPlanning = ({ entities }) => {
    const [trackingData, setTrackingData] = useState([]);
    const [lots, setLots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState({});
    const [config, setConfig] = useState({ Id: null, Nb_Tickets: '', Tarif: '' });
    const [savingConfig, setSavingConfig] = useState(false);

    useEffect(() => {
        const load = async () => {
            const [tracking, allLots, cfg] = await Promise.all([
                fetchTrackingData('Tombola (Lots)'),
                fetchTombolaLots(),
                fetchTombolaConfig()
            ]);
            setTrackingData(tracking);
            setLots(allLots);
            if (cfg) setConfig({ Id: cfg.Id, Nb_Tickets: cfg.Nb_Tickets ?? '', Tarif: cfg.Tarif ?? '' });
            setLoading(false);
        };
        load();
    }, []);

    // Join tracking → entity (confirmed/paid only)
    const confirmedTracking = trackingData.filter(t => {
        const link = t.Link_Annonceur;
        const entityId = typeof link === 'object' && link !== null ? link.Id : link;
        const entity = entities.find(e => String(e.Id) === String(entityId));
        return entity && VALID_STATUSES.includes(entity.Statuts);
    });

    const getLots = (trackId) => lots.filter(l => l.Tombola_id === trackId);

    const handleSamediChange = async (lot, value) => {
        const nbSam = Math.min(Math.max(0, parseInt(value) || 0), lot.Quantite || 0);
        setLots(prev => prev.map(l => l.Id === lot.Id ? { ...l, Nb_Samedi: nbSam } : l));
        setSaving(prev => ({ ...prev, [lot.Id]: true }));
        try {
            await updateTombolaLot(lot.Id, { Nb_Samedi: nbSam });
        } finally {
            setSaving(prev => ({ ...prev, [lot.Id]: false }));
        }
    };

    // Totaux globaux
    const totaux = lots.reduce((acc, lot) => {
        const qte = parseInt(lot.Quantite) || 0;
        const sam = lot.Nb_Samedi === null || lot.Nb_Samedi === undefined ? null : parseInt(lot.Nb_Samedi);
        const dim = sam !== null ? qte - sam : null;
        const val = parseFloat(lot.Valeur_Unitaire) || 0;
        acc.totalLots += qte;
        acc.samLots += sam ?? 0;
        acc.dimLots += dim !== null ? Math.max(0, dim) : 0;
        acc.samVal += val * (sam ?? 0);
        acc.dimVal += val * (dim !== null ? Math.max(0, dim) : 0);
        acc.totalVal += val * qte;
        return acc;
    }, { totalLots: 0, samLots: 0, dimLots: 0, samVal: 0, dimVal: 0, totalVal: 0 });

    const pctSam = totaux.totalLots > 0 ? Math.round(totaux.samLots / totaux.totalLots * 100) : 0;
    const pctDim = totaux.totalLots > 0 ? Math.round(totaux.dimLots / totaux.totalLots * 100) : 0;

    const handleConfigBlur = async (field, value) => {
        const parsed = parseFloat(value) || null;
        const updated = { ...config, [field]: parsed ?? '' };
        setConfig(updated);
        setSavingConfig(true);
        try {
            const result = await saveTombolaConfig(config.Id, { [field]: parsed });
            if (!config.Id && result?.Id) setConfig(prev => ({ ...prev, Id: result.Id }));
        } finally {
            setSavingConfig(false);
        }
    };

    // Calculs tombola
    const nbTickets = parseFloat(config.Nb_Tickets) || 0;
    const tarif = parseFloat(config.Tarif) || 0;
    const gainTotal = nbTickets * 2 * tarif; // x2 pour Sam + Dim
    const totalLotsGlobal = totaux.totalLots;
    const totalTickets = nbTickets * 2;
    const pctGagnant = totalTickets > 0 ? (totalLotsGlobal / totalTickets * 100) : 0;

    if (loading) {
        return <div style={{ padding: '20px', fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.2rem', fontWeight: 'bold' }}>Chargement...</div>;
    }

    return (
        <div style={{ backgroundColor: 'var(--brutal-bg)', minHeight: '100vh', padding: '20px', fontFamily: 'Space Grotesk, sans-serif' }}>

            {/* Header */}
            <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <h1 style={{ fontSize: 'clamp(1.4rem, 5vw, 2.5rem)', margin: 0, textTransform: 'uppercase' }}>Répartition Tombola</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Link to="/suivi" style={{
                        backgroundColor: 'white', color: 'black', padding: '10px 20px',
                        textDecoration: 'none', fontWeight: 'bold', textTransform: 'uppercase',
                        border: '2px solid black', boxShadow: '4px 4px 0px rgba(0,0,0,0.2)'
                    }}>
                        Suivi
                    </Link>
                    <Link to="/" style={{
                        backgroundColor: 'var(--brutal-black)', color: 'white', padding: '10px 20px',
                        textDecoration: 'none', fontWeight: 'bold', textTransform: 'uppercase',
                        border: '2px solid transparent', boxShadow: '4px 4px 0px rgba(0,0,0,0.2)'
                    }}>
                        &larr; Carte
                    </Link>
                </div>
            </div>

            {/* Récap global - sticky */}
            <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px', backgroundColor: 'var(--brutal-bg)', paddingTop: '8px', paddingBottom: '8px' }}>
                {[
                    { label: 'Samedi', lots: totaux.samLots, val: totaux.samVal, pct: pctSam, color: '#e6a817', bg: '#fff3cd' },
                    { label: 'Dimanche', lots: totaux.dimLots, val: totaux.dimVal, pct: pctDim, color: '#17a2b8', bg: '#d1ecf1' }
                ].map(({ label, lots: nb, val, pct, color, bg }) => (
                    <div key={label} style={{
                        backgroundColor: bg, border: '3px solid black',
                        padding: '20px', boxShadow: '6px 6px 0px black'
                    }}>
                        <h2 style={{ margin: '0 0 10px', fontSize: '1.2rem', textTransform: 'uppercase' }}>{label}</h2>
                        <div style={{ fontSize: '2.5rem', fontWeight: '900', lineHeight: 1 }}>
                            {nb} <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>lots</span>
                        </div>
                        {val > 0 && (
                            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', marginTop: '6px' }}>
                                {val.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
                            </div>
                        )}
                        <div style={{ marginTop: '10px', height: '8px', backgroundColor: '#e0e0e0', border: '1px solid black' }}>
                            <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color }} />
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>{pct}% du total</div>
                    </div>
                ))}
            </div>

            {/* Calculateur */}
            <div style={{
                backgroundColor: 'var(--brutal-white)', border: 'var(--brutal-border)',
                boxShadow: 'var(--brutal-shadow)', padding: '20px', marginBottom: '30px'
            }}>
                <h2 style={{ margin: '0 0 16px', fontSize: '1.1rem', textTransform: 'uppercase', fontWeight: '900' }}>
                    Calculateur {savingConfig && <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#aaa' }}>enregistrement...</span>}
                </h2>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                            Nb tickets / journée
                        </label>
                        <input
                            type="number"
                            min="0"
                            defaultValue={config.Nb_Tickets}
                            onBlur={e => handleConfigBlur('Nb_Tickets', e.target.value)}
                            style={{ width: '120px', padding: '8px', border: '2px solid black', fontSize: '1rem', fontWeight: 'bold', borderRadius: 0 }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                            Tarif / ticket (€)
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="0.5"
                            defaultValue={config.Tarif}
                            onBlur={e => handleConfigBlur('Tarif', e.target.value)}
                            style={{ width: '120px', padding: '8px', border: '2px solid black', fontSize: '1rem', fontWeight: 'bold', borderRadius: 0 }}
                        />
                    </div>
                </div>

                {nbTickets > 0 && tarif > 0 && (
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '140px', backgroundColor: '#e8f5e9', border: '2px solid #4CAF50', padding: '14px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#2e7d32', marginBottom: '6px' }}>
                                Gain si tickets vendus
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: '900', lineHeight: 1 }}>
                                {gainTotal.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '4px' }}>
                                {nbTickets.toLocaleString('fr-FR')} tickets × 2 jours × {tarif} €
                            </div>
                        </div>
                        <div style={{ flex: 1, minWidth: '140px', backgroundColor: totalLotsGlobal > 0 ? '#fff3cd' : '#f5f5f5', border: `2px solid ${totalLotsGlobal > 0 ? '#e6a817' : '#ccc'}`, padding: '14px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#856404', marginBottom: '6px' }}>
                                % tickets gagnants
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: '900', lineHeight: 1 }}>
                                {pctGagnant.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '4px' }}>
                                {totalLotsGlobal} lots / {totalTickets.toLocaleString('fr-FR')} tickets
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Cartes par annonceur */}
            {confirmedTracking.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#999', fontSize: '1.1rem', border: '2px dashed #ccc' }}>
                    Aucun annonceur tombola confirmé.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {confirmedTracking.map(tracking => {
                        const link = tracking.Link_Annonceur;
                        const entityId = typeof link === 'object' && link !== null ? link.Id : link;
                        const entity = entities.find(e => String(e.Id) === String(entityId));
                        const cardLots = getLots(tracking.Id);
                        if (cardLots.length === 0) return null;

                        const cardSam = cardLots.reduce((s, l) => s + (parseInt(l.Nb_Samedi) || 0), 0);
                        const cardTotal = cardLots.reduce((s, l) => s + (parseInt(l.Quantite) || 0), 0);
                        const cardDim = cardTotal - cardSam;

                        return (
                            <div key={tracking.Id} style={{
                                backgroundColor: 'var(--brutal-white)',
                                border: 'var(--brutal-border)',
                                boxShadow: 'var(--brutal-shadow)',
                                padding: '20px'
                            }}>
                                {/* En-tête carte */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900' }}>{tracking.Titre}</h3>
                                        {entity?.Référent_partenariat_club && (
                                            <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '2px' }}>
                                                Réf. : <strong>{entity.Référent_partenariat_club}</strong>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.85rem' }}>
                                        <span style={{ backgroundColor: '#fff3cd', border: '1px solid #e6a817', padding: '3px 10px', fontWeight: 'bold' }}>
                                            Sam : {cardSam}
                                        </span>
                                        <span style={{ backgroundColor: '#d1ecf1', border: '1px solid #17a2b8', padding: '3px 10px', fontWeight: 'bold' }}>
                                            Dim : {Math.max(0, cardDim)}
                                        </span>
                                    </div>
                                </div>

                                {/* En-tête colonnes */}
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 0', borderBottom: '2px solid black', marginBottom: '4px' }}>
                                    <div style={{ flex: 1, fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Description</div>
                                    <div style={{ width: '32px', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center' }}>Tot.</div>
                                    <div style={{ width: '70px', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', backgroundColor: '#fff3cd', padding: '2px 4px' }}>Sam.</div>
                                    <div style={{ width: '32px', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center', backgroundColor: '#d1ecf1', padding: '2px 4px' }}>Dim.</div>
                                    <div style={{ width: '52px', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'right' }}>Val.</div>
                                </div>

                                {/* Lignes lots */}
                                {cardLots.map(lot => {
                                    const qte = parseInt(lot.Quantite) || 0;
                                    const sam = lot.Nb_Samedi === null || lot.Nb_Samedi === undefined ? '' : parseInt(lot.Nb_Samedi);
                                    const dim = sam !== '' ? qte - sam : '—';
                                    const isOverflow = typeof dim === 'number' && dim < 0;
                                    const val = parseFloat(lot.Valeur_Unitaire) || 0;

                                    return (
                                        <div key={lot.Id} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #eee' }}>
                                            <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: '500', wordBreak: 'break-word' }}>
                                                {lot.Description || <span style={{ color: '#aaa', fontStyle: 'italic' }}>—</span>}
                                            </div>
                                            <div style={{ width: '32px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem', flexShrink: 0 }}>{qte}</div>
                                            <div style={{ width: '70px', flexShrink: 0, backgroundColor: '#fff3cd', padding: '2px' }}>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={qte}
                                                    value={sam === '' ? '' : sam}
                                                    placeholder="0"
                                                    onChange={e => handleSamediChange(lot, e.target.value)}
                                                    style={{
                                                        width: '100%', padding: '5px 2px', textAlign: 'center',
                                                        border: '2px solid #e6a817', fontWeight: 'bold',
                                                        fontSize: '0.95rem', borderRadius: 0, boxSizing: 'border-box',
                                                        opacity: saving[lot.Id] ? 0.5 : 1
                                                    }}
                                                />
                                            </div>
                                            <div style={{
                                                width: '32px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem',
                                                flexShrink: 0, backgroundColor: '#d1ecf1', padding: '4px 2px',
                                                color: isOverflow ? 'red' : 'black'
                                            }}>
                                                {isOverflow ? '⚠' : dim}
                                            </div>
                                            <div style={{ width: '52px', textAlign: 'right', fontSize: '0.8rem', flexShrink: 0, color: val > 0 ? '#333' : '#bbb' }}>
                                                {val > 0 ? `${val.toLocaleString('fr-FR')} €` : '—'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TombolaPlanning;
