# Goblin Survivor -99 — Game Design Document

> **Document de conception — version de travail 1.0**  
> **Date :** 17 novembre 2026  
> **Statut :** direction de jeu définie, plusieurs paramètres à valider en prototype v2.  
> **Portée :** formaliser le concept et les décisions connues ; ce document ne modifie ni ne remplace le prototype existant.

## Convention de lecture

- **[ÉTABLI]** désigne une intention explicitement retenue, un principe de conception, un retour utilisateur à traiter comme exigence, ou une donnée/mécanique attestée dans le prototype v1.
- **[HYPOTHÈSE]** désigne une proposition à tester, une valeur provisoire, ou un détail qui n’a pas encore été tranché.
- [ÉTABLI] La mention **v1 observé** signifie « présent dans le prototype inspecté », et non « validé par les joueurs ».
- [ÉTABLI] Les valeurs de départ ci-dessous distinguent les paramètres effectivement lus dans le bloc `CONFIG` de propositions d’équilibrage. Elles ne prétendent pas constituer un équilibrage final.

---

## 1. Vision et piliers

### 1.1 Vision

- [ÉTABLI] **Goblin Survivor -99** est un dungeon crawler inversé : le joueur ne contrôle pas un héros glorieux qui nettoie les profondeurs, mais un gobelin faible qui tente de rester vivant dans le sillage de héros dangereux.
- [ÉTABLI] L’expérience s’appuie sur une exploration procédurale, une carte qui conserve les lieux déjà découverts, des expéditions de plus en plus profondes et des refuges réguliers.
- [ÉTABLI] L’objectif dramatique n’est pas de vaincre les héros en combat direct. Le gobelin survit par évitement, ruse, négociation, pièges, détour ou sacrifice d’un allié.
- [ÉTABLI] Une partie est une suite de décisions de risque : **jusqu’où s’enfoncer avant de faire demi-tour ?**
- [ÉTABLI] La mort est définitive pour l’expédition. Elle produit une épitaphe personnalisée et une trace dans un mémorial local, sans recours à une IA générative.
- [ÉTABLI] Le ton mêle humour absurde et satirique à une mélancolie sincère : la plaisanterie porte sur les procédures, pas sur l’effacement de la perte.
- [ÉTABLI] La cible initiale est un jeu minimaliste en une page HTML/Canvas, jouable hors ligne et conçu en priorité pour smartphone.
- [HYPOTHÈSE] Le jeu complet vise des sessions courtes et répétables, mais doit aussi récompenser une expédition prudente de plusieurs refuges sans devenir une corvée de gestion.

### 1.2 Piliers de conception

| Pilier | Conséquence concrète |
|---|---|
| [ÉTABLI] Qualité des décisions | Le choix de route, de consommation, d’arrêt ou de repli importe davantage que des statistiques qui montent. |
| [ÉTABLI] Survie par la ruse | Les menaces se contournent, se retardent ou se détournent ; pas de duel direct contre les héros. |
| [ÉTABLI] Danger lisible | Traces, sons, lumière et indices doivent annoncer un risque avant qu’il ne soit irréversible, sauf rares exceptions explicitement injustes et comiques. |
| [ÉTABLI] Progression perceptible | La progression principale est la distance parcourue depuis un refuge et le butin/récit rapporté, pas une inflation de puissance. |
| [ÉTABLI] Humour émergent | Les systèmes combinent ressources, rencontres et décisions pour produire des incidents racontables, plutôt qu’une succession de blagues fixes. |
| [ÉTABLI] Prototype avant architecture | Tester rapidement les hypothèses de boucle, de contrôles et de tension avant de construire une architecture lourde. |
| [ÉTABLI] Lecture immédiate | La carte, les ressources critiques, les issues et les menaces doivent être compréhensibles sur petit écran. |

### 1.3 Ce que le jeu n’est pas

- [ÉTABLI] Ce n’est pas un jeu de combat où le gobelin devient progressivement capable d’affronter les héros.
- [ÉTABLI] Ce n’est pas un jeu d’optimisation de statistiques dont le but principal est de maximiser la puissance.
- [HYPOTHÈSE] Ce n’est pas un roguelike d’étages entièrement oubliés entre les parties : la mémoire cartographique appartient à l’identité du jeu, mais sa persistance exacte reste à définir.
- [HYPOTHÈSE] Le format final reste volontairement léger ; les besoins hors ligne et smartphone doivent limiter les dépendances et la complexité d’interface.

---

## 2. Décisions établies et hypothèses

| Sujet | État | Décision / hypothèse formalisée |
|---|---|---|
| [ÉTABLI] Fantaisie | Établi | Gobelin fragile, joueur en position de proie, donjon vu depuis l’envers de l’aventure héroïque. |
| [ÉTABLI] Résolution des héros | Établi | Pas de combat direct ; ruse, fuite, pièges, alliés et détournements. |
| [ÉTABLI] Mort | Établi | Mort définitive de l’expédition ; épitaphe procédurale et mémorial local. |
| [ÉTABLI] Interactions de base | Établi | Payer, parler, recruter ou fuir sont les options sociales de référence. |
| [ÉTABLI] Compagnon | Établi | Un seul allié actif à la fois. |
| [ÉTABLI] Structure macro | Établi | Donjon gigantesque et continu, progression verticale profonde, refuges environ tous les quatre étages. |
| [ÉTABLI] Carte | Établi | Le monde conserve une mémoire des zones explorées ; le joueur ne devrait pas perdre arbitrairement ses repères. |
| [ÉTABLI] Ressources de voyage | Établi | Huile, vivres, eau, PV et or forment le budget entre deux auberges. |
| [ÉTABLI] Menace annoncée | Établi | Les héros en vadrouille sont annoncés par des indices avant leur apparition. |
| [ÉTABLI] Bruit | Établi | Jauge de bruit locale, plutôt qu’une alerte globale du donjon. |
| [ÉTABLI] Retour d’essai : auberge | Établi | Le joueur doit pouvoir **se déplacer dans l’auberge** ; ce lieu devient une petite grille explorable, pas seulement une série de menus. |
| [ÉTABLI] Retour d’essai : clavier | Établi | Le jeu doit être jouable simplement au clavier. |
| [ÉTABLI] Retour d’essai : commandes | Établi | Réduire le nombre de boutons : déplacement comme commande centrale et interaction contextuelle par « bump ». |
| [ÉTABLI] Retour d’essai : fouille | Établi | Fouille passive ou intégrée au déplacement/à l’attente ; éviter une commande dédiée obligatoire à chaque case. |
| [ÉTABLI] Retour d’essai : besoins | Établi | Manger/boire doit passer par menu rapide ou touches simples, avec suggestion automatique quand une jauge devient basse. |
| [ÉTABLI] Retour d’essai : mobile | Établi | Au maximum un bouton d’action contextuel en plus du déplacement sur mobile. |
| [HYPOTHÈSE] Dimensions | Hypothèse | Conserver le 9×9 du v1 pour le test v2, puis évaluer le besoin d’une grille plus grande ou de cartes connectées. |
| [HYPOTHÈSE] Donjon continu | Hypothèse | « Continu » signifie une progression connectée et persistante entre couches, sans écran de fin d’étage qui casse l’expédition ; la représentation exacte reste à tester. |
| [HYPOTHÈSE] Mémoire persistante | Hypothèse | Les lieux cartographiés persistent au moins durant la partie ; la persistance entre parties n’est pas décidée. |
| [HYPOTHÈSE] Durée de vie des ressources | Hypothèse | Les ressources doivent créer une décision de repli sans transformer chaque trajet en calcul d’épuisement prévisible. |
| [HYPOTHÈSE] Économie | Hypothèse | L’or doit avoir des débouchés réguliers et un coût d’opportunité ; aucun stock illimité sans utilité. |
| [HYPOTHÈSE] Fin à -99 | Hypothèse | Atteindre l’étage -99 est un jalon terminal ou une fin de campagne, à préciser : le concept expose « -99 », mais les règles de victoire ne sont pas encore définies. |
| [HYPOTHÈSE] Cibles de profondeur | Hypothèse | Les jalons 5/10/20/50 servent de tests de progression et de rythme, pas encore de contenu garanti. |

---

## 3. Boucle de jeu

### 3.1 Boucle macro : expédition entre refuges

