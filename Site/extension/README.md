# Extension Chrome — Analyse formation

Petite extension **Manifest V3** en TypeScript : sur une page type « Master / Bachelor », elle lit le **DOM** (titres, texte principal) et en déduit des **indicateurs** (frais, durées, %, mots-clés carrière, charge quanti estimée, etc.). Ensuite elle compare ça à un **profil auto-évalué** (maths, anglais…) et affiche un **avis indicatif**, des **exemples de parcours** (données de démo) et un lien vers la page **Plateformes cours** du site.

## Build

```bash
cd Site/extension
npm install
npm run build
```

Charge le dossier **`dist/`** dans Chrome → Extensions → Mode développeur → « Charger l’extension non empaquetée ».

## Démo sans payer les 5 $ du Chrome Web Store

Les frais d’enregistrement ne concernent que la **publication** sur le store. Pour une démo (toi, un jury, un collègue), utilise **toujours** le chargement non empaqueté depuis `dist/` : **aucun paiement**, aucun compte développeur obligatoire. Tu peux zipper `dist/` et envoyer l’archive : l’autre personne extrait et charge le même dossier dans Chrome.

## OpenClaw (optionnel)

**OpenClaw** (relay navigateur + agent) sert à piloter des onglets depuis un agent local. Ce dépôt **ne l’intègre pas** : l’extension fonctionne seule. Si tu utilises OpenClaw en parallèle, tu peux t’en servir pour ouvrir d’autres pages (classements, avis anciens élèves) puis **copier-coller** le texte ou brancher plus tard une **API** qui enrichit `ProgramIntel`.

## Profil simulateur (sans onglet « Profil » dans l’extension)

Sur les pages du site (`localhost`, `albert-letudiant.vercel.app`), un script **site-bridge** copie le `localStorage` du simulateur (profil + état connecté) vers `chrome.storage.local`. Connecte-toi sur le site dans Chrome, laisse l’onglet ouvert quelques secondes, puis analyse une page formation : l’adéquation utilise ce dossier.

## Limites

- Pas de scraping « profond » multi-sites sans backend : tout est **heuristique** sur la page ouverte.
- Les « profils similaires » et une partie des **contacts ambassadeurs** sont des **exemples** pour la démo ; à remplacer par ton API (Neo4j / CSV ambassadeurs) quand tu veux.

## URL du site

Modifie `src/config.ts` (`SITE_ORIGIN`) si ton déploiement Vercel change.
