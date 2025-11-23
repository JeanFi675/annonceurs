import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { updateEntity } from '../services/api';
import ReactDOM from 'react-dom';

const EntityDetails = ({ entities, refreshEntities }) => {
    const { id } = useParams();
    const entity = entities.find(e => String(e.Id) === id);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [formData, setFormData] = useState({
        Statuts: '',
        Type: '',
        Recette: ''
    });

    // Options (should ideally be shared or fetched, but hardcoding for now based on Sidebar)
    const allStatusOptions = ['À contacter', 'En discussion', 'Confirmé (en attente de paiement)', 'Paiement effectué', 'Refusé', 'Sans réponse'];
    const allTypeOptions = ['Encart Pub', 'Tombola (Lots)', 'Partenaires', 'Mécénat', 'Stand'];

    useEffect(() => {
        if (entity) {
            setFormData({
                Statuts: entity.Statuts || '',
                Type: entity.Type || '',
                Recette: entity.Recette || ''
            });
        }
    }, [entity]);

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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveClick = () => {
        setShowConfirmModal(true);
    };

    const handleConfirmUpdate = async () => {
        setIsSubmitting(true);
        try {
            const updateData = {
                Statuts: formData.Statuts,
                Type: formData.Type,
                Recette: formData.Recette ? parseFloat(formData.Recette) : null
            };

            await updateEntity(entity.Id, updateData);
            if (refreshEntities) await refreshEntities();

            setIsEditing(false);
            setShowConfirmModal(false);
            alert('Modifications enregistrées !');
        } catch (error) {
            console.error('Error updating entity:', error);
            alert('Erreur lors de la modification.');
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h4 style={{ margin: 0 }}>Données modifiables</h4>
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    style={{
                                        backgroundColor: '#ffeb3b',
                                        border: '1px solid black',
                                        padding: '5px 10px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    ✎ Modifier
                                </button>
                            ) : (
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button
                                        onClick={() => { setIsEditing(false); setFormData({ Statuts: entity.Statuts, Type: entity.Type, Recette: entity.Recette }); }}
                                        style={{ padding: '5px 10px', cursor: 'pointer' }}
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={handleSaveClick}
                                        style={{
                                            backgroundColor: '#4ade80',
                                            border: '1px solid black',
                                            padding: '5px 10px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Valider
                                    </button>
                                </div>
                            )}
                        </div>

                        {isEditing ? (
                            <div style={{ display: 'grid', gap: '10px', backgroundColor: '#f9f9f9', padding: '10px', border: '1px dashed black' }}>
                                <div>
                                    <label style={{ fontWeight: 'bold', display: 'block' }}>Statut</label>
                                    <select name="Statuts" value={formData.Statuts} onChange={handleInputChange} style={{ width: '100%', padding: '5px' }}>
                                        <option value="">-- Sélectionner --</option>
                                        {allStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontWeight: 'bold', display: 'block' }}>Type</label>
                                    <select name="Type" value={formData.Type} onChange={handleInputChange} style={{ width: '100%', padding: '5px' }}>
                                        <option value="">-- Sélectionner --</option>
                                        {allTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontWeight: 'bold', display: 'block' }}>Recette (€)</label>
                                    <input type="number" name="Recette" value={formData.Recette} onChange={handleInputChange} style={{ width: '100%', padding: '5px' }} />
                                </div>
                            </div>
                        ) : (
                            <>
                                <Field label="Statut" value={entity.Statuts} />
                                <Field label="Type" value={entity.Type} />
                                <Field label="Recette" value={entity.Recette ? `${entity.Recette} €` : null} />
                            </>
                        )}

                        <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                            <Field label="Référent" value={entity.Référent_partenariat_club || "Non attribué"} />
                            <Field label="Objet" value={entity.Objet} />
                            <Field label="Message" value={entity.Message} isHtml />
                            <Field label="Date Envoi Mail" value={entity.dateEnvoiMail} />
                        </div>
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

            {/* Confirmation Modal */}
            {showConfirmModal && ReactDOM.createPortal(
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 10000
                }}>
                    <div style={{
                        backgroundColor: 'var(--brutal-white)', padding: '20px',
                        border: 'var(--brutal-border)', boxShadow: 'var(--brutal-shadow)',
                        width: '90%', maxWidth: '400px'
                    }}>
                        <h3 style={{ marginTop: 0 }}>Confirmer la modification</h3>
                        <p>Êtes-vous sûr de vouloir enregistrer ces modifications ?</p>
                        <div style={{ backgroundColor: '#f0f0f0', padding: '10px', marginBottom: '20px', fontSize: '0.9rem' }}>
                            <p style={{ margin: '5px 0' }}><strong>Statut:</strong> {formData.Statuts || 'Non défini'}</p>
                            <p style={{ margin: '5px 0' }}><strong>Type:</strong> {formData.Type || 'Non défini'}</p>
                            <p style={{ margin: '5px 0' }}><strong>Recette:</strong> {formData.Recette ? `${formData.Recette} €` : '0 €'}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowConfirmModal(false)}>Annuler</button>
                            <button
                                onClick={handleConfirmUpdate}
                                disabled={isSubmitting}
                                style={{ backgroundColor: 'var(--brutal-ice)', fontWeight: 'bold' }}
                            >
                                {isSubmitting ? 'Enregistrement...' : 'Oui, enregistrer'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
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
