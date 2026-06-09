# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Principes généraux

Directives comportementales pour réduire les erreurs courantes. À combiner avec les instructions projet ci-dessous.

**Compromis :** ces principes privilégient la prudence sur la vitesse. Sur les tâches triviales, faire preuve de jugement.

### 1. Réfléchir avant de coder

**Ne pas supposer. Ne pas masquer l'incertitude. Expliciter les compromis.**

Avant d'implémenter :
- Énoncer les hypothèses explicitement. En cas de doute, demander.
- Si plusieurs interprétations sont possibles, les présenter — ne pas trancher silencieusement.
- Si une approche plus simple existe, le dire. Pousser un avis contraire quand c'est justifié.
- Si quelque chose n'est pas clair, s'arrêter. Nommer ce qui pose problème. Demander.

### 2. Simplicité d'abord

**Le minimum de code qui résout le problème. Rien de spéculatif.**

- Pas de fonctionnalités au-delà du demandé.
- Pas d'abstractions pour du code à usage unique.
- Pas de « flexibilité » ou de « configurabilité » non demandée.
- Pas de gestion d'erreur pour des cas impossibles.
- Si tu écris 200 lignes alors que 50 suffisent, réécris.

Se demander : « Un ingénieur senior trouverait-il ça surdimensionné ? » Si oui, simplifier.

### 3. Modifications chirurgicales

**Ne toucher que ce qui doit l'être. Ne nettoyer que ses propres traces.**

En éditant du code existant :
- Ne pas « améliorer » le code, les commentaires ou le formatage adjacents.
- Ne pas refactoriser ce qui n'est pas cassé.
- Reprendre le style existant, même si on ferait différemment.
- Si on remarque du code mort sans rapport, le signaler — ne pas le supprimer.

Quand un changement crée des orphelins :
- Retirer les imports/variables/fonctions rendus inutilisés par tes modifications.
- Ne pas retirer le code mort préexistant sauf demande explicite.

Le test : chaque ligne modifiée doit pouvoir être rattachée directement à la demande de l'utilisateur.

### 4. Exécution pilotée par l'objectif

**Définir les critères de succès. Itérer jusqu'à vérification.**

Transformer les tâches en objectifs vérifiables :
- « Ajouter une validation » → « Écrire des tests d'entrées invalides, puis les faire passer »
- « Corriger le bug » → « Écrire un test qui le reproduit, puis le faire passer »
- « Refactoriser X » → « S'assurer que les tests passent avant et après »

Pour les tâches multi-étapes, énoncer un plan bref :

```
1. [Étape] → vérification : [contrôle]
2. [Étape] → vérification : [contrôle]
3. [Étape] → vérification : [contrôle]
```

Des critères de succès solides permettent d'itérer en autonomie. Des critères flous (« faire que ça marche ») obligent à clarifier en permanence.

---

**Ces principes fonctionnent si :** moins de modifications inutiles dans les diffs, moins de réécritures pour cause de sur-ingénierie, et les questions de clarification arrivent avant l'implémentation plutôt qu'après une erreur.

---

## Projet

