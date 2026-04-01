# Component Mapping

## Routes → Pages

| Route | Composant | Accès |
|-------|-----------|-------|
| `/` | `App.jsx` → `Sidebar` + `Map` | Tous |
| `/entity/:id` | `EntityDetails` | Tous |
| `/history` | `History` | Tous |
| `/dashboard` | `Dashboard` | Tous |
| `/suivi` | `SuiviAvancement` | Tous |
| `/bilan` | `BilanFinancier` | Tous |
| `/brochure-admin` | `BrochureAdmin` | Tous |
| `/suivi-paiement` | `SuiviPaiement` | ADMIN seulement |

## Props de l'état global (App.jsx → enfants)

| Prop | Type | Description |
|------|------|-------------|
| `entities` | `Array` | Toutes les entités chargées |
| `filteredEntities` | `Array` | Entités après application des filtres |
| `filters` | `Object` | `{ Statuts, Type, Referent, Search }` |
| `refreshEntities` | `Function` | Recharge les données depuis NocoDB |
| `userRole` | `'USER'\|'ADMIN'` | Rôle de l'utilisateur connecté |
| `newLocation` | `{ lat, lng }\|null` | Clic sur la carte pour nouvelle entité |
| `isAddMode` | `Boolean` | Mode ajout d'entité actif |

## Fonctionnalités par composant

### `Sidebar`
- Filtres (Statuts, Type, Référent, Recherche texte)
- Création d'entité (formulaire + géolocalisation)
- Suggestions de lieux proches (Google Maps / Leaflet)
- Bilan financier rapide

### `Map` (Leaflet)
- Affichage des marqueurs (entités filtrées)
- Clic sur la carte → `handleMapClick(lat, lng)` → `newLocation`
- Navigation vers `EntityDetails` au clic sur un marqueur

### `EntityDetails`
- Vue et édition de Statuts / Type / Recette
- Ajout de commentaires horodatés
- Génération d'attestation (ADMIN + Recette > 0)
- Synchronisation automatique des tables de tracking si `Type` change

### `Dashboard`
- Objectif de recette fixé à **21 000 €**
- Calcul total recettes (exclut Tombola)
- Classement des référents par recette
- Taux de conversion

### `SuiviPaiement` (ADMIN)
- Filtrage et tri des entités à encaisser
- Édition des champs `Date_de_paiement`, `Numero_de_remise`, `Mode_de_paiement`
- Mise à jour simultanée de la table principale et des tables de tracking

### `SuiviAvancement`
- Suivi des devis/factures par entité
- Gestion des formulaires de parrainage (mécénat)

## Modaux

| Modal | Déclencheur | Localisation |
|-------|-------------|--------------|
| `FactureModal` | Bouton "Facture" | `Sidebar` ou `SuiviAvancement` |
| `MecenatModal` | Type = Mécénat | `Sidebar` ou `SuiviAvancement` |
| Confirmation modal | "Valider" dans `EntityDetails` | Inline dans `EntityDetails` |
| Payment method modal | Bouton "Attestation" | Inline dans `EntityDetails` |