1. [ÉTABLI] **Préparer au refuge.** Faire le tour de l’auberge, lire les rumeurs, se ravitailler, vendre du butin, recruter si le besoin et le budget le justifient.
2. [ÉTABLI] **Choisir le départ.** Le joueur part avec une réserve limitée en huile, vivres, eau, PV et capacité de portage.
3. [ÉTABLI] **Explorer.** Parcourir des salles, mémoriser la carte, suivre les ressources et observer les traces du passage des héros.
4. [ÉTABLI] **Arbitrer le risque.** Fouiller, prendre un trésor, boire à une source incertaine, camper ou éviter une rencontre a un coût en temps, en bruit ou en ressources.
5. [ÉTABLI] **Décider : pousser ou revenir.** L’escalier descendant ouvre le potentiel de progression ; remonter vers le refuge conserve le butin et réinitialise la préparation.
6. [ÉTABLI] **Atteindre un refuge.** L’auberge est une zone sûre et un lieu physique à explorer ; le joueur peut y reconstituer son plan et dépenser son or.
7. [ÉTABLI] **Repartir plus loin.** La profondeur et la carte connue rendent les trajets suivants différents ; la progression est d’abord une capacité de parcours et de retour.
8. [ÉTABLI] **Mourir et laisser une trace.** Si le joueur échoue, le récit final enregistre la cause et le contexte ; l’expédition ne reprend pas.

### 3.2 Boucle micro : tour de jeu

- [HYPOTHÈSE] Un déplacement volontaire, une interaction, une fouille active ou une attente constitue un tour consommant le temps de l’expédition.
- [ÉTABLI] Le déplacement d’une case est l’action de base ; une tentative de déplacement dans un mur ne doit pas coûter une ressource de déplacement si elle ne fait pas avancer, à valider avec les retours de test.
- [ÉTABLI] Une action contextuelle est déclenchée par collision volontaire (« bump ») avec une porte, un personnage ou un objet pertinent ; les détails de la case courante peuvent être ouverts par une seule action contextuelle si le bump n’est pas possible.
- [HYPOTHÈSE] À chaque tour passé dans le donjon, l’huile, les besoins, le bruit local et les menaces évoluent selon des règles cohérentes et visibles.
- [HYPOTHÈSE] Les auberges suspendent la consommation et l’évolution des menaces ; elles constituent le seul espace de repos garanti.
- [ÉTABLI] Les choix sociaux restent limités et lisibles : payer, parler, recruter ou fuir. Les conséquences doivent apparaître avant confirmation quand le coût est connu.
- [HYPOTHÈSE] Un menu de choix n’est ouvert que si la situation le justifie (rencontre, choix de butin, repas), et ne remplace pas le déplacement de la grille.

### 3.3 Tension et retour

- [ÉTABLI] La tension centrale est la comparaison entre le gain potentiel d’un étage supplémentaire et le coût probable pour rentrer.
- [HYPOTHÈSE] L’interface doit estimer le risque de retour par des signaux simples (réserves, distance du refuge, menace repérée), pas par une recommandation opaque calculée par le jeu.
- [HYPOTHÈSE] Les escaliers entre couches permettent de remonter la carte déjà visitée sans recréer arbitrairement l’étage ni faire suivre automatiquement un héros d’une couche à l’autre.
- [ÉTABLI] Un trésor rapporté doit avoir plus de valeur ludique qu’un trésor simplement ramassé : retour, vente ou usage conditionnent le bénéfice.

---

## 4. Monde

### 4.1 Structure du donjon

- [ÉTABLI] Le donjon est gigantesque, profond et continu dans sa logique de progression ; sa carte garde la mémoire des zones explorées.
- [ÉTABLI] Une auberge ou station sûre apparaît environ tous les quatre étages. Elle marque une étape, un point de ravitaillement et un repère narratif.
- [HYPOTHÈSE] La profondeur est affichée sous forme d’étages négatifs, avec l’étage -99 comme limite thématique ; le prototype v1 utilise une progression positive et devra être harmonisé si ce choix est retenu.
- [ÉTABLI] Les étages sont procéduraux mais doivent rester lisibles et navigables ; la génération garantit des connexions et ne doit jamais rendre l’escalier inaccessible.
- [HYPOTHÈSE] Une carte d’étage peut être constituée de petites salles connectées ou d’un réseau de pièces ; le 9×9 est une maquette de validation, pas une limite du monde final.
- [ÉTABLI] Une sortie/échelle connue, les entrées et les refuges doivent être mémorisés, même si certaines cases ne sont pas actuellement visibles.
- [HYPOTHÈSE] Les zones déjà parcourues conservent leur état (objets pris, pièges révélés, traces, habitants), au moins pendant la partie courante.

### 4.2 Auberges explorables

- [ÉTABLI] L’auberge est un lieu jouable en petite grille : le gobelin peut s’y déplacer au clavier, au swipe ou aux flèches tactiles.
- [ÉTABLI] La collision avec le comptoir, le marché, la taverne, les couchettes ou un personnage déclenche l’interaction associée ; les menus restent contextuels, non comme écran d’accueil obligatoire.
- [ÉTABLI] Les fonctions de refuge comprennent : marché (huile, vivres, eau), taverne (rumeurs, recrutement, habitants) et dortoir/repos.
- [ÉTABLI] Les auberges sont des zones sûres : pas de héros qui attaquent, pas de consommation normale des réserves et pas de pénalité de temps pendant la préparation (règle à vérifier techniquement).
- [HYPOTHÈSE] Chaque auberge possède un plan compact reconnaissable, des éléments de décor récurrents et un détail singulier généré (nom, aubergiste, formulaire, rumeur).
- [ÉTABLI] L’espace de portage est limité ; un sac trop plein oblige à vendre, abandonner ou choisir quoi emporter.
- [HYPOTHÈSE] La grille d’auberge doit rester plus simple qu’un étage d’exploration et ne pas faire de l’approvisionnement une séquence de déplacements longue.

### 4.3 Familles d’étages et biomes

| État | Famille proposée | Identité de jeu / éléments possibles |
|---|---|---|
| [HYPOTHÈSE] | Couloirs administratifs | Signalétique absurde, portes verrouillées, péages et formulaires ; lisibilité forte des voies. |
| [HYPOTHÈSE] | Champignonnière humide | Ressources alimentaires, spores, flaques douteuses et visibilité réduite. |
| [HYPOTHÈSE] | Nécropole de héros | Cadavres, équipement abandonné, traces de conflit et choix de charognage. |
| [HYPOTHÈSE] | Galerie minière | Puits, embranchements, éboulements potentiels et richesse plus forte mais risques sonores. |
| [HYPOTHÈSE] | Réseau inondé | Eau accessible mais itinéraires contraints ; l’huile et le matériel deviennent précieux. |
| [HYPOTHÈSE] | Quartier des résidents | Habitants plus nombreux, services alternatifs et règles locales imprévisibles. |
| [HYPOTHÈSE] | Étages des héros | Indices plus denses, passages forcés et menaces fréquentes ; l’évitement prime. |
| [HYPOTHÈSE] | Variation procédurale | Définir une poignée de familles combinables plutôt qu’un biome unique par étage, pour maîtriser coûts et cohérence. |

- [HYPOTHÈSE] La première version de test n’a pas besoin de tous ces biomes : choisir deux familles contrastées suffit à tester la lisibilité et les ressources.
- [ÉTABLI] Les éléments doivent signaler leur fonction sans dépendre uniquement de la couleur, notamment pour l’accessibilité et les écrans mobiles.

---

## 5. Ressources et économie

### 5.1 Ressources principales

| Ressource | Rôle établi | Pression de jeu |
|---|---|---|
| [ÉTABLI] Huile de lanterne | La lumière permet de voir autour du gobelin ; le rayon se réduit à mesure que l’huile baisse. | La pénurie oblige à ralentir, se guider par la mémoire ou solliciter quelqu’un, au risque d’attirer une menace. |
| [ÉTABLI] Vivres | Maintiennent le gobelin ; sources possibles : marché, champignons, cadavres et rations. | La faim entraîne une mort piteuse si le joueur persiste sans nourriture. |
| [ÉTABLI] Eau | Maintient le gobelin ; sources possibles : marché, puits et flaques. | La soif doit être une pression claire et prioritaire ; mourir de soif est possible. |
| [ÉTABLI] PV | Marge d’erreur face aux pièges, créatures et conséquences d’événements. | Les PV sont une réserve, pas une invitation au combat direct. |
| [ÉTABLI] Or | Achats, paiement, repos et recrutement ; le butin convertit le risque en capacité de poursuivre. | L’or ne remplace pas le choix de route et doit rester soumis au portage et aux opportunités de dépense. |
| [ÉTABLI] Capacité de portage | Limite les objets emportés, notamment butin, rations et équipements à usage unique. | Force à arbitrer entre utilité immédiate et valeur potentielle au refuge. |

### 5.2 Valeurs de départ observées dans `CONFIG` v1

