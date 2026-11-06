# Portfolio · Samuel Atlani

Mon portfolio de développeur web fullstack, sous la forme d'un petit jeu de plateforme.

**En ligne : https://samepk.github.io**

## Le principe

- On avance dans un niveau en 2D avec les flèches (ou Q / D), on saute avec Espace.
- Chaque **portail** est un projet : on l'ouvre avec E pour voir sa description et sa stack.
- Les **orbes** sont des compétences à ramasser ; elles s'allument ensuite dans la section Inventaire.
- Sur mobile, des boutons tactiles remplacent le clavier.
- Une **version texte** complète est disponible sous le jeu.

## Technique

Aucun framework ni dépendance : HTML, CSS et JavaScript.

- Rendu du niveau sur `<canvas>` (parallaxe, physique du personnage, écharpe simulée en Verlet)
- Interface et fiches projets en DOM, accessibles au clavier
- Respect de `prefers-reduced-motion`

```
index.html
assets/css/style.css   styles
assets/js/data.js      contenu : projets et compétences
assets/js/main.js      jeu et interactions
```

## Lancer en local

Ouvrir `index.html` dans un navigateur, ou servir le dossier :

```bash
npx serve .
```
