import React from 'react';
import { useParams, Link } from 'react-router-dom';

const EntityDetails = ({ entities }) => {
    const { id } = useParams();
    const entity = entities.find(e => String(e.Id) === id);

    if (!entity) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <h2>Chargement ou Entité non trouvée...</h2>
                <Link to="/" style={{ textDecoration: 'underline' }}>Retour à la carte</Link>
            </div>
        );
    }

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            overflowY: 'auto',
            backgroundColor: 'var(--brutal-bg)',
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto',
                backgroundColor: 'var(--brutal-white)',
                border: 'var(--brutal-border)',
                boxShadow: 'var(--brutal-shadow)',
                padding: '20px',
                minHeight: 'min-content'
            }}>
                <Link to="/" style={{
                    display: 'inline-block',
                    marginBottom: '20px',
                    fontWeight: 'bold',
                    textDecoration: 'none',
                    border: 'var(--brutal-border)',
                    padding: '10px 20px',
                    boxShadow: 'var(--brutal-shadow)',
                    backgroundColor: 'var(--brutal-white)'
                }}>
                    ← Retour
                </Link>

                <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', marginBottom: '10px', wordBreak: 'break-word' }}>{entity.title}</h1>

                <div style={{ display: 'grid', gap: '20px', marginTop: '30px' }}>

                    <Section title="Informations Générales">
                        <Field label="Adresse" value={entity.address} />
                        <Field label="Téléphone" value={entity.phoneNumber} />
                        <Field label="Site Web" value={entity.website} isLink />
                        <Field label="Google Maps" value={entity.Place} isLink labelLink="Voir sur la carte" />
                    </Section>

                    <Section title="Détails Prospection">
                        <Field label="Statut" value={entity.Statuts} />
                        <Field label="Type" value={entity.Type} />
                        <Field label="Référent" value={entity.Référent_partenariat_club || "Non attribué"} />
                        <Field label="Objet" value={entity.Objet} />
                        <Field label="Message" value={entity.Message} />
                        <Field label="Date Envoi Mail" value={entity.dateEnvoiMail} />
                        <Field label="Recette" value={entity.Recette ? `${entity.Recette} €` : null} />
                    </Section>

                </div>
            </div>
        </div>
    );
};

const Section = ({ title, children }) => (
    <div style={{ border: 'var(--brutal-border)', padding: '20px', boxShadow: 'var(--brutal-shadow)', backgroundColor: '#fff' }}>
        <h3 style={{ marginTop: 0, borderBottom: '3px solid #000', paddingBottom: '10px' }}>{title}</h3>
        <div style={{ display: 'grid', gap: '10px' }}>{children}</div>
    </div>
);

const Field = ({ label, value, isLink, labelLink }) => {
    if (!value) return null;
    return (
        <div>
            <span style={{ fontWeight: 'bold', display: 'block', fontSize: '0.9rem', color: '#666' }}>{label}</span>
            {isLink ? (
                <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brutal-black)', fontWeight: 'bold' }}>
                    {labelLink || value}
                </a>
            ) : (
                <span style={{ fontSize: '1.1rem' }}>{value}</span>
            )}
        </div>
    );
};

export default EntityDetails;