| Paramètre v1 observé | Valeur | Commentaire de lecture |
|---|---:|---|
| [ÉTABLI] `W`, `H` | 9 × 9 | Taille de grille utilisée dans le prototype. |
| [ÉTABLI] `FLOORS_PER_INN` | 4 | Une nouvelle auberge est prévue tous les quatre étages dans le prototype. |
| [ÉTABLI] `PORTAGE` | 6 | Nombre d’objets que le sac peut porter. |
| [ÉTABLI] `MAX_HP` | 10 | Maximum de PV. |
| [ÉTABLI] `START.oil` | 46 | Huile au départ. |
| [ÉTABLI] `START.food` | 7 | Vivres au départ. |
| [ÉTABLI] `START.water` | 9 | Eau au départ. |
| [ÉTABLI] `START.hp` | 10 | PV au départ. |
| [ÉTABLI] `START.gold` | 9 | Or au départ. |
| [ÉTABLI] `OIL_STEP` | 0,62 / tour | Consommation d’huile par tour de donjon dans le code actuel. |
| [ÉTABLI] `WATER_STEP` | 0,09 / tour | Consommation d’eau par tour, avant dégâts de soif. |
| [ÉTABLI] `FOOD_STEP` | 0,045 / tour | Consommation de vivres par tour, avant dégâts de faim. |
| [ÉTABLI] `EMPTY_WATER_DAMAGE` | 0,85 PV | Dégât quand l’eau est vide et que l’intervalle correspondant arrive. |
| [ÉTABLI] `EMPTY_FOOD_DAMAGE` | 0,55 PV | Dégât quand les vivres sont vides et que l’intervalle correspondant arrive. |
| [ÉTABLI] `EMPTY_WATER_EVERY` | 2 tours | Fréquence de dégâts de soif lorsque la réserve est à zéro. |
| [ÉTABLI] `EMPTY_FOOD_EVERY` | 4 tours | Fréquence de dégâts de faim lorsque la réserve est à zéro. |
| [ÉTABLI] `OIL_VISION` | seuils 18→4, 7→3, 1→2 cases | Paliers codés ; `DARK_VISION` vaut 1 case si l’huile est vide. |
| [ÉTABLI] `INN_OIL`, `INN_FOOD`, `INN_WATER` | 27, 5, 7 | Paramètres déclarés dans `CONFIG` ; leur emploi exact n’est pas celui des achats affichés dans le menu v1. |
| [ÉTABLI] `HUNTER_DELAY` | 5 tours | Délai de manifestation d’une menace une fois l’annonce lancée. |
| [ÉTABLI] `HUNTER_CHANCE` | 0,02 | Valeur de configuration ; code v1 emploie un tirage lié à `HUNTER_CHANCE × 0,12` après le tour 4. |
| [ÉTABLI] `NOISE_HUNTER` | 0,015 | Valeur présente dans `CONFIG` ; la logique v1 de bruit se base surtout sur seuils locaux et valeurs directes, pas sur ce champ. |
| [ÉTABLI] `SEED` | `null` | Si aucune graine n’est fournie, le prototype en dérive une de l’horloge. |

### 5.3 Lecture critique des valeurs

- [ÉTABLI] Dans v1, une case parcourue ne coûte pas seulement de l’huile : elle fait aussi avancer la consommation d’eau/vivres et peut faire évoluer une menace. L’économie du tour porte donc plusieurs risques simultanés.
- [HYPOTHÈSE] Les taux v1 servent de référence de départ au test, pas d’équilibrage acquis. Les résultats doivent être interprétés en fonction des choix réels des joueurs, pas seulement d’un bot qui suit un escalier.
- [ÉTABLI] Les montants du menu v1 sont : huile +15 pour 3 or, vivres +4 pour 2 or, eau +5 pour 2 or, ration à usage unique pour 2 or, piège pliant pour 4 or ; dortoir : 3 or ; bijoux vendus 3 or, reliques 6 or.
- [ÉTABLI] Le refuge v1 accorde à l’arrivée +3 PV, +2 or et +6 huile (dans la limite de 50) ; les valeurs `INN_*` du bloc `CONFIG` ne correspondent pas directement aux quantités proposées par le menu d’achat.
- [HYPOTHÈSE] Cette incohérence doit être résolue en v2 : soit faire de `INN_*` des valeurs d’approvisionnement gratuites, soit les retirer du réglage/documentation, mais ne pas laisser des paramètres sans effet interprétable.

### 5.4 Valeurs proposées pour l’équilibrage v2

| Élément de réglage | Proposition de départ | État et justification |
|---|---:|---|
| [HYPOTHÈSE] Réserve de départ | reprendre v1 : 46 huile, 7 vivres, 9 eau, 10 PV, 9 or | Garder une base comparable aux 700 simulations précédentes. |
| [HYPOTHÈSE] Consommation | reprendre 0,62 huile, 0,045 vivres, 0,09 eau par tour de donjon | Mesurer le ressenti sur trajets joués ; ne pas considérer le ratio bot comme équilibrage final. |
| [HYPOTHÈSE] Périodicité refuge | tous les 4 étages | Conserver l’hypothèse déjà encodée en v1 pendant le test v2. |
| [HYPOTHÈSE] Achat de marché | conserver provisoirement les prix et quantités v1 | Tester si les choix sont significatifs et si l’or manque réellement. |
| [HYPOTHÈSE] Portage | 6 emplacements | Vérifier si le joueur doit fréquemment abandonner un objet ou si le sac est simplement un compteur sans conséquence. |
| [HYPOTHÈSE] Dégâts à sec | ne pas augmenter avant test | La soif est déjà une cause majeure de décès v1 ; la lisibilité et les moyens de secours sont prioritaires. |
| [HYPOTHÈSE] Limites des jauges | vivres/eau 12, huile 50, PV 10 | Cohérent avec les barres et plafonds de soin codés ; à confirmer en v2. |

### 5.5 Anti-accumulation et objets à usage unique

- [ÉTABLI] Le portage limité est le premier mécanisme anti-accumulation ; conserver une capacité simple à comprendre et affichée en permanence.
- [HYPOTHÈSE] Ajouter des coûts de transaction ou une demande variable serait prématuré : ne pas empiler taxes, poids individuel et dégradation tant que le sac v1 n’a pas été testé qualitativement.
- [ÉTABLI] Des objets à usage unique possibles existent déjà en v1 : rations et piège pliant. Les consommables d’eau transportés et le statut des objets « piège pliant » devront être normalisés.
- [HYPOTHÈSE] Chaque objet à usage unique porte un effet immédiatement lisible, sans recettes ni écran d’artisanat pour le prototype v2.
- [HYPOTHÈSE] Un joueur ne doit pas pouvoir accumuler une quantité illimitée de trésors sans sacrifier les ressources de survie ; les trésors occupent donc le sac jusqu’à la vente au refuge.

---

## 6. Exploration, obscurité, camping et fouille

### 6.1 Exploration et mémoire

- [ÉTABLI] Le jeu conserve une mémoire cartographique : déjà vu reste distinct de visible maintenant.
- [ÉTABLI] La vision est décrite comme un cercle qui rétrécit avec l’huile ; le prototype v1 utilise actuellement une distance de Manhattan, à remplacer ou assumer visuellement comme approximation.
- [ÉTABLI] Quand l’huile manque, le gobelin avance à tâtons en espérant croiser quelqu’un ; le manque d’huile doit modifier la sensation de navigation, pas seulement réduire une barre.
- [HYPOTHÈSE] En obscurité complète, autoriser le déplacement sur cases connues, et limiter la vision à une case autour du gobelin ; afficher clairement la différence entre inconnu, mémorisé et visible.
- [HYPOTHÈSE] Une rencontre ou une aide peut recharger l’huile, mais ne doit pas transformer le manque d’huile en bouton d’assistance sans risque.

### 6.2 Fouille et trésors

- [ÉTABLI] L’exploration peut révéler champignons, cadavres, puits, flaques, coffres et pièges.
- [ÉTABLI] Les coffres peuvent donner des bijoux/reliques et de l’or, mais leur ouverture peut être piégée et faire du bruit.
- [ÉTABLI] Un piège caché doit pouvoir être repéré ou déclenché ; l’information est une récompense de prudence.
- [HYPOTHÈSE] La fouille passive s’effectue à l’entrée dans une case ou en la traversant : les éléments proches sont signalés par un indice discret, sans révéler automatiquement toutes leurs conséquences.
- [HYPOTHÈSE] L’action « fouiller » explicite devient facultative : une attente ou une action contextuelle peut examiner la zone adjacente et augmente le bruit local.
- [HYPOTHÈSE] Le signalement d’un piège doit préciser sa position connue et un moyen de le contourner ; ne pas punir le joueur avec un objet visible mais ininterprétable.

### 6.3 Champignons, cadavres, puits et flaques

