# Test Guide

## État actuel

Aucun test automatisé configuré. Le projet n'inclut pas Jest, Vitest, ni Testing Library.

## Stratégie de test manuelle

### Avant toute modification de `api.js`

1. Vérifier dans NocoDB que les IDs de tables (`TRACKING_TABLES`) correspondent aux tables existantes
2. Tester `fetchEntities` : réponse non vide, champs `Id`, `title`, `Statuts`, `Type` présents
3. Tester `updateEntity` : vérifier que le PATCH bulk (`[{ Id, ...data }]`) est bien accepté

### Cas critiques à valider manuellement

| Scénario | Vérification attendue |
|----------|----------------------|
| Changement de Type d'une entité | La table de tracking précédente est supprimée, la nouvelle est créée et liée |
| Type = Partenaires + Pack "Stand 3x3m" | Deux enregistrements créés : Partenaires ET Stand, liés entre eux |
| Tombola vs Tombola (Lots) | L'alias `Tombola` pointe vers la table `mm0pgifcf72rnoj` |
| Subvention | Message "Unknown type" dans la console, aucune opération NocoDB |
| Sans VITE_API_TOKEN | Console error, retour `[]` sans crash |
| ADMIN → SuiviPaiement | La page charge, les entités avec Recette > 0 apparaissent |
| USER → /suivi-paiement | Affichage "Accès refusé" |

### Test d'intégration NocoDB

Pour valider une modification du service API sans casser la prod :
1. Créer une entité de test dans NocoDB
2. Changer son Type dans l'UI
3. Vérifier dans NocoDB que les tables de tracking sont synchronisées
4. Supprimer l'entité de test

## Points d'attention

- **Pas de rollback** si `synchronizeTrackingType` échoue à mi-chemin : possibilité de doublon ou d'orphelin
- Le champ `Subvention` dans `TRACKING_TABLES` est mappé sur `Stand` (commenté dans le code) → **ne pas activer sans créer une table dédiée**
- `VITE_N8N_MECENAT_WEBHOOK_URL` non configurée → utilise une URL placeholder Railway (non fonctionnelle)
