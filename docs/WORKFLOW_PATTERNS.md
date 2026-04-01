# Workflow Patterns

## Changement de Type d'une entité (synchronizeTrackingType)

Le changement du champ `Type` dans `EntityDetails` déclenche une synchronisation automatique des tables de tracking.

```
Utilisateur change Type (ex: "Encart Pub" → "Partenaires")
  └─> handleConfirmUpdate()
        ├─> updateEntity() : met à jour la table principale
        └─> synchronizeTrackingType(entityId, newType, entity)
              ├─> Récupère l'entité fraîche depuis NocoDB
              ├─> Pour chaque type dans DIRECT_MAP :
              │     ├─> shouldExist = (optionType === newType)
              │     ├─> Si shouldExist ET n'existe pas → createTrackingRecord() + linkRecord()
              │     └─> Si !shouldExist ET existe → deleteTrackingRecord()
              └─> Exception : "Partenaires" avec Pack "Stand 3x3m" → crée aussi un Stand
```

**Cas particulier Tombola** : l'alias `Tombola` est mappé à `Tombola (Lots)`.

**Cas particulier Subvention** : pas de table NocoDB ni de champ de liaison. Non supporté dans le tracking.

## Création d'un enregistrement lié (createAndLinkRecord)

Toujours utiliser `createAndLinkRecord()` (pas `createTrackingRecord()` seul) pour garantir la liaison 1-1 :

```
createAndLinkRecord(type, data, entityId)
  ├─> createTrackingRecord(type, data)  → POST /tables/{tableId}/records
  └─> linkRecord(linkFieldId, entityId, newRecord.Id)  → POST /tables/{MAIN_TABLE_ID}/links/{linkFieldId}/records/{entityId}
```

## Génération de facture (n8n webhook)

```
Bouton "Facture" → FactureModal → triggerInvoiceWebhook(payload)
  └─> POST VITE_N8N_WEBHOOK_URL avec payload entité
```

## Génération de reçu mécénat

```
Bouton "Reçu Mécénat" → MecenatModal → triggerMecenatWebhook(payload)
  └─> POST VITE_N8N_MECENAT_WEBHOOK_URL
```

## Génération d'attestation (PDF côté client)

```
Bouton "Attestation" (EntityDetails, ADMIN, Recette > 0)
  └─> Modal choix mode paiement (Chèque / Virement)
        └─> generateAttestation(entity, modeDepaiement)
              └─> Génère un PDF client-side via attestationUtils.js
```

## Commentaires (format interne)

Les commentaires sont stockés en texte plat dans le champ `Comments` de la table principale, avec ce format :

```
[DD/MM/YYYY HH:MM] Texte du commentaire
[DD/MM/YYYY HH:MM] Modification système:
Statut: Ancien -> Nouveau
```

Le parsing se fait via regex `^\[(.+?)\]\s*(.*)$` dans `EntityDetails.parseComments()`.

## Filtrage des entités (côté client)

Les filtres sont appliqués dans `App.jsx` via `useEffect` sur `[filters, entities]` :

```
Statuts → filtre exact
Type → filtre exact
Referent → "Non attribué" ou valeur exacte du champ Référent_partenariat_club
Search → recherche dans title, address, Place (insensible à la casse)
```