- [ÉTABLI] Les champignons sont des vivres possibles mais risqués ; les effets sont tirés au hasard à chaque partie.
- [ÉTABLI] Le v1 distingue des effets bénéfiques, neutres, toxiques ou hallucinatoires et mémorise le résultat d’une couleur au cours de la partie.
- [HYPOTHÈSE] Les effets et leur distribution restent secrets au départ, mais l’apparence des champignons doit permettre d’apprendre quelque chose ; ne pas faire de chaque bouchée un pari entièrement indéchiffrable.
- [ÉTABLI] Les cadavres laissés par les héros sont une ressource alimentaire possible et un indice de danger récent.
- [HYPOTHÈSE] Le charognage peut attirer des nuisibles, augmenter le bruit ou provoquer un événement ; indiquer le risque avant une confirmation de repas si le signal est connu.
- [ÉTABLI] Les puits posent la question « qu’y a-t-il dedans ? » ; ils peuvent donner de l’eau ou autre chose, avec incertitude.
- [ÉTABLI] Les flaques fournissent une source d’eau possible, mais de qualité douteuse.
- [HYPOTHÈSE] L’eau de puits et de flaque doivent offrir au moins un résultat fiable occasionnellement et une indication de risque, sans invalider la planification de ressource.

### 6.4 Camping

- [ÉTABLI] Le camping est possible mais dangereux ; il peut restaurer des PV au prix de vivres, d’eau et d’huile et exposer le gobelin à une visite.
- [ÉTABLI] Le prototype v1 demande 3 huile, 1 vivre et 1 eau, rend 3 PV, puis applique un risque d’attaque ; ce comportement est observé, non validé.
- [HYPOTHÈSE] Le camping devient une option tactique facultative, jamais une action nécessaire pour compenser un système de dégâts trop sévère.
- [HYPOTHÈSE] La sécurité d’un emplacement (case explorée, salle dégagée, traces récentes) doit influer lisiblement sur le risque.
- [HYPOTHÈSE] En v2, tester si le camping mérite une action dédiée ou peut être proposé dans un menu contextuel « attendre / se reposer ».

---

## 7. Habitants et interactions sociales

### 7.1 Variété et rôles

- [ÉTABLI] Les habitants sont des acteurs du donjon, pas uniquement des ennemis ; ils peuvent être rencontrés, négociés ou recrutés.
- [ÉTABLI] Les profils observés dans le prototype incluent notamment le rat percepteur, le squelette concierge et le slime territorial.
- [HYPOTHÈSE] Les futurs résidents peuvent occuper des rôles lisibles : vendeur ambulant, guide, gardien de puits, récupérateur, informateur, aubergiste itinérant ou créature territoriale.
- [HYPOTHÈSE] Chaque type doit proposer un service ou un choix distinctif ; multiplier des variantes de texte sans nouvelle conséquence ne constitue pas une vraie variété.
- [ÉTABLI] Le ton des interactions peut être bureaucratique, déplacé ou étrangement tendre, sans effacer l’utilité mécanique de la décision.

### 7.2 Les quatre interactions

| Interaction | Effet attendu | Condition / risque |
|---|---|---|
| [ÉTABLI] Payer | Obtenir passage, service, ressource ou apaisement. | Coût affiché avant confirmation ; l’or dépensé ne peut plus servir au refuge. |
| [ÉTABLI] Parler | Recevoir indice, rumeur, histoire ou refus. | Information parfois vague ; la conversation ne doit pas être systématiquement rentable. |
| [ÉTABLI] Recruter | Ajouter un compagnon temporaire à l’expédition. | Un seul allié actif ; recrutement contraint par or, confiance ou service rendu. |
| [ÉTABLI] Fuir | Sortir de la rencontre sans affrontement. | Peut consommer un tour, provoquer du bruit ou faire perdre une occasion. |

- [ÉTABLI] Le prototype v1 demande 2 or pour payer le rat et procure +4 huile ; parler a un résultat incertain ; recruter coûte 4 or ; fuir déplace le gobelin d’une case.
- [HYPOTHÈSE] Les options ne doivent pas toutes se ramener à « payer » ; l’intérêt du parler, du recrutement et de la fuite est à équilibrer selon le profil du résident.
- [HYPOTHÈSE] Un choix social demeure concis, avec un maximum de quatre réponses visibles et une formulation qui précise coût et conséquence probable.

### 7.3 Allié : rôle et durée de vie

- [ÉTABLI] Un seul allié actif peut accompagner le gobelin.
- [ÉTABLI] La fonction principale de l’allié est de détourner le danger : le prototype v1 prévoit qu’il s’interpose une fois face à un héros, puis disparaît, donnant au gobelin une occasion de fuite.
- [HYPOTHÈSE] La durée de vie recommandée pour le v2 est **un incident majeur**, plutôt qu’un nombre fixe d’étages ; cela rend le sacrifice visible et le recrutement contextuel.
- [HYPOTHÈSE] L’allié peut aussi fournir une fonction secondaire limitée (indice, réduction de bruit, repérage), mais le v2 devrait tester une seule fonction pour conserver la lisibilité.
- [ÉTABLI] La disparition de l’allié doit être mémorisée afin d’alimenter l’épitaphe, sans rendre obligatoire son sacrifice pour atteindre le refuge.

---

## 8. Héros et menace

### 8.1 Profils de héros

- [ÉTABLI] Les héros sont menaçants par leur comportement, pas seulement par des PV et une attaque.
- [ÉTABLI] Profils visés : **complétionniste**, **cupide**, **purificateur**, **pressé**, **mage** et **imprévisible**.
- [HYPOTHÈSE] Chaque profil doit modifier les signes, les lieux visités et le type de risque : par exemple, le complétionniste fouille les salles, le cupide ouvre les coffres, le purificateur détruit des sources, le pressé traverse vite, le mage perturbe l’éclairage et l’imprévisible change de route.
- [HYPOTHÈSE] Dans le premier prototype jouable, un comportement de héros unique et un seul profil visuellement distinct suffisent ; tester six IA simultanément ferait perdre la capacité d’attribuer les résultats.
- [ÉTABLI] Aucun profil ne transforme l’affrontement direct en stratégie viable.

### 8.2 Annonce, détection et arrivée

- [ÉTABLI] Les héros en vadrouille sont annoncés avant leur apparition par des traces : cadavres, portes forcées, torches ou bruits de pas.
- [ÉTABLI] Le bruit local remplace une alerte globale : les actions du joueur font monter la pression de la zone, qui décroît ou change selon le temps et le lieu.
- [ÉTABLI] Dans le code v1, le bruit décroît de 0,06 par tour ; certains seuils locaux déclenchent une annonce, avec un délai de manifestation codé à 5 tours.
- [HYPOTHÈSE] Les indices doivent donner une fenêtre réelle pour changer d’itinéraire, se cacher ou revenir en arrière ; une annonce suivie d’une apparition inévitable à la prochaine case n’est pas un choix.
- [HYPOTHÈSE] Le HUD affiche la pression locale par niveau qualitatif (calme, bruit, approche), pas nécessairement par une jauge numérique permanente.
- [HYPOTHÈSE] La mémoire des traces doit être cohérente : distinguer preuve d’un passage passé et menace actuellement proche.

### 8.3 Évitement, immobilisation et détournement

- [ÉTABLI] Les réponses au héros sont : fuite, détour, utilisation du terrain/pièges et interposition d’un allié.
- [ÉTABLI] Un héros peut être momentanément immobilisé par un piège révélé ; l’effet donne au gobelin un avantage de distance, pas une victoire en combat.
- [HYPOTHÈSE] Les pièges ont une durée d’immobilisation claire et une interaction prévisible ; le héros peut ensuite reprendre sa route ou quitter l’étage.
- [HYPOTHÈSE] Les leurres et bruits détournent ponctuellement un héros, avec un coût ou une contrepartie de ressource.
- [ÉTABLI] Le joueur doit comprendre pourquoi il a été repéré ou rattrapé grâce aux indices et aux événements mémorisés.
- [HYPOTHÈSE] Un contact direct sans solution de fuite doit rester rare, annoncé et potentiellement fatal ; il ne doit pas produire un échange de dégâts tactique ordinaire.

---

## 9. Progression et jalons

### 9.1 Principe de progression

- [ÉTABLI] La progression centrale se mesure par la distance que le gobelin sait parcourir depuis un refuge et par ce qu’il arrive à en rapporter.
- [ÉTABLI] La croissance de statistiques n’est pas le moteur principal ; l’amélioration vient des connaissances du joueur, de la carte mémorisée, des ressources préparées et de ses décisions.
- [HYPOTHÈSE] Débloquer de nouveaux outils ou options de service est possible, mais ces outils doivent augmenter les choix et non rendre la survie automatique.
- [ÉTABLI] Les refuges matérialisent un jalon durable de l’expédition : destination atteinte, point de ravitaillement et nouvel espace de préparation.

### 9.2 Jalons proposés

