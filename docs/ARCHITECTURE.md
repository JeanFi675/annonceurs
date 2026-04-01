# Architecture

## Vue d'ensemble

Application React (SPA) de gestion des partenaires/annonceurs pour un club. Interface cartographique + panneau de gestion. Backend : NocoDB auto-hébergé via REST API v2.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 19, Vite 7 |
| Routing | React Router v7 (HashRouter) |
| Carte | Leaflet + react-leaflet |
| HTTP | Axios |
| Backend | NocoDB v2 (self-hosted, `nocodb.jpcloudkit.fr`) |
| Automatisation | n8n (webhooks pour génération de factures/reçus) |

## Structure des dossiers

```
src/
├── App.jsx               # Point d'entrée, auth, routing, état global filtres
├── services/
│   └── api.js            # Toutes les interactions NocoDB
├── pages/
│   ├── EntityDetails.jsx # Fiche détail d'une entité
│   ├── Dashboard.jsx     # Stats globales + classement référents
│   ├── SuiviAvancement.jsx
│   ├── SuiviPaiement.jsx # ADMIN uniquement
│   ├── BilanFinancier.jsx
│   ├── BrochureAdmin.jsx
│   └── History.jsx
├── components/
│   ├── Map.jsx           # Carte Leaflet
│   ├── Sidebar.jsx       # Panneau latéral (filtres, création/édition)
│   ├── Login.jsx
│   ├── FactureModal.jsx
│   ├── MecenatModal.jsx
│   └── ReferentEntitiesList.jsx
└── utils/
    └── attestationUtils.js  # Génération d'attestations PDF
```

## Architecture des données NocoDB

### Table principale : Liste de contact (`mz7t9hogvz3ynsm`)

Champs clés : `Id`, `title`, `address`, `phoneNumber`, `website`, `Place` (URL Google Maps), `Statuts`, `Type`, `Recette`, `Référent_partenariat_club`, `Comments`, `Objet`, `Message`, `dateEnvoiMail`

### Tables de tracking (1 par type de partenariat)

| Type | Table ID |
|------|----------|
| Encart Pub | `m5bbut4uy8toxt5` |
| Tombola (Lots) | `mm0pgifcf72rnoj` |
| Partenaires | `megvc314571rznb` |
| Mécénat | `m80f7gykd2ubrfk` |
| Stand | `midotel4vypc65e` |

### Champs de liaison (Link Fields depuis Liste de contact)

| Type | Link Field ID |
|------|--------------|
| Encart Pub | `cyl94cin0jr44gs` |
| Tombola (Lots) | `cng8iswsgb2q60o` |
| Partenaires | `calv2cwh9dp92bi` |
| Mécénat | `cfjurax08wyyvyr` |
| Stand | `csvaotykbbr6jed` |
| Partenaire → Stand | `cised9h8iiyt5db` |

## Flux principal

```
Login (sessionStorage)
  └─> App.jsx (charge toutes les entités)
        ├─> Sidebar (filtres, création)
        └─> Map (affichage géographique)
              └─> EntityDetails (fiche + édition)
                    └─> synchronizeTrackingType() si Type change
```

## Authentification

Simple côté client : mot de passe stocké en dur, rôle (`USER` / `ADMIN`) en `sessionStorage`. Pas de backend auth.

## Variables d'environnement

| Variable | Usage |
|----------|-------|
| `VITE_API_TOKEN` | Token NocoDB (`xc-token`) |
| `VITE_N8N_WEBHOOK_URL` | Webhook génération factures |
| `VITE_N8N_MECENAT_WEBHOOK_URL` | Webhook reçus mécénat |
