import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { updateEntity } from '../services/api';

const EntityDetails = ({ entities, refreshEntities }) => {
    const { id } = useParams();
    const entity = entities.find(e => String(e.Id) === id);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!entity) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <h2>Chargement ou Entité non trouvée...</h2>
                <Link to="/" style={{ textDecoration: 'underline' }}>Retour à la carte</Link>
            </div>
        );
    }

    // Parse existing comments
    const parseComments = (commentsText) => {
        if (!commentsText) return [];

        const lines = commentsText.split('\n');
        const comments = [];
        let currentComment = null;

        lines.forEach(line => {
            // Check if line starts with a timestamp [...]
            const match = line.match(/^\[(.+?)\]\s*(.*)$/);
            if (match) {
                // New comment starts
                if (currentComment) {
                    comments.push(currentComment);
                }
                currentComment = {
                    timestamp: match[1],
                    text: match[2] || ''
                };
            } else if (currentComment && line.trim()) {
                // Continue previous comment (multi-line)
                currentComment.text += '\n' + line;
            }
        });

        // Don't forget the last comment
        if (currentComment) {
            comments.push(currentComment);
        }

        return comments;
    };

    const comments = parseComments(entity.Comments);

    const handleAddComment = async () => {
        if (!newComment.trim()) {
            alert('Veuillez saisir un commentaire.');
            return;
        }

        setIsSubmitting(true);
        try {
            const now = new Date();
            const timestamp = `${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
            const formattedComment = `[${timestamp}] ${newComment.trim()}`;

            const existingComments = entity.Comments || '';
            const updatedComments = existingComments
                ? `${existingComments}\n${formattedComment}`
                : formattedComment;

            await updateEntity(entity.Id, { Comments: updatedComments });

            setNewComment('');
            if (refreshEntities) await refreshEntities();
            alert('Commentaire ajouté avec succès !');
        } catch (error) {
            console.error('Error adding comment:', error);
            alert('Erreur lors de l\'ajout du commentaire.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="entity-details-container">
            <div className="entity-details-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <Link to="/" style={{
                        display: 'inline-block',
                        fontWeight: 'bold',
                        textDecoration: 'none',
                        border: 'var(--brutal-border)',
                        padding: '10px 20px',
                        boxShadow: 'var(--brutal-shadow)',
                        backgroundColor: 'var(--brutal-white)'
                    }}>
                        ← Retour
                    </Link>
                </div>

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
                        <Field label="Message" value={entity.Message} isHtml />
                        <Field label="Date Envoi Mail" value={entity.dateEnvoiMail} />
                        <Field label="Recette" value={entity.Recette ? `${entity.Recette} €` : null} />
                    </Section>

                    <Section title="Suivi des Démarches">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {/* Existing comments */}
                            {comments.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                                    {comments.map((comment, index) => (
                                        <div key={index} style={{
                                            padding: '10px',
                                            backgroundColor: '#f5f5f5',
                                            border: '2px solid #000',
                                            boxShadow: '2px 2px 0px #000'
                                        }}>
                                            <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '5px', fontWeight: 'bold' }}>
                                                {comment.timestamp}
                                            </div>
                                            <div style={{ fontSize: '1rem', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                                                {comment.text}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ color: '#666', fontStyle: 'italic' }}>Aucun commentaire pour le moment.</p>
                            )}

                            {/* Add new comment */}
                            <div style={{ marginTop: '10px', borderTop: '2px solid #000', paddingTop: '15px' }}>
                                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                                    Ajouter un commentaire
                                </label>
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Saisissez votre commentaire..."
                                    style={{
                                        width: '100%',
                                        minHeight: '80px',
                                        padding: '10px',
                                        border: '2px solid #000',
                                        fontFamily: 'inherit',
                                        fontSize: '1rem',
                                        resize: 'vertical'
                                    }}
                                />
                                <button
                                    onClick={handleAddComment}
                                    disabled={isSubmitting || !newComment.trim()}
                                    style={{
                                        marginTop: '10px',
                                        padding: '10px 20px',
                                        backgroundColor: 'var(--brutal-ice)',
                                        border: 'var(--brutal-border)',
                                        boxShadow: 'var(--brutal-shadow)',
                                        fontWeight: 'bold',
                                        cursor: isSubmitting || !newComment.trim() ? 'not-allowed' : 'pointer',
                                        opacity: isSubmitting || !newComment.trim() ? 0.5 : 1
                                    }}
                                >
                                    {isSubmitting ? 'Ajout en cours...' : 'Ajouter le commentaire'}
                                </button>
                            </div>
                        </div>
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

const Field = ({ label, value, isLink, labelLink, isHtml }) => {
    if (!value) return null;
    return (
        <div style={{ overflowWrap: 'break-word', wordWrap: 'break-word', maxWidth: '100%' }}>
            <span style={{ fontWeight: 'bold', display: 'block', fontSize: '0.9rem', color: '#666' }}>{label}</span>
            {isLink ? (
                <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brutal-black)', fontWeight: 'bold' }}>
                    {labelLink || value}
                </a>
            ) : isHtml ? (
                <div dangerouslySetInnerHTML={{ __html: value }} style={{ fontSize: '1.1rem' }} />
            ) : (
                <span style={{ fontSize: '1.1rem' }}>{value}</span>
            )}
        </div>
    );
};

export default EntityDetails;