| Profondeur | Hypothèse de jalon / élément à valider |
|---:|---|
| [HYPOTHÈSE] 5 étages | Premier test de la boucle « partir, découvrir un risque, revenir ou pousser ». Le joueur doit savoir localiser la prochaine auberge. |
| [HYPOTHÈSE] 10 étages | Tester la mémoire cartographique, l’intérêt des traces et l’usage du butin sur plus d’une expédition. |
| [HYPOTHÈSE] 20 étages | Tester si les familles d’étages et profils de héros évitent la répétition mécanique. |
| [HYPOTHÈSE] 50 étages | Tester la soutenabilité de la progression longue, la variété des refuges et l’absence d’accumulation triviale. |
| [HYPOTHÈSE] -99 | Fin thématique envisagée ; définir si l’étage -99 est une victoire, une révélation, une dernière auberge ou une fin sans victoire classique. |

- [HYPOTHÈSE] Les jalons n’impliquent pas forcément des niveaux d’expérience ; ils peuvent déclencher du contenu, des entrées au mémorial ou des variations d’auberges.
- [HYPOTHÈSE] L’atteinte des jalons doit rester possible par plusieurs styles de jeu prudents, pas par une route optimale unique.

---

## 10. Narration émergente et épitaphes

### 10.1 Événements mémorisés

- [ÉTABLI] Les épitaphes sont générées à partir des événements de la partie et ne nécessitent aucune IA générative.
- [ÉTABLI] Le prototype v1 mémorise déjà ou expose : nom du gobelin, cause de mort, dernière auberge, nombre d’habitants croisés, sacrifice d’un allié, héros évité, dernier champignon, profondeur, escaliers franchis et auberges atteintes.
- [ÉTABLI] La géographie doit enrichir le récit : par exemple, « mort de soif à trois étages de l’Auberge du Rat Borgne » plutôt que « mort de soif » seulement.
- [HYPOTHÈSE] Ajouter les souvenirs de traces suivies, pièges évités, objets rapportés, décisions de demi-tour, jours/tours de voyage et personnes payées ou recrutées.
- [HYPOTHÈSE] N’enregistrer que les événements qui peuvent produire une phrase utile ; les compteurs non narratifs ne doivent pas alourdir l’épitaphe.

### 10.2 Grammaire et modules d’épitaphe

- [HYPOTHÈSE] Construire une phrase à partir de modules déterministes : ouverture/titre, identité, cause, lieu, dernier choix, détail social, conclusion.
- [ÉTABLI] Les fragments sont tirés de listes écrites à la main ; chaque variable provient d’événements observés, de noms procéduraux et de l’état final.
- [HYPOTHÈSE] Exemple de structure : « [Titre]. [Nom], gobelin de [trait], est mort de [cause] à [distance] de [auberge]. Il avait [fait notable]. [Chute humoristique ou mélancolique]. »
- [HYPOTHÈSE] Les modules doivent posséder des règles de compatibilité (accords, répétitions, cause/lieu) pour éviter les combinaisons grammaticalement absurdes non intentionnelles.
- [ÉTABLI] L’humour peut venir de titres administratifs ou de la disproportion entre une fin tragique et la paperasse qui la décrit.
- [HYPOTHÈSE] Prévoir plusieurs registres de chute : absurde, sec, tendre ou franchement mélancolique ; la tonalité est modulée par les événements, pas choisie arbitrairement à chaque mort.

### 10.3 Anti-répétition, titres et mémorial

- [ÉTABLI] Le titre d’épitaphe est choisi dans une liste finie (le v1 contient notamment des titres de registre administratif) ; le texte est personnalisé par les variables de partie.
- [ÉTABLI] Le mémorial est local et conserve les épitaphes précédentes dans le navigateur ; le v1 limite actuellement l’historique à douze entrées via `localStorage`.
- [HYPOTHÈSE] L’anti-répétition utilise une sélection pondérée avec mémoire du titre récent, des chutes récemment utilisées et des combinaisons déjà vues dans la même partie.
- [HYPOTHÈSE] La taille du mémorial, l’export/sauvegarde et la politique de confidentialité locale restent à définir ; le fonctionnement hors ligne ne doit pas nécessiter de compte.
- [ÉTABLI] Exemples de titres possibles : « Comptabilité du désastre », « Une fin tout à fait réglementaire », « Le donjon a classé votre dossier ».
- [HYPOTHÈSE] Le mémorial pourrait afficher quelques statistiques collectives de façon sobre, à condition que cela ne détourne pas de la singularité des récits.

---

## 11. Contrôles et interface

### 11.1 Schéma unifié

- [ÉTABLI] Le schéma central est **déplacement seul** : flèches, WASD ou swipe pour se déplacer.
- [ÉTABLI] Pousser contre un objet, un PNJ, une porte, un puits ou un élément interactif déclenche une interaction contextuelle (« bump »).
- [ÉTABLI] La fouille est passive ou intégrée au déplacement/à l’attente ; elle ne requiert pas une commande dédiée répétée.
- [ÉTABLI] Manger/boire se fait par un menu rapide ou des touches uniques, avec une suggestion quand une jauge est basse.
- [ÉTABLI] Sur mobile, il y a au plus un bouton d’action contextuel en plus de la croix directionnelle/swipe.
- [ÉTABLI] L’auberge se navigue comme le donjon ; le joueur ne se retrouve pas directement dans un menu dès l’entrée.
- [HYPOTHÈSE] Un bouton contextuel unique propose l’action pertinente selon la case et la situation (examiner, prendre, parler, utiliser, confirmer), avec un libellé explicite.
- [HYPOTHÈSE] Une courte attente peut être liée à une touche dédiée ou à une action contextuelle ; vérifier qu’elle n’est pas confondue avec manger/boire.

### 11.2 Tableau clavier proposé

| Touche | Action | Statut / notes |
|---|---|---|
| [ÉTABLI] Flèches | Déplacement cardinal / bump contextuel | Commande de base à prendre en charge. |
| [ÉTABLI] `W A S D` | Déplacement cardinal / bump contextuel | Alternative standard, activée sans configuration. |
| [HYPOTHÈSE] `E` ou `Entrée` | Action contextuelle sur la case/la cible | Choisir une touche unique ; éviter un doublon ambigu. |
| [HYPOTHÈSE] `I` | Menu rapide d’inventaire et consommables | Doit rester accessible sans interrompre la lecture de la carte. |
| [HYPOTHÈSE] `Q` | Utiliser un consommable de survie suggéré | Confirmation si l’effet est irréversible ; priorité à la ressource la plus basse. |
| [HYPOTHÈSE] `Échap` | Fermer le menu / revenir à la grille | Ne doit pas annuler silencieusement un choix déjà payé. |
| [HYPOTHÈSE] `Espace` | Attendre / petite action de fouille, si nécessaire | À ne garder que si le test confirme un besoin distinct. |
| [HYPOTHÈSE] `Tab` | Ouvrir/fermer la carte ou les détails de zone | Optionnel ; clavier accessible et navigation logique. |

- [HYPOTHÈSE] Toutes les commandes doivent être configurables ou au minimum vérifiées contre les dispositions de clavier courantes ; éviter les touches mortes et raccourcis navigateur.
- [ÉTABLI] Le déplacement au clavier est une exigence issue du retour utilisateur ; il ne s’agit pas d’un ajout facultatif.

### 11.3 Mobile, lisibilité et accessibilité

- [ÉTABLI] Flèches directionnelles tactiles, tap et swipe sont des méthodes envisagées/présentes dans l’interface v1.
- [HYPOTHÈSE] La v2 privilégie une croix directionnelle tactile généreuse et le swipe ; conserver le tap sur case adjacente si l’essai confirme sa précision.
- [ÉTABLI] Ne pas multiplier des boutons distincts « interagir / fouiller / manger / boire / camper » sur le HUD.
- [HYPOTHÈSE] Afficher en permanence les ressources critiques et leur tendance ; une jauge basse déclenche un signal, pas une fenêtre modale qui bloque le jeu.
- [HYPOTHÈSE] Le contraste, la taille des zones tactiles, les indications textuelles et les symboles doivent éviter de dépendre uniquement de la couleur ou d’une précision motrice fine.
- [ÉTABLI] Le v1 n’a pas été testé sur navigateur réel ; les comportements tactiles, redimensionnement du Canvas et clavier physique restent à vérifier sur appareils ciblés.

---

## 12. Direction artistique

### 12.1 État de la direction

- [ÉTABLI] La direction artistique n’est pas encore tranchée.
- [ÉTABLI] Il faut explorer cinq à sept directions visuelles distinctes, les évaluer sur singularité, adéquation au jeu, lisibilité/animation et faisabilité, puis en sélectionner deux ou trois.
- [ÉTABLI] Une même scène de référence doit être utilisée pour comparer toutes les pistes, afin de ne pas confondre style et contenu.
- [ÉTABLI] Une piste hybride est déjà envisagée : auberges en papier, formulaires et tampons bureaucratiques ; donjon en ombre et lanterne.
- [HYPOTHÈSE] L’hybride est une hypothèse directrice, pas un choix final : tester s’il unifie réellement l’expérience ou sépare trop fortement refuge et exploration.

