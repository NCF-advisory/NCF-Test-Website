# État des lieux du code — plan d'action

> Audit complet réalisé le 2026-06-09 (10 dimensions, vérification adversariale, faux-positifs déjà écartés).
> Ce document est la **liste de travail** : à dérouler dans une prochaine session. Coche au fur et à mesure.
> Localisation : `_work/` → non déployé sur Vercel, non indexé.

## Diagnostic global

Site **globalement sain** pour un projet statique sans build. Fondations solides (architecture conforme à `ARCHITECTURE.md`, SEO 1:1, JS robuste, API contact sûre). **Rien de critique** pour la sécurité ni l'indexation. La dette se concentre sur 4 foyers : (1) footer cassé, (2) marque incohérente, (3) CSS/JS mort, (4) hygiène de dépôt/assets.

Scores : JS 8 · SEO 8 · API 8 · Archi 7 · Liens 7 · CSS 6 · A11y 6 · Perf 6 · Éditorial 6 · HTML/chrome 5.

---

## ⚠️ Décision à prendre AVANT de commencer

**Dénomination publique de la marque** : le site affiche « NCF Advisory » partout, mais le projet est « Novances Évaluation ». Plusieurs corrections en masse en dépendent (constat #2). **Trancher d'abord** : on bascule tout sur « Novances Évaluation » ? (« NCF » seul reste OK comme nom court dans le corps de texte.)

---

## 🟢 Quick wins — à faire en premier (faible effort, fort impact, sans risque)

- [ ] **Footer cassé** : remplacer `<footer id="footer">` par `<footer class="footer">` sur **12 pages**. Le `#footer` n'a aucun usage JS/ancre → `sed` ciblé sûr. Répare un défaut visuel en production (fond/padding/bordure/halo absents).
  - Pages : `equipe/index.html:201`, `ressources/index.html:255`, + 10 articles : `business-model-roce:155`, `cloture-2022:153`, `clotures-2020:155`, `controles-fiscaux:153`, `deposer-marques:168`, `dirigeants-pme-lecon-covid:155`, `humain-reussir:155`, `strategie-axee-valeur:166`, `valorisation-fonds-commerce:157`, `valoriser-entreprise-periode-crise:155`. Règle cible : `global.css:339-352`.
- [ ] **Supprimer** `assets/img/team/frederic-lemonnier.png` (918 Ko, 0 référence ; seul le `.jpg` de 138 Ko est utilisé) → −897 Ko.
- [ ] **Ré-encoder** les 2 images de corps à 686 Ko en qualité ~75-82 ou WebP : `assets/img/articles/dirigeants-pme-lecon-covid-body1.jpg` + `assets/img/articles/clotures-2020-…-body1.jpg` → ~1,1 Mo économisés.
- [ ] **`.vercelignore`** : ajouter `ressources/Linkedin/` et `.playwright-mcp/` → cesse de servir 14+ Mo inutiles sur le domaine.
- [ ] **`git rm -r --cached .playwright-mcp`** (la règle `.gitignore:42` existe déjà mais ne dé-suit pas rétroactivement ; 12 fichiers).
- [ ] **Déplacer** `.btn-magnetic` + `.btn-content` de `home.css:89-97` vers `global.css` → restaure espacement/centrage de l'icône flèche du CTA sur 6 pages qui ne chargent pas `home.css`.
- [ ] **`role="status"`** sur `#form-success` (`index.html:681`) → confirmation d'envoi annoncée aux lecteurs d'écran (`#form-error` a déjà `role="alert"`).
- [ ] **Coquilles** : « oeuvre » → « œuvre » (`confidentialite/index.html:136`) ; « SUCCES » → « SUCCÈS » (`ressources/strategie-axee-valeur/index.html:105,125,126`).
- [ ] **Supprimer le bloc LAMP mort** `global.css:410-546` (0 usage, chargé sur les 25 pages).
- [ ] **`site.webmanifest:2-3`** : `name` → « Novances Évaluation », `short_name` → « Novances » (dès que la marque est tranchée).

---

## 🔴 Constats majeurs

- [ ] **#2 — Marque incohérente** (décision préalable ci-dessus). Appliquer en masse : `og:site_name` ×25, JSON-LD `name` + `publisher.name` (`index.html:28`), `site.webmanifest:2-3`, copyright footer (`index.html:725`), e-mail, et corriger le titre hybride bancal `tarifs/index.html:6`. *Effort : moyen.*
- [ ] **#3 — CSS/JS mort massif** (~700-800 lignes). Supprimer par blocs **en validant visuellement le hero après chaque coupe** :
  - `home.css:114-358`, `583-941`, `1312-1573` (anciens hero `.team-*`, carte `.hr-*`, maquette `.rapport-mockup`/`.rm-*`, `.report-*`/`.hero-rapport--solo`)
  - `global.css:410-546` (bloc `.lamp-*`)
  - `home.js:62-101` (parallax mort)
  - ⚠️ **NE PAS** emporter le hero personas `.hp-*` (vivant) ni `.btn-magnetic` (à déplacer, cf. quick win). Bonus : 2 des 3 cyan hors-token + des alias legacy disparaissent mécaniquement. *Effort : moyen.*
- [ ] **#4 — Visuels Unsplash hotlinkés** sur 4 articles (image + `og:image` + JSON-LD dépendent d'un CDN tiers). Télécharger en local (`assets/img/articles/<slug>.jpg`, licence Unsplash OK), remplacer `src` + `og:image` + image JSON-LD. *Effort : moyen.*
  - `valorisation-basse-opportunite-transmission/index.html:15,46,104` · `croissance-externe-…:46,93` · `litige-associes-…:46,93` · `preparer-succession-…:46,104`
- [ ] **#7 — Contrastes cyan sous WCAG AA** : accent `#0EA5E9`/`#38BDF8` en texte échoue (eyebrows 2.42:1, méta cards 2.01:1, CTA « Parler à un expert » 4.10:1 → **2.77:1 au hover**). Foncer le fond du CTA à ≥4.5:1 (blanc) au repos ET au hover ; eyebrows/méta → bleu sombre (`--p-notaire #1E40AF`) ou `--text-2`. *Effort : moyen.*
  - `global.css:301-306` (`.btn-primary`), `global.css:211` (`.nav-cta`), `home.css:47-49` (`.hero-eyebrow`), `ressources.css:343-344` (`.linkedin-resource-meta`)
- [ ] **#8 — JSON-LD absent des 4 pages cibles** (priority 0.9) + aucun `BreadcrumbList`. Ajouter `Service`/`WebPage`+`Breadcrumb` sur entrepreneurs/avocats/notaires/experts-comptables + tarifs ; `BreadcrumbList` sur articles ; `Person` pour les associés sur `equipe/`. Base réutilisable : `index.html:28`. *Effort : moyen.*
- [ ] **#9 — Résidus d'import LinkedIn** :
  - Markup cassé `<span>…</a>` + lien en dur vers l'ancien domaine `ncf-advisory.fr` : `ressources/valoriser-entreprise-periode-crise-moment-vendre/index.html:124`
  - Emojis interdits (🚨💡✅📊👇📅💬) à retirer (→ puces/ncf-icons) : 4 articles + titre vedette `ressources/index.html:86`. Voir `valorisation-basse-…:94,120,133-145,152`, `humain-reussir-…:7`
  - 9 meta descriptions tronquées « … » à réécrire (~150-160 car., sans entité brute « L&#39;HUMAIN »). *Effort : moyen.*

## 🟡 Constats mineurs

- [ ] **#10 — API `contact.js`** : envelopper `readBody` dans son try/catch → 400 sur JSON invalide (au lieu d'un 502 trompeur, `api/contact.js:82`) ; `signal: AbortSignal.timeout(8000)` sur les 3 fetch (`:52-59`) ; rendre l'appel Note non bloquant (`:130`) ; regex email serveur minimale (`:96`).
- [ ] **#11 — Landmark `<main>` absent sur 8 pages** (accueil, 4 cibles, tarifs, equipe, ressources/index) + ajouter un skip-link masqué révélé au focus. WCAG 2.4.1 / 1.3.1.
- [ ] **#12 — Dev server `serve.mjs`** (hors prod) : path traversal `:33,38` (décode `%2f`, `join` sans confinement) → confiner sous la racine (`resolve` + `startsWith(root + sep)`, sinon 403). Au passage, corriger l'affirmation de `CLAUDE.md` : `serve.mjs` ne reproduit pas vraiment `cleanUrls`.
- [ ] **#13 — `og:image` relatives sur 10 articles** (non résolues par les scrapers sociaux). Préfixer par `https://novances-evaluation.fr`. Articles : business-model-roce, cloture-2022, clotures-2020, controles-fiscaux, deposer-marques, dirigeants-pme-lecon-covid, humain-reussir, strategie-axee-valeur, valorisation-fonds-commerce, valoriser-entreprise. (À traiter avec #4.)
- [ ] **#14 — Titres/descriptions trop longs** : `<title>` jusqu'à 161 car. (`controles-fiscaux:6`) → ~55-60 car. ; descriptions pages cibles >200 car. (`avocats:7` = 272, `experts-comptables:7` = 250) → 150-160 car.

## ℹ️ Points d'hygiène (optionnels / non bloquants)

- [ ] Politique pour `_work/` versionné (69 fichiers, ~14,3 Mo de PNG d'audit) : au minimum dé-suivre les 5 PNG d'audit, ou `_work/**/*.png`. Le `.git` pèse 33 Mo à cause de captures committées (nettoyage d'historique = opération destructive, à coordonner — non prioritaire).
- [ ] Dossier `assets/img/Temoignages/` en CamelCase parmi des dossiers minuscules (fonctionne en prod, les 2 usages respectent la casse) → optionnel : harmoniser en `temoignages/` + MAJ refs (`experts-comptables:347`, `avocats:344`) et `ARCHITECTURE.md:41,57`.
- [ ] Footer : 2 variantes divergentes mineures (loading=lazy, lien Contact `#contact` vs `#cta-final`, tag tronqué) — uniformiser en même temps que le correctif id/class. **Vérifier si `#cta-final` sur les pages cibles est intentionnel** avant d'uniformiser (c'est une ancre valide, pas un lien mort).

---

## Notes de méthode

- Faux-positifs déjà écartés par vérification adversariale. Quelques corrections du 1er passage : le `&display` non échappé dans l'URL Google Fonts est **conforme HTML5** (ne pas « corriger ») ; les variantes de footer et l'absence de equipe/partenaires dans la navbar (choix éditorial) ont été rétrogradées en info.
- Aucune réécriture d'historique git nécessaire pour les quick wins.
- Principe projet : **simplicité d'abord, modifications chirurgicales**. Pas de build à introduire pour ces corrections.
