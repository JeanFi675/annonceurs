import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { updateEntity, fetchTrackingData, updateTrackingRecord, createAndLinkRecord } from "../services/api";

const TYPES = ['Encart Pub', 'Partenaires', 'Mécénat', 'Stand'];

// Helpers for Date Formatting
const formatDateForApi = (isoDateString) => {
    if (!isoDateString) return null;
    if (!isoDateString.match(/^\d{4}-\d{2}-\d{2}$/)) return null;
    return isoDateString;
};

const parseDateFromApi = (apiDateString) => {
    if (!apiDateString) return '';
    if (apiDateString.match(/^\d{4}-\d{2}-\d{2}$/)) return apiDateString;
    const parts = apiDateString.split('/');
    if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month}-${day}`;
    }
    return '';
};

const SuiviPaiement = ({ entities, refreshEntities, userRole }) => {
  const [editingId, setEditingId] = useState(null);
  const [trackingData, setTrackingData] = useState({});
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);
  
  const [formData, setFormData] = useState({
    Date_de_paiement: "",
    Numero_de_remise: "",
    Mode_de_paiement: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch tracking data internally
  useEffect(() => {
    const loadAllTracking = async () => {
      setIsLoadingTracking(true);
      const newTrackingData = {};
      for (const type of TYPES) {
        newTrackingData[type] = await fetchTrackingData(type);
      }
      setTrackingData(newTrackingData);
      setIsLoadingTracking(false);
    };
    if (userRole === "ADMIN") {
        loadAllTracking();
    }
  }, [userRole]);

  // Si on n'est pas admin, on affiche un message d'erreur
  if (userRole !== "ADMIN") {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Accès refusé. Réservé aux administrateurs.</h2>
        <Link to="/" style={{ textDecoration: "underline" }}>
          Retour à la carte
        </Link>
      </div>
    );
  }

  // Filtrer les entités : on ne garde que celles qui ont une "Recette" ou qui sont en "Paiement effectué" / "Confirmé (en attente de paiement)"
  const validStatuses = [
    "Confirmé (en attente de paiement)",
    "Paiement effectué",
  ];
  
  const filteredEntities = entities
    .filter(
      (e) =>
        e.Type !== "Tombola (Lots)" &&
        e.Type !== "Subvention" &&
        ((e.Recette && parseFloat(e.Recette) > 0) ||
          validStatuses.includes(e.Statuts))
    )
    .sort((a, b) => (b.Recette || 0) - (a.Recette || 0));

  const getTrackingRecord = (entity) => {
      if (!entity || !entity.Type || !trackingData[entity.Type]) return null;
      return trackingData[entity.Type].find(r => {
          const link = r.Link_Annonceur;
          const linkId = (typeof link === 'object' && link !== null) ? link.Id : link;
          return String(linkId) === String(entity.Id);
      });
  };

  const getStatus = (entity, tracking) => {
      const amt = parseFloat(entity.Recette) || 0;
      if (amt === 0) return "valid";
      
      const modePaiement = tracking?.Type_Paiement || "";
      const datePaiement = tracking?.date_paiement || tracking?.Date_Paiement || "";
      
      const mode = modePaiement.toLowerCase();
      const isChequeOrEspece = mode.includes("chèque") || mode.includes("espèce");
      const hasDate = !!datePaiement;
      const hasRemise = !!entity.Numero_de_remise;
      
      if (hasDate) {
          if (isChequeOrEspece) {
              if (hasRemise) return "valid";
              else return "intermediate";
          } else {
              return "valid";
          }
      }
      return "pending";
  };

  const sortedEntities = [...filteredEntities].sort((a, b) => {
      const trackingA = getTrackingRecord(a);
      const trackingB = getTrackingRecord(b);
      
      const statusA = getStatus(a, trackingA);
      const statusB = getStatus(b, trackingB);
      
      // 1. Validés en bas
      if (statusA === "valid" && statusB !== "valid") return 1;
      if (statusA !== "valid" && statusB === "valid") return -1;
      
      // 2. Tri par Type
      const typeA = a.Type || "";
      const typeB = b.Type || "";
      if (typeA < typeB) return -1;
      if (typeA > typeB) return 1;
      
      // 3. Tri par Ordre Alpha Entité
      const titleA = (a.title || "").toLowerCase();
      const titleB = (b.title || "").toLowerCase();
      if (titleA < titleB) return -1;
      if (titleA > titleB) return 1;
      
      return 0;
  });

  const handleEditClick = (entity) => {
    setEditingId(entity.Id);
    const tracking = getTrackingRecord(entity);
    
    // Convert API format back to inputs
    const apiDate = tracking?.date_paiement || tracking?.Date_Paiement || "";
    const htmlDate = parseDateFromApi(apiDate);
    
    setFormData({
      Date_de_paiement: htmlDate, // ISO formatting expected by input type=date
      Numero_de_remise: entity.Numero_de_remise || "", // Numero_de_remise is kept in Entity 
      Mode_de_paiement: tracking?.Type_Paiement || "", // Tracking Field
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ Date_de_paiement: "", Numero_de_remise: "", Mode_de_paiement: "" });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveClick = async (entity) => {
    setIsSubmitting(true);
    try {
      // 1. Mise à jour de l'entité globale (Annonceurs) pour le Numero_de_remise (et potentiellement sauvegardes cachées si besoin)
      const updateData = {
        Numero_de_remise: formData.Numero_de_remise,
      };
      await updateEntity(entity.Id, updateData);

      // 2. Synchronisation de la table de tracking (Encart Pub, Mécénat...) pour le Mode et Date
      if (entity.Type && TYPES.includes(entity.Type)) {
          const match = getTrackingRecord(entity);
          const formattedDate = formatDateForApi(formData.Date_de_paiement);
          
          const trackingPayload = {
            Type_Paiement: formData.Mode_de_paiement,
            date_paiement: formattedDate,
            Date_Paiement: formattedDate
          };
          
          if (match) {
             await updateTrackingRecord(entity.Type, match.Id, trackingPayload);
          } else {
             // Create it if it missing
             const newRecord = {
                 ...trackingPayload,
                 Titre: entity.title || 'Suivi'
             };
             await createAndLinkRecord(entity.Type, newRecord, entity.Id);
          }
      }

      setEditingId(null);
      
      if (refreshEntities) {
        await refreshEntities(); // Reload main entities
      }
      
      // Reload tracking records
      const newTrackingData = { ...trackingData };
      if (entity.Type && TYPES.includes(entity.Type)) {
          newTrackingData[entity.Type] = await fetchTrackingData(entity.Type);
          setTrackingData(newTrackingData);
      }
      
      alert("Paiement enregistré avec succès !");
    } catch (error) {
      console.error("Error updating tracking data:", error);
      alert("Erreur lors de la modification des données de paiement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Responsive design helpers
  const isMobile = window.innerWidth < 768;

  const containerStyle = {
    backgroundColor: "var(--brutal-bg, #f4f4f4)",
    minHeight: "100vh",
    padding: "20px",
    fontFamily: "Space Grotesk, sans-serif",
  };

  const contentWrapperStyle = {
    maxWidth: "1200px",
    margin: "0 auto",
    width: "100%",
  };

  const thStyle = {
    border: "2px solid black",
    padding: "10px",
    backgroundColor: "black",
    color: "white",
    textAlign: "left",
    textTransform: "uppercase",
  };

  const tdStyle = {
    border: "1px solid black",
    padding: "10px",
    verticalAlign: "middle",
  };

  return (
    <div style={containerStyle}>
      <div style={contentWrapperStyle}>
        <div
          style={{
            marginBottom: "30px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <h1
            style={{
              fontSize: isMobile ? "1.5rem" : "2.5rem",
              margin: 0,
              textTransform: "uppercase",
              textDecoration: "underline",
            }}
          >
            💳 Suivi des Paiements
          </h1>
          <Link
            to="/"
            style={{
              backgroundColor: "white",
              color: "black",
              padding: "10px 20px",
              textDecoration: "none",
              fontWeight: "bold",
              textTransform: "uppercase",
              border: "3px solid black",
              boxShadow: "4px 4px 0px black",
              whiteSpace: "nowrap",
              fontSize: isMobile ? "0.9rem" : "1rem",
            }}
          >
            &larr; Retour Carte
          </Link>
        </div>

        <div
          style={{
            backgroundColor: "white",
            border: "3px solid black",
            boxShadow: "8px 8px 0px rgba(0,0,0,1)",
            padding: isMobile ? "10px" : "20px",
            overflowX: "auto",
          }}
        >
          {isLoadingTracking ? (
              <p>Chargement des suivis de paiement...</p>
          ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "800px",
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Entité</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Montant (€)</th>
                <th style={thStyle}>Mode de paiement</th>
                <th style={thStyle}>Date de paiement</th>
                <th style={thStyle}>Numéro de remise</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedEntities.map((entity) => {
                
                const tracking = getTrackingRecord(entity);
                const modePaiement = tracking?.Type_Paiement || "";
                const datePaiement = tracking?.date_paiement || tracking?.Date_Paiement || "";
                const status = getStatus(entity, tracking);
                
                let bgColor = "transparent";
                if (editingId === entity.Id) {
                    bgColor = "#f0fdf4"; // Light Green for editing
                } else if (status === "valid") {
                    bgColor = "#dcfce7"; // Validated (Green)
                } else if (status === "intermediate") {
                    bgColor = "#fef08a"; // Intermediate (Yellow)
                } else if (status === "pending") {
                    bgColor = "#fee2e2"; // Pending (Red)
                }

                const currentMode = editingId === entity.Id ? formData.Mode_de_paiement.toLowerCase() : modePaiement.toLowerCase();
                const isChequeOrEspece =
                  currentMode.includes("chèque") ||
                  currentMode.includes("espèce");

                return (
                  <tr
                    key={entity.Id}
                    style={{
                      backgroundColor: bgColor,
                    }}
                  >
                    <td style={{ ...tdStyle, fontWeight: "bold" }}>
                      {entity.title}
                    </td>
                    <td style={tdStyle}>{entity.Type || "N/A"}</td>
                    <td style={{ ...tdStyle, fontWeight: "bold" }}>
                      {entity.Recette ? `${entity.Recette} €` : "-"}
                    </td>
                    <td style={tdStyle}>
                      {editingId === entity.Id ? (
                        <select
                          name="Mode_de_paiement"
                          value={formData.Mode_de_paiement}
                          onChange={handleInputChange}
                          style={{ padding: "5px", width: "100%", backgroundColor: "white", border: "1px solid black" }}
                        >
                          <option value="">- Sélectionner -</option>
                          <option value="Virement">Virement</option>
                          <option value="Chèque">Chèque</option>
                          <option value="Espèces">Espèces</option>
                          <option value="Carte Bancaire">Carte Bancaire</option>
                          <option value="Autre">Autre</option>
                        </select>
                      ) : (
                        modePaiement || "-"
                      )}
                    </td>

                    {/* Date de paiement */}
                    <td style={tdStyle}>
                      {editingId === entity.Id ? (
                        <input
                          type="date"
                          name="Date_de_paiement"
                          value={formData.Date_de_paiement}
                          onChange={handleInputChange}
                          style={{ padding: "5px", width: "100%", border: "1px solid black" }}
                        />
                      ) : datePaiement ? (
                        parseDateFromApi(datePaiement).split('-').reverse().join('/')
                      ) : (
                        "-"
                      )}
                    </td>

                    {/* Numéro de remise (Uniquement si chèque ou espèce) */}
                    <td style={tdStyle}>
                      {editingId === entity.Id ? (
                        <input
                          type="text"
                          name="Numero_de_remise"
                          value={formData.Numero_de_remise}
                          onChange={handleInputChange}
                          disabled={!isChequeOrEspece}
                          placeholder={
                            isChequeOrEspece
                              ? "Saisir le N°"
                              : "N/A (Virement...)"
                          }
                          style={{
                            padding: "5px",
                            width: "100%",
                            border: "1px solid black",
                            backgroundColor: isChequeOrEspece
                              ? "white"
                              : "#e5e7eb",
                            cursor: isChequeOrEspece ? "text" : "not-allowed",
                          }}
                        />
                      ) : (
                        entity.Numero_de_remise || "-"
                      )}
                    </td>

                    {/* Actions */}
                    <td style={tdStyle}>
                      {editingId === entity.Id ? (
                        <div style={{ display: "flex", gap: "5px" }}>
                          <button
                            onClick={() => handleSaveClick(entity)}
                            disabled={isSubmitting}
                            style={{
                              padding: "5px 10px",
                              backgroundColor: "#4ade80",
                              border: "1px solid black",
                              fontWeight: "bold",
                              cursor: isSubmitting ? "wait" : "pointer",
                            }}
                          >
                            ✔️ 
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            style={{
                              padding: "5px 10px",
                              backgroundColor: "#f87171",
                              border: "1px solid black",
                              fontWeight: "bold",
                              cursor: "pointer",
                            }}
                          >
                            ❌
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditClick(entity)}
                          style={{
                            padding: "5px 10px",
                            backgroundColor: "#fef08a",
                            border: "1px solid black",
                            fontWeight: "bold",
                            cursor: "pointer",
                          }}
                        >
                          ✎ Éditer
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {sortedEntities.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      fontStyle: "italic",
                    }}
                  >
                    Aucun paiement à suivre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuiviPaiement;