### 12.2 Critères d’évaluation

| Critère | Question de revue |
|---|---|
| [ÉTABLI] Singularité | Peut-on reconnaître l’univers de Goblin Survivor -99 sans lire le titre ? |
| [ÉTABLI] Adéquation | Le style soutient-il vulnérabilité, survie rusée, satire et mélancolie ? |
| [ÉTABLI] Lisibilité | La grille, les indices, la profondeur, les pièges et les ressources restent-ils visibles sur smartphone ? |
| [ÉTABLI] Animation | Peut-on rendre lisibles déplacement, obscurité, annonce d’un héros et interactions avec peu d’images ? |
| [ÉTABLI] Faisabilité | L’équipe peut-elle produire la direction en cohérence avec un jeu HTML/Canvas léger et hors ligne ? |
| [HYPOTHÈSE] Accessibilité | Le contraste et les silhouettes fonctionnent-ils sans distinguer uniquement des couleurs ? |
| [HYPOTHÈSE] Cohérence | Les transitions entre les textures papier du refuge et le donjon sombre restent-elles intentionnelles ? |

### 12.3 Scène de référence et prochaines étapes

- [ÉTABLI] La scène de comparaison doit contenir le gobelin, une salle de donjon, une source de lumière, une ressource, un piège ou une trace et un élément de menace ; inclure en parallèle un fragment d’auberge pour juger le contraste.
- [HYPOTHÈSE] Produire cinq à sept planches statiques, puis réduire à deux ou trois pistes pour une petite animation de déplacement et de lumière.
- [HYPOTHÈSE] Tester les pistes en miniature mobile, pas uniquement en plein écran ; la lisibilité de la carte prime sur le détail décoratif.
- [ÉTABLI] Décision finale de DA différée jusqu’à l’évaluation comparative ; aucune piste ne doit être présentée comme validée.

---

## 13. Architecture technique

### 13.1 Principes

- [ÉTABLI] Prototyper d’abord les décisions de jeu ; garder la structure technique assez simple pour être modifiée après observation.
- [ÉTABLI] Le prototype v1 est une page HTML avec Canvas et une configuration d’équilibrage centralisée dans un objet `CONFIG`.
- [ÉTABLI] L’ambition initiale reste un jeu léger, jouable hors ligne et adapté au smartphone.
- [HYPOTHÈSE] Le v2 reste une application client autonome, sans compte ni serveur requis pour la boucle principale ; toute persistance locale doit être tolérante aux erreurs de stockage.
- [HYPOTHÈSE] Les responsabilités peuvent être séparées logiquement sans adopter prématurément un moteur ou une architecture de production.

### 13.2 Modules logiques proposés

| Module | Responsabilité | Statut |
|---|---|---|
| [HYPOTHÈSE] `GameState` | État de la partie, ressources, position, profondeur, inventaire, allié et événements mémorisés. | Isoler les mutations pour rendre les tests reproductibles. |
| [HYPOTHÈSE] `RNG` | Génération déterministe à partir d’une graine et tirages de partie. | Conserver la reproductibilité v1 et centraliser les tirages. |
| [HYPOTHÈSE] `WorldGenerator` | Générer étages, salles, escaliers, auberges et emplacements sans niveau inaccessible. | Tester automatiquement connectivité et garde-fous. |
| [HYPOTHÈSE] `MapMemory` | État visible, déjà exploré et inconnu par étage. | Séparer vision momentanée et mémoire cartographique. |
| [HYPOTHÈSE] `TurnSystem` | Appliquer déplacement, coût de temps, ressources, bruit et mouvements des menaces dans un ordre explicite. | Éviter des ticks cachés dans chaque fonction d’interaction. |
| [HYPOTHÈSE] `InteractionResolver` | Déterminer le contexte du bump et proposer l’action pertinente. | Soutenir clavier, tactile et accessibilité par une même logique. |
| [HYPOTHÈSE] `Economy` | Achats, ventes, coûts, portage et ravitaillement. | Une seule source de vérité pour les prix/quantités. |
| [HYPOTHÈSE] `NarrativeMemory` | Enregistrer événements utiles et composer une épitaphe déterministe. | Tester la cohérence grammaticale et la variété. |
| [HYPOTHÈSE] `Renderer` | Canvas, carte, éclairage, HUD et états d’interface. | Séparer l’affichage de la simulation autant que nécessaire. |
| [HYPOTHÈSE] `Input` | Clavier, tactile, swipe, focus et menus. | Les modalités d’entrée pilotent la même action logique. |

### 13.3 `CONFIG` et graine

- [ÉTABLI] Le prototype v1 regroupe les réglages d’équilibrage dans `CONFIG`, notamment dimensions, cadence des refuges, portage, PV, ressources initiales, taux de consommation, dégâts et délai des héros.
- [ÉTABLI] Une graine contrôle le générateur pseudo-aléatoire ; le v1 utilise une graine fournie ou dérivée de l’horloge si elle est absente.
- [HYPOTHÈSE] Le v2 doit permettre de copier/afficher la graine afin qu’un problème observé puisse être reproduit précisément.
- [HYPOTHÈSE] Tous les tirages procéduraux pertinents (carte, objets, effets de champignon, habitants, menace) doivent dériver de la graine de partie ; éviter des aléas cachés non reproductibles.
- [HYPOTHÈSE] Chaque réglage doit avoir une unité, un commentaire et un usage réel. Supprimer ou raccorder les paramètres inactifs, notamment les écarts entre `INN_*` et les quantités de marché.
- [HYPOTHÈSE] Ajouter des assertions de génération : escalier atteignable, entrée praticable, auberge connectée, objets non bloquants et graine reproductible.

---

## 14. Prototype de validation v2

### 14.1 Périmètre recommandé

- [HYPOTHÈSE] Construire une tranche jouable courte, sans refonte artistique complète : départ dans une auberge explorable, préparation, deux à quatre étages, un refuge suivant et retour possible.
- [ÉTABLI] Inclure le déplacement au clavier, exigence directe du retour utilisateur.
- [ÉTABLI] Inclure les auberges en petite grille navigable, avec marché, taverne, dortoir et une interaction avec l’aubergiste.
- [ÉTABLI] Inclure le schéma unifié de contrôles, le bump contextuel et un maximum d’un bouton d’action contextuel mobile.
- [HYPOTHÈSE] Inclure une fouille intégrée, quelques ressources, une menace annoncée, une rencontre sociale et un allié à usage unique.
- [HYPOTHÈSE] N’inclure au départ qu’un profil de héros, un ou deux biomes et une poignée de résidents ; élargir seulement si la boucle fonctionne.
- [HYPOTHÈSE] Ne pas implémenter encore toute la profondeur -99, toutes les familles de héros, une progression de statistiques ou la DA finale.
- [ÉTABLI] Le prototype v2 valide des décisions de conception, pas une architecture finale ni une promesse de contenu.

### 14.2 Hypothèses testables et mesures

| Hypothèse | Méthode / signal observable | Cible initiale proposée |
|---|---|---|
| [HYPOTHÈSE] Les commandes unifiées sont compréhensibles | Faire jouer sans tutoriel oral ; relever les actions cherchées, erreurs de bump et questions. | Au moins 4 joueurs sur 5 trouvent déplacement, interaction et consommables sans aide après une explication minimale. |
| [HYPOTHÈSE] L’auberge explorable ajoute de la présence sans ralentir | Chronométrer l’installation et observer les détours inutiles. | La préparation type reste sous 60–90 secondes, tout en permettant de se déplacer réellement entre services. |
| [HYPOTHÈSE] Les signaux de héros sont utiles | Demander aux testeurs d’indiquer ce qu’ils pensent qui approche et d’expliquer leur décision. | La majorité peut citer un indice crédible et choisit au moins une fois de détourner ou fuir. |
| [HYPOTHÈSE] Le repli est une décision intéressante | Observer les ressources au départ du retour et la raison invoquée. | Des joueurs font au moins un demi-tour volontaire et peuvent expliquer le compromis. |
| [HYPOTHÈSE] La carte mémorisée est utile | Tester un trajet connu après une exploration initiale et noter les hésitations. | Le joueur retrouve refuge/escalier sans devoir revisiter toute la carte. |
| [HYPOTHÈSE] La gestion de survie est lisible | Demander d’anticiper la ressource qui s’épuisera d’abord. | Le joueur comprend la tendance avant que la jauge ne devienne critique. |
| [HYPOTHÈSE] Les interactions sociales sont distinctes | Présenter les quatre réponses et recueillir choix/motifs. | Chaque option est choisie au moins une fois dans le groupe de tests, sans qu’une seule soit dominante par défaut. |
| [HYPOTHÈSE] Le sac crée un arbitrage | Observer objets abandonnés, ventes et plaintes. | La limite de portage provoque des choix conscients sans générer de frustration répétitive. |
| [HYPOTHÈSE] Le rythme est tendu mais juste | Rejouer avec graines fixes ; relever morts incomprises et surprise non annoncée. | Toute mort par héros ou pénurie est reliée à un signal/choix compréhensible par le joueur. |

