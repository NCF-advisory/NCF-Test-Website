# Architecture du site Novances Évaluation

Le site reste statique : les URLs publiques sont portées par les dossiers de pages, tandis que les fichiers partagés vivent dans `assets/`.

Depuis la refonte « pages-cibles », les pages sont organisées **par audience** (un entrepreneur, trois familles de prescripteurs) et non plus par offre.

```txt
/
  index.html                      # accueil (hub : tous les CTA renvoient vers /#contact)

  entrepreneurs/index.html        # cible : dirigeant de PME (ex-/transmission)
  experts-comptables/index.html   # cible prescripteur
  avocats/index.html              # cible prescripteur
  notaires/index.html             # cible prescripteur

  tarifs/index.html
  equipe/index.html
  partenaires/index.html
  ressources/                     # publications (index + 1 dossier par article)
    <slug-article>/index.html
    Linkedin/                     # HTML bruts LinkedIn (non indexé, source d'import)
  mentions-legales/index.html
  confidentialite/index.html

  assets/
    css/
      global.css                  # tokens :root + chrome (navbar/footer/band)
      components/
        autocycle.css             # composant « Pourquoi nous » (onglets auto-cyclés)
      pages/                      # un fichier par page (chargé après global.css)
        home.css  parcours.css  tarifs.css
        equipe.css  partenaires.css  ressources.css  legal.css
    js/
      site.js                     # commun, chargé partout (navbar, menu mobile, reveal)
      autocycle.js                # composant « Pourquoi nous »
      pages/
        home.js
    ncf-icons/                    # librairie d'icônes maison (sprite + classes)
    img/
      brand/  clients/  team/     # logos, références, photos équipe
      Temoignages/  tools/        # photos témoins, logos outils
      articles/                   # visuels des publications (<slug>.jpg, <slug>-body{n}.jpg)

  api/
    contact.js                    # route serverless Vercel → Pipedrive

  _work/                          # bac à sable (non déployé, voir CLAUDE.md)
```

## Conventions

- Garder les pages publiques à leur emplacement actuel pour préserver les URLs propres et le SEO. Ne jamais renommer un slug publié sans redirection Vercel (`vercel.json`).
- `global.css` et `site.js` sont chargés sur **toutes** les pages.
- Mettre les styles propres à une page dans `assets/css/pages/<page>.css`, chargé après `global.css`. Les composants réutilisables vont dans `assets/css/components/`.
- Mettre le JavaScript propre à une page dans `assets/js/pages/<page>.js`.
- Source de vérité du design system : les tokens `:root` de `global.css` (palette « Institutionnel clair v2 »). Icônes **uniquement** via `assets/ncf-icons/`.
- Ranger les images publiques par usage : `brand`, `team`, `clients`, `Temoignages`, `tools`, `articles`.
- Ranger les briefs, prompts et prototypes dans `_work/` ; ce dossier n'est pas déployé sur Vercel.

## Le template des pages cibles

Les quatre pages d'audience (`entrepreneurs`, `experts-comptables`, `avocats`, `notaires`) partagent **un seul template**, différencié uniquement par une classe persona sur `<body>` :

```html
<body class="parcours-page is-<persona>">
  <!-- is-entrepreneurs | is-experts-comptables | is-avocats | is-notaires -->
```

```txt
global.css  +  pages/parcours.css  +  components/autocycle.css
site.js     +  autocycle.js
```

La classe `is-<persona>` mappe le token `--p-*` vers `--persona` (en tête de `parcours.css`), ce qui pilote la couleur d'accent de toute la page. `parcours.css` mutualise le chrome de ces pages (hero, méthode, témoignage, FAQ, CTA, bandeau Groupe Novances…). Le bloc **« Pourquoi nous »** qui met en avant les 3 arguments différenciants est le **composant autocycle** (`components/autocycle.css` + `autocycle.js`, onglets auto-cyclés) ; sa teinte est héritée via `--persona`. Pour créer une nouvelle page cible, dupliquer une page existante et ajuster le contenu + la classe persona — ne pas créer de nouveau CSS de page.

## Correspondance page → assets

| Page | CSS de page | JS de page |
|------|-------------|-----------|
| `/` (accueil) | `pages/home.css` | `pages/home.js` |
| `/entrepreneurs/` `/experts-comptables/` `/avocats/` `/notaires/` | `pages/parcours.css` + `components/autocycle.css` | `js/autocycle.js` |
| `/tarifs/` | `pages/tarifs.css` | — |
| `/equipe/` | `pages/equipe.css` | — |
| `/partenaires/` | `pages/partenaires.css` | — |
| `/ressources/` | `pages/ressources.css` | — |
| `/ressources/<slug>/` (articles) | styles propres à l'article (inline) | — |
| `/mentions-legales/` `/confidentialite/` | `pages/legal.css` | — |

(`global.css` et `site.js` en plus, partout.)

## Ajouter une page

1. Créer le dossier public avec son `index.html`.
2. Charger `global.css`, puis un CSS de page seulement si nécessaire. Pour une page d'audience, réutiliser le template ci-dessus (`parcours.css` + composant `autocycle`).
3. Charger `site.js` avant `</body>` (et `autocycle.js` si la page utilise le bloc « Pourquoi nous »).
4. Renseigner les balises SEO (`canonical`, Open Graph, JSON-LD) vers `https://novances-evaluation.fr`.
5. Ajouter la page dans `sitemap.xml` si elle doit être indexée.
6. Utiliser des chemins absolus pour les assets, par exemple `/assets/img/brand/logo-ncf-bl-marine.png`.

Pour un article de ressources, suivre le workflow d'import décrit dans `CLAUDE.md` (section « Contenu — articles Ressources »).
