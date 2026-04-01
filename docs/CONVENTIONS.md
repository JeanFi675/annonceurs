# Conventions

## Nommage

- **Composants React** : PascalCase (`EntityDetails`, `SuiviPaiement`)
- **Fonctions** : camelCase (`fetchEntities`, `handleMapClick`)
- **Champs NocoDB** : PascalCase avec underscores français (`Référent_partenariat_club`, `dateEnvoiMail`)
- **Variables d'env** : `VITE_` prefix + SCREAMING_SNAKE_CASE

## Valeurs métier figées

### Statuts (`Statuts`)
```
'À contacter'
'En discussion'
'Confirmé (en attente de paiement)'
'Paiement effectué'
'Refusé'
'Sans réponse'
```

### Types (`Type`)
```
'Encart Pub'
'Tombola (Lots)'
'Partenaires'
'Mécénat'
'Stand'
```
> Note : `'Subvention'` est utilisé dans certains endroits mais n'a pas de table NocoDB ni de liaison.

### Rôles utilisateur
```
'USER'   → accès lecture/commentaire
'ADMIN'  → accès + SuiviPaiement + génération d'attestations
```

## Patterns API

### Lecture (GET)
```js
GET /api/v2/tables/{tableId}/records?viewId={viewId}&limit=1000
Headers: { 'xc-token': VITE_API_TOKEN }
```

### Mise à jour (PATCH - format bulk NocoDB v2)
```js
PATCH /api/v2/tables/{tableId}/records
Body: [{ Id: numericId, ...fields }]
```

### Suppression (DELETE)
```js
DELETE /api/v2/tables/{tableId}/records
Body: { Id: numericId }
```

### Liaison (POST Link API)
```js
POST /api/v2/tables/{mainTableId}/links/{linkFieldId}/records/{mainRecordId}
Body: [{ Id: childRecordId }]
```

## Styles

- **Design system** : Brutalisme (variables CSS `--brutal-border`, `--brutal-shadow`, `--brutal-white`, `--brutal-ice`, `--brutal-black`)
- Styles principalement inline dans les composants JSX
- CSS global dans `App.css` et `index.css`

## État et données

- État global dans `App.jsx`, propagé par props (pas de Context ou Redux)
- `entities` = données brutes NocoDB, `filteredEntities` = vue filtrée côté client
- Authentification en `sessionStorage` (pas de JWT, pas de backend auth)