- [HYPOTHÈSE] Les seuils numériques de ce tableau sont des objectifs de test initiaux et non des critères statistiques définitifs ; un petit groupe de joueurs sert à repérer les problèmes, pas à inférer une population entière.
- [ÉTABLI] Enregistrer la graine, les tours, les causes de mort, la distance au refuge, le niveau de ressources et les interactions permet une comparaison des sessions, sous réserve de consentement et sans télémétrie distante nécessaire.

### 14.3 Décisions conserver / ajuster / abandonner

| Résultat observé | Décision à prendre |
|---|---|
| [HYPOTHÈSE] Auberge jugée concrète et préparation rapide | **Conserver** la grille et les interactions spatiales ; étendre ensuite l’identité des auberges. |
| [HYPOTHÈSE] Auberge appréciée mais trajets de service répétitifs | **Ajuster** la taille, l’agencement et le raccourci d’interaction ; ne pas supprimer le déplacement exigé. |
| [HYPOTHÈSE] Les joueurs manquent l’interaction par bump | **Ajuster** le signal visuel, l’aide contextuelle et le bouton unique ; garder le modèle unifié. |
| [HYPOTHÈSE] Une ressource domine toutes les décisions et les autres sont ignorées | **Ajuster** les taux/sources ; éviter d’ajouter une jauge tant que les cinq ressources ne sont pas lisibles. |
| [HYPOTHÈSE] Les héros surprennent sans choix de réaction | **Ajuster** délai, traces, portée et routes ; ne pas conserver une menace qui tue sans possibilité de réponse. |
| [HYPOTHÈSE] Le bruit local est compris mais trop difficile à surveiller | **Ajuster** son affichage qualitatif et les traces ; garder la localisation du danger. |
| [HYPOTHÈSE] Les testeurs n’utilisent pas le camping ou le confondent avec une action essentielle | **Ajuster** sa place ou l’abandonner du prototype court ; ne pas forcer une couche de commande. |
| [HYPOTHÈSE] Le hasard des champignons ne peut pas être anticipé même après apprentissage | **Ajuster** la signalétique/grammaire des effets ; ne pas confondre surprise et absence d’information. |
| [HYPOTHÈSE] Les joueurs ne font aucun choix de demi-tour, malgré des ressources critiques | **Ajuster** visibilité des réserves, information de trajet, distance refuge et opportunités de repli. |
| [HYPOTHÈSE] La grille ou le rendu Canvas empêche la lecture sur téléphone | **Abandonner ou réduire** le niveau de détail et les interactions secondaires ; conserver la priorité mobile. |
| [HYPOTHÈSE] La carte procédurale produit régulièrement des escaliers inaccessibles | **Abandonner** le placement aléatoire actuel ; remplacer par génération contrôlée/connectivité vérifiée. |
| [HYPOTHÈSE] Un système ne génère ni décision ni récit identifiable | **Abandonner** ce système du v2, au lieu de le conserver par investissement déjà réalisé. |

---

## 15. Résultats du prototype v1 et leçons

### 15.1 Ce qui existe dans le prototype inspecté

- [ÉTABLI] Prototype HTML/Canvas avec grille 9×9, croix directionnelle, tap/swipe, HUD de ressources et objet `CONFIG` réglable.
- [ÉTABLI] Génération de salles, mémoire de cases vues et escaliers ; le commentaire source indique que salles reliées et escalier accessible sont garantis, mais la vérification rapportée des escaliers n’a pas été concluante.
- [ÉTABLI] Ressources huile, vivres, eau, PV, or, sac à capacité limitée, auberge, achats/ventes, repos, champignons, cadavres, puits, flaques, coffres et pièges.
- [ÉTABLI] Interactions habitants : payer, parler, recruter, fuir ; allié unique qui s’interpose une fois face au héros.
- [ÉTABLI] Menace de héros avec délai d’annonce, bruit local, déplacement et indices de torche/traces ; prototypes de mémorial et épitaphes déterministes avec stockage local.
- [ÉTABLI] Le jeu propose actuellement un écran/menu d’auberge ; le retour utilisateur demande de le remplacer/compléter par un espace explorable.
- [ÉTABLI] Le v1 comporte plusieurs boutons séparés pour fouille, camping, manger/boire, interaction et aide : le retour demande une simplification nette.

### 15.2 Résultats d’essai disponibles

- [ÉTABLI] Un bot de test a exécuté **700 parties** ; environ **28,6 %** ont atteint la deuxième auberge.
- [ÉTABLI] Les décès observés étaient principalement dus à la **soif**, puis aux **héros**.
- [ÉTABLI] Le prototype n’a pas été testé sur un navigateur réel.
- [ÉTABLI] La vérification d’accessibilité des escaliers n’a pas été concluante.
- [HYPOTHÈSE] Ces résultats mesurent le comportement du bot sur la logique v1 ; ils ne constituent pas un taux de réussite de joueurs humains ni une preuve d’équilibrage.
- [HYPOTHÈSE] Le taux d’atteinte de la seconde auberge peut refléter le cheminement du bot, les règles de tick, le ravitaillement et les choix codés ; isoler ces facteurs avant d’ajuster globalement les taux.

### 15.3 Leçons à retenir

- [ÉTABLI] Les pénuries de survie dominent déjà la mortalité ; la soif mérite une attention particulière avant d’augmenter les dégâts ou de multiplier les menaces.
- [ÉTABLI] Une interface trop segmentée affaiblit l’exploration : déplacement, actions contextuelles et suggestion de besoins doivent se regrouper.
- [ÉTABLI] Les refuges doivent devenir des lieux, non des menus, et le contrôle clavier doit être pris en compte dès le prochain test.
- [ÉTABLI] Les garanties déclarées par la génération doivent être vérifiées par des tests reproductibles ; commentaires et intentions ne prouvent pas l’accessibilité effective.
- [HYPOTHÈSE] L’ajout de contenu (biomes, héros, événements) est secondaire à la preuve que le joueur comprend une expédition et choisit quand revenir.
- [HYPOTHÈSE] La prochaine tranche doit être évaluée par sessions humaines instrumentées localement, en plus du bot, car les deux types d’essai répondent à des questions différentes.

---

## 16. Questions ouvertes priorisées

### Priorité P0 — décisions bloquantes pour v2

1. [HYPOTHÈSE] **Que signifie exactement « continu » ?** Un seul espace gigantesque, des étages connectés persistants ou une succession de cartes sans rupture ? Choisir la représentation qui sert la mémoire et le retour au refuge.
2. [HYPOTHÈSE] **Comment dessiner la progression verticale ?** Le concept parle de profondeur -99 tandis que le code v1 compte les étages à partir de 1 ; adopter une convention unique et la rendre narrative.
3. [HYPOTHÈSE] **Quels tours consomment les ressources ?** Fixer le coût des bumps ratés, interactions, escaliers, menus, attente et actions automatiques.
4. [HYPOTHÈSE] **Quelle est la règle exacte de refuge tous les quatre étages ?** Définir la relation entre étage de départ, étage d’arrivée, remontée et ravitaillement ; vérifier que le joueur peut toujours retrouver son chemin.
5. [HYPOTHÈSE] **Que fait l’auberge en grille au minimum ?** Déterminer surface, services spatiaux, interaction avec PNJ et manière de quitter sans rallonger le rituel.
6. [HYPOTHÈSE] **Quelle alerte annonce un héros et combien de temps de réaction donne-t-elle ?** Ajuster fréquence, délai et intensité sur des sessions humaines.
7. [HYPOTHÈSE] **Quelle ressource sert de limite principale ?** Clarifier le rôle distinct de l’huile, l’eau et les vivres afin qu’elles ne produisent pas le même compte à rebours.

### Priorité P1 — décisions de contenu et d’équilibre

8. [HYPOTHÈSE] Quelle est la fréquence et la garantie minimale de sources d’eau/huile entre refuges ?
9. [HYPOTHÈSE] Le joueur peut-il retourner à un refuge déjà visité à tout moment, et quels événements changent au retour ?
10. [HYPOTHÈSE] L’allié s’interpose-t-il une seule fois, protège-t-il d’autres dangers ou possède-t-il un rôle actif distinct ?
11. [HYPOTHÈSE] Les habitants peuvent-ils réapparaître sur une carte mémorisée ; quel est le risque d’exploitation du recrutement ?
12. [HYPOTHÈSE] Le héros poursuit-il sur plusieurs étages, ou le passage d’escalier rompt-il la poursuite ?
13. [HYPOTHÈSE] Quel nombre de biomes suffit à rendre les jalons 5/10/20/50 distincts ?
14. [HYPOTHÈSE] Les trésors sont-ils uniquement convertis en or ou ont-ils des usages de récit, de service ou de quête ?
15. [HYPOTHÈSE] Quel est le degré de variabilité des champignons entre parties et la possibilité d’apprendre leurs effets ?