Site institutionnel **Novances Évaluation** (cabinet d'évaluation financière, ex-NCF Advisory). Site statique HTML/CSS/JS vanille, déployé sur Vercel, formulaire contact relié à Pipedrive via une route serverless.

Domaine canonique : `https://novances-evaluation.fr`. Si tu le changes, suivre la procédure dans `NOTES.md` (sitemap, robots, balises `canonical`, OG, JSON-LD).

## Audience & ton éditorial

Cible principale : **dirigeants de PME**. Ton **pédagogique mais expert** :
- Vocabulaire accessible, exemples concrets, pas de jargon gratuit.
- On peut introduire un terme métier (ROCE, multiple de chiffre d'affaires, etc.) si on le contextualise immédiatement.
- Phrases courtes, paragraphes courts. Éviter le ton "agence", préférer la posture d'expert posé.
- Français de France, orthographe soignée.

## Commandes

Pas de build, pas de lint, pas de tests automatisés. Le site est servi tel quel.

```bash
node serve.mjs          # dev server local sur http://localhost:3000 (clean URLs)
PORT=4000 node serve.mjs
```

Vercel applique `cleanUrls: true` (`/transmission` → `/transmission/index.html`) et `trailingSlash: false`. Le dev server reproduit ce comportement.

## Architecture

`ARCHITECTURE.md` décrit la structure des dossiers et la procédure d'ajout d'une page — **le lire avant tout ajout de page**. Compléments :

- **Page = dossier + `index.html`** : l'URL publique vient du dossier. Ne jamais renommer un slug existant sans plan de redirection (SEO).
- **Styles partagés** dans `assets/css/global.css` (tokens + chrome navbar/footer/band), **styles par page** dans `assets/css/pages/<page>.css`. Composants réutilisables dans `assets/css/components/` (ex. `autocycle.css`).
- **JS** : `assets/js/site.js` (commun, chargé partout), `assets/js/pages/<page>.js` (spécifique), `assets/js/autocycle.js` (composant « Pourquoi nous » des pages cibles).
- **`_work/`** est un bac à sable autorisé pour prototypes/maquettes avant intégration. Non déployé (`.vercelignore`), non indexé (`robots.txt` Disallow). Workflow : prototype dans `_work/` → validation utilisateur → intégration dans le site.
- `_work/docs/` et `_work/prompts/` sont gitignored (briefs internes sensibles).

## Design system

**Source de vérité** : les tokens CSS dans `:root` de [`assets/css/global.css`](assets/css/global.css). Palette active = "**Institutionnel clair v2**" : fond ivoire bleuté, texte navy, accent bleu marine profond.

Règle stricte : **palette institutionnelle uniquement**, pas de couleurs ad hoc. Les hues "cas d'usage" (`--c-succession`, `--c-litiges`, `--c-croissance`) sont les seuls accents colorés autorisés par offre, plus `--violet: #532EFB` pour la marque secondaire (minoritaires/litiges).

Les alias `--navy*`, `--cyan*`, `--blue*`, `--ink*` sont **legacy** (pointent vers les vrais tokens). Préférer les tokens sémantiques (`--accent`, `--text-1`, `--bg-base`, etc.) dans tout nouveau code.

### Plugin `frontend-design` (auto-déclenché)

Le skill `frontend-design` (plugin officiel Anthropic) se déclenche automatiquement dès qu'on parle de créer/refaire un composant ou une page. Il pousse vers des choix esthétiques tranchés et distinctifs. Cadrage spécifique à ce projet :

- **Dans `_work/` (prototypes)** : direction esthétique libre, c'est fait pour explorer. Le skill peut s'exprimer pleinement.
- **En production (pages publiques, composants intégrés)** : le **design system existant gagne**. Le skill enrichit (motion, micro-détails, compositions inattendues, spacing soigné) **dans** les contraintes : tokens `:root` de `global.css`, palette Institutionnel clair v2, ncf-icons, famille typo existante. **Pas de nouvelle palette, pas de nouvelle famille typo, pas d'icônes externes.**
- **Nouvel article ressources** : suivre le template/layout des articles existants (`ressources/<slug>/index.html`). Le skill peut proposer des compositions éditoriales fortes, mais le chrome (navbar, footer, palette, typo) reste celui du site.

### Icônes

**Toujours** utiliser la librairie maison `assets/ncf-icons/` (sprite SVG + classes utilitaires). Voir `assets/ncf-icons/README.md` et `ICON_GUIDELINES.md`. Jamais d'icônes externes (Heroicons, Lucide, FontAwesome, emojis dans l'UI, etc.).

Les variables `--ncf-*` définies dans `icons.css` ne sont qu'un fallback : les `.ncf-icon` héritent de `currentColor`, donc dans la pratique elles prennent la couleur du texte parent — bien aligné avec la palette institutionnelle.

## Contenu — articles Ressources

Workflow d'import d'un article LinkedIn dans `ressources/` :

1. HTML brut LinkedIn déposé dans `ressources/Linkedin/<Titre LinkedIn>.html` (non indexé via `robots.txt`).
2. Script `_work/import-linkedin-articles.mjs` pour extraire/normaliser.
3. Page finale : `ressources/<slug>/index.html` avec visuels dans `assets/img/articles/<slug>.jpg` (+ `<slug>-body{n}.jpg` pour le corps).
4. Ajouter la card dans `ressources/index.html` et l'URL dans `sitemap.xml`.

Le slug doit être **stable** une fois publié (URL = SEO).

## SEO

- Toute nouvelle page publique → entrée dans [`sitemap.xml`](sitemap.xml) avec `lastmod` et `priority` cohérents.
- Ne pas casser les slugs existants. Si renommage indispensable : prévoir une redirection Vercel.
- `robots.txt` exclut `/_work/` et `/ressources/Linkedin/` — ne pas y mettre de contenu destiné au public.
- Balises `canonical`, OG, et JSON-LD doivent toutes pointer vers `https://novances-evaluation.fr`.

## API contact

`api/contact.js` (route Vercel serverless, format CommonJS) : POST → crée une Person + Lead + Note dans Pipedrive.

Variables d'environnement requises côté Vercel :
- `PIPEDRIVE_API_TOKEN`
- `PIPEDRIVE_COMPANY_DOMAIN` (avec ou sans `https://`, avec ou sans `.pipedrive.com`)
- `PIPEDRIVE_OWNER_ID` (optionnel)

Le formulaire de contact ne demande plus de cas d'usage : seuls prénom, nom et email sont obligatoires côté API.

Honeypot anti-spam : champ caché `website` — si rempli, la requête renvoie 200 silencieusement.

## Conventions de commit

Voir `git log` pour le style en vigueur (impératif court, parfois descriptif sur deux lignes, sans préfixe type Conventional Commits).

## Fichiers à NE PAS commiter

`.gitignore` exclut déjà : `.claude/`, briefs PDF/DOCX, screenshots à la racine, `_work/docs/` et `_work/prompts/`.