### Priorité P2 — finition et portée

16. [HYPOTHÈSE] Quelle direction artistique est retenue après comparaison de cinq à sept pistes ?
17. [HYPOTHÈSE] Le mémorial local garde-t-il douze entrées comme en v1, ou doit-il offrir une exportation/importation ?
18. [HYPOTHÈSE] Quelles options d’accessibilité sont indispensables pour clavier, contraste, animations, taille de texte et réduction des effets lumineux ?
19. [HYPOTHÈSE] Quelle est la condition exacte de fin au niveau -99 : victoire, boucle, révélation ou dernier rapport administratif ?
20. [HYPOTHÈSE] La génération procédurale doit-elle garantir certains événements narratifs par étage ou rester entièrement opportuniste ?

---

## 17. Feuille de route

| Étape | Contenu | Critère de sortie |
|---|---|---|
| [ÉTABLI] 0 — Formalisation | Rassembler vision, retours, paramètres v1 et décisions ouvertes dans ce GDD. | Les éléments établis et hypothèses sont séparés ; le périmètre v2 est explicite. |
| [HYPOTHÈSE] 1 — Règles de boucle | Fixer unités de tour, remontée/descente, refuges, ressources, cartes mémorisées et annonce du héros. | Une expédition courte peut être décrite sans ambiguïté et reproduite par graine. |
| [ÉTABLI] 2 — Contrôles et auberge | Tester la grille d’auberge, clavier, bump contextuel, action contextuelle mobile unique, menus rapides et suggestion de ressource basse. | Les joueurs peuvent préparer et quitter l’auberge sans aide, sur téléphone et clavier. |
| [HYPOTHÈSE] 3 — Tranche de donjon | Construire deux à quatre étages, un refuge, une source d’eau, une source de nourriture, un piège, un trésor, un habitant et un héros annoncé. | Le joueur choisit entre poursuivre et revenir ; la menace donne une réponse possible. |
| [HYPOTHÈSE] 4 — Sessions de test v2 | Tester sur navigateurs et appareils réels avec graines contrôlées ; observer et recueillir des retours courts. | Les critères de la section 14 sont renseignés ; les morts incomprises et problèmes de commandes sont documentés. |
| [HYPOTHÈSE] 5 — Révision de l’équilibrage | Ajuster les taux de consommation, sources, économie, danger et portage selon sessions, pas par intuition seule. | Une expédition offre une marge de décision sans repli obligatoire au même point pour tous. |
| [HYPOTHÈSE] 6 — Exploration DA | Créer cinq à sept directions, les comparer sur une scène de référence, choisir deux ou trois finalistes. | Les critères de singularité, lisibilité, animation et faisabilité sont évalués. |
| [HYPOTHÈSE] 7 — Contenu et profondeur | Ajouter progressivement familles d’étages, profils de héros, habitants et modules narratifs ; tester les jalons 5/10/20/50. | Chaque ajout produit un choix, une lecture du danger ou un souvenir distinct. |
| [HYPOTHÈSE] 8 — Fin -99 et finition | Définir la fin, l’arc narratif, l’accessibilité, la sauvegarde du mémorial et la compatibilité hors ligne. | Le parcours complet et la fin sont compréhensibles ; l’expédition, le mémorial et les commandes fonctionnent sur navigateurs cibles. |

### Ordre de priorité

1. [ÉTABLI] Traiter d’abord les retours utilisateurs structurants : auberge navigable, commandes clavier et interface simplifiée.
2. [HYPOTHÈSE] Vérifier ensuite que l’expédition courte permet réellement une décision de demi-tour compréhensible.
3. [HYPOTHÈSE] Corriger la génération et les paramètres de ressources à partir de tests reproductibles.
4. [HYPOTHÈSE] N’élargir les biomes, profils de héros et contenus narratifs qu’après preuve que les fondations sont lisibles.
5. [ÉTABLI] Maintenir une approche de prototype : instrumenter les questions, faire un changement à la fois, et conserver les résultats qui invalident une hypothèse.

---

## Annexe A — Résumé des paramètres de référence

| Domaine | Référence v1 | Proposition de travail v2 |
|---|---|---|
| [ÉTABLI] Grille | 9×9 | Garder pour le test court, réévaluer après essais mobiles. |
| [ÉTABLI] Refuge | Tous les 4 étages (`FLOORS_PER_INN`) | Garder provisoirement, clarifier la convention de profondeur. |
| [ÉTABLI] Départ | 46 huile, 7 vivres, 9 eau, 10 PV, 9 or | Reprendre sans changement initial afin de comparer. |
| [ÉTABLI] Sac | 6 objets | Garder, observer les arbitrages réellement provoqués. |
| [ÉTABLI] Lumière | Rayon 4/3/2/1 selon huile | Garder la logique de paliers ; tester la représentation « cercle » sur écran. |
| [ÉTABLI] Besoins | Consommation par tour et dégâts à vide | Tester si la soif est trop dominante, sans gommer la nécessité de gérer l’eau. |
| [ÉTABLI] Héros | Délai d’annonce 5 tours, bruit local | Mesurer si le signal donne un temps utile de réaction. |
| [ÉTABLI] Marché | Huile +15/3 or, vivres +4/2, eau +5/2, ration 2, piège pliant 4 | Conserver à titre expérimental ; raccorder `INN_*` ou les supprimer. |
| [ÉTABLI] Dortoir | Soin complet / 3 or dans le menu v1 | Tester la valeur face au soin d’arrivée et aux réserves d’or. |
| [ÉTABLI] Mémorial | `localStorage`, jusqu’à 12 entrées observées | Garder local/hors ligne ; décider ultérieurement si export nécessaire. |

---

## Annexe B — Lexique de conception

- [ÉTABLI] **Auberge / refuge / station sûre :** point de repos périodique, sûr, approvisionné, et explorable en grille.
- [ÉTABLI] **Expédition :** parcours depuis un refuge jusqu’au retour ou à la mort ; ses réserves et son butin sont l’enjeu.
- [ÉTABLI] **Bump :** tentative de déplacement contre une cible adjacente qui déclenche l’interaction contextuelle plutôt que le déplacement.
- [ÉTABLI] **Mémoire de carte :** séparation entre les cases déjà découvertes et celles actuellement visibles.
- [ÉTABLI] **Bruit local :** pression de menace liée aux actions du joueur dans une zone, distincte d’une alerte globale.
- [ÉTABLI] **Allié actif :** compagnon engagé dans l’expédition ; la limite est d’un à la fois.
- [ÉTABLI] **Épitaphe :** texte déterministe généré à la mort à partir des événements mémorisés.
- [HYPOTHÈSE] **Distance au refuge :** mesure à définir : étages, trajets navigables ou temps de retour estimé ; l’épitaphe doit employer une mesure fidèle au monde généré.
- [HYPOTHÈSE] **Action contextuelle :** action unique proposée selon la cible (examiner, parler, payer, prendre, entrer, acheter ou quitter), afin de limiter le nombre de contrôles.

---

## Annexe C — Principes de cohérence à préserver

1. [ÉTABLI] Toute nouvelle mécanique doit soutenir au moins un pilier (décision, ruse, danger lisible, progression, humour émergent ou simplicité de prototype).
2. [ÉTABLI] Aucun ajout d’interface ne doit annuler l’exigence de contrôles simplifiés sans observation utilisateur qui le justifie.
3. [ÉTABLI] L’auberge est un espace de jeu, pas seulement un formulaire en plein écran ; la grammaire visuelle papier peut néanmoins y rester une composante forte.
4. [ÉTABLI] Les ressources ont des rôles distincts et des réponses possibles ; une pénurie létale doit être lisible avant l’issue finale.
5. [ÉTABLI] Les héros restent des menaces à détourner, et non des adversaires à combattre.
6. [ÉTABLI] La génération procédurale ne justifie jamais une carte impossible : l’accessibilité des escaliers doit être testée, non supposée.
7. [ÉTABLI] La narration reste construite à partir de fragments écrits et d’événements réellement observés ; aucun événement ne doit être inventé après coup dans une épitaphe.
8. [HYPOTHÈSE] Une fonctionnalité qui échoue aux tests de clarté doit être simplifiée ou retirée avant que du contenu additionnel soit produit autour d’elle.
9. [HYPOTHÈSE] Les paramètres provisoires doivent être révisés sur des traces de jeu humaines et des graines reproductibles ; le bot sert à détecter des défauts systématiques, non à définir le plaisir.
10. [ÉTABLI] La direction artistique ne sera choisie qu’après comparaison sur une scène commune et examen explicite de la faisabilité mobile.

---

**Fin du document.**
