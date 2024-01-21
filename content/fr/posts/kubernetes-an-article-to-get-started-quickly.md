---
title: 'Kubernetes an Article to Get Started Quickly'
ShowRssButtonInSectionTermList: true
cover.image:
date: 2022-04-28T23:38:11+08:00
draft: false
showtoc: true
tocopen: true
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: ["Kubernetes", "k8s", "Docker", Cloud Native", "CNCF"]
tags:
  - blog
  - kubernetes
  - k8s
categories:
  - Development
  - Blog
  - Kubernetes
description: >
    Kubernetes is an open source container orchestration engine for automating deployment, scaling, and management of containerized applications. The project is governed by the Cloud Native Computing Foundation, which is hosted by The Linux Foundation.
---

## Le film principal commence~

Kubernetes est un projet open source initié par l'équipe Google. Son objectif est de gérer des conteneurs sur plusieurs hôtes et est utilisé pour déployer, développer et gérer automatiquement des applications conteneurisées. Le principal langage d'implémentation est le langage Go. Les composants et l'architecture de Kubernetes sont encore relativement complexes. Apprenez lentement ~

> Il est urgent d'organiser un conteneur~



## Pourquoi Kubernetes a abandonné Docker

::: conseil Très inattendu
Il peut sembler un peu choquant d'apprendre que Kubernetes abandonne la prise en charge de Docker en tant que moteur d'exécution de conteneur à partir de la version 1.20 de Kubernetes.

Kubernetes supprime la prise en charge de Docker en tant que moteur d'exécution de conteneur. Kubernetes ne gère pas réellement le processus d'exécution des conteneurs sur les machines. Au lieu de cela, il s’appuie sur un autre logiciel appelé Container Runtime. .

:::

Docker a été publié plus tôt que Kubernetes

Docker lui-même n'est pas compatible avec l'interface CRI. Kubernetes fonctionne avec tous les environnements d'exécution de conteneurs qui implémentent une norme appelée Container Runtime Interface (CRI). Il s'agit essentiellement d'un moyen standard de communication entre Kubernetes et les environnements d'exécution de conteneurs, et tout environnement d'exécution prenant en charge cette norme fonctionnera automatiquement avec Kubernetes.

Docker n'implémente pas l'interface Container Runtime (CRI). Dans le passé, alors qu'il n'y avait pas beaucoup de bonnes options pour les environnements d'exécution de conteneurs, Kubernetes a implémenté le Docker shim, qui était une couche supplémentaire qui servait d'interface entre Kubernetes et Docker. Cependant, maintenant qu'il existe de nombreux environnements d'exécution qui implémentent CRI, il n'est plus logique que Kubernetes maintienne un support spécial pour Docker.



::: avertissement signification obsolète
Bien que Docker ait été supprimé, le dockershim précédent est toujours conservé. Si vous le souhaitez, vous pouvez toujours utiliser le moteur de conteneurisation Docker pour fournir la prise en charge de la conteneurisation.

En plus de docker, il existe également containersd et CRI-O

Je vais vous confier un secret : **Docker n'est pas réellement un environnement d'exécution de conteneur** ! Il s'agit en fait d'un ensemble d'outils placés au-dessus d'un environnement d'exécution de conteneur appelé conteneurd. .

C'est exact! Docker n'exécute pas directement les conteneurs. Il crée simplement une interface plus accessible et plus riche en fonctionnalités au-dessus d’un environnement d’exécution de conteneur sous-jacent distinct. Lorsqu'il est utilisé comme environnement d'exécution de conteneur pour Kubernetes, Docker n'est qu'un intermédiaire entre Kubernetes et les conteneurs.

Cependant, Kubernetes peut utiliser directement containersd comme environnement d'exécution du conteneur, ce qui signifie que Docker n'est plus nécessaire dans ce rôle d'intermédiaire. Docker a encore beaucoup à offrir, même au sein de l'écosystème Kubernetes. Il n’est tout simplement pas nécessaire de l’utiliser spécifiquement comme environnement d’exécution de conteneur.

:::



**Podman est né :**

Podman est également positionné pour être compatible avec Docker, il est donc aussi proche que possible de Docker lors de son utilisation. En termes d'utilisation, il peut être divisé en deux aspects, l'un est le point de vue du constructeur du système et l'autre est le point de vue de l'utilisateur du système.



## Kubernetes(k8s)

[Kubernetes](http://kubernetes.io/) est le moteur d'orchestration et de planification de conteneurs open source de Google basé sur Borg. C'est l'un des composants les plus importants de [CNCF](http://cncf.io/) (Cloud Native Computing Foundation) , son objectif n'est pas seulement un système d'orchestration, mais de fournir une spécification qui vous permet de décrire l'architecture du cluster et de définir l'état final du service. `Kubernetes` peut vous aider à réaliser et à maintenir automatiquement le système dans ce domaine. État. En tant que pierre angulaire des applications cloud natives, « Kubernetes » équivaut à un système d'exploitation cloud, et son importance va de soi.

> **En une phrase : k8s nous fournit un cadre pour des systèmes distribués fonctionnant de manière élastique. k8s répond à mes exigences d'expansion, de basculement, de modes de déploiement, etc. Par exemple : k8s peut facilement gérer le déploiement Canary du système. **



::: Que sont les tip sealos ?
**[sealos](https://www.sealos.io/zh-Hans/docs/Intro) est une distribution de système d'exploitation cloud avec Kubernetes comme noyau**

Les premiers systèmes d'exploitation autonomes avaient également une architecture en couches, puis ont évolué vers des architectures de noyau telles que Linux et Windows. L'architecture en couches des systèmes d'exploitation cloud a été décomposée depuis la naissance des conteneurs et, à l'avenir, elle évoluera également vers une architecture « noyau cloud » hautement cohérente.

![image-20221017222736688](http://sm.nsddd.top/smimage-20221017222736688.png)

+ Désormais, imaginez toutes les machines de votre data center comme un supercalculateur "abstrait", sealos est le système d'exploitation utilisé pour gérer ce supercalculateur, et kubernetes est
+ .Le noyau de ce système d'exploitation !
+ Désormais, le cloud computing n'est plus divisé en IaaS, PaaS et SaaS, il est uniquement composé du pilote du système d'exploitation cloud (implémentation CSI CNI CRI), du noyau du système d'exploitation cloud (kubernetes) et des applications distribuées.

:::

> Ici, je vais tout passer en revue, du docker aux k8s
>
> + Quelques méthodes courantes de `Docker`, bien sûr nous nous concentrerons sur Kubernetes
> + Utilisera `kubeadm` pour créer un cluster `Kubernetes`
> + Comprendre le fonctionnement du cluster `Kubernetes`
> + Quelques méthodes couramment utilisées pour utiliser les contrôleurs
> + Il existe également des stratégies de planification pour `Kubernetes`
> + Exploitation et maintenance de `Kubernetes`
> + Utilisation de l'outil de gestion de packages `Helm`
> + Enfin nous implémenterons CI/CD basé sur Kubernetes



## Architecture K8

Conditions qu'un système d'orchestration de conteneurs doit remplir :

+ Inscription au service, découverte du service
+ équilibrage de charge
+ Configuration, gestion du stockage
+ bilan de santé
+ Expansion et contraction automatiques
+ zéro temps d'arrêt



### Manière de travailler

Kubernetes adopte une architecture distribuée maître-esclave, comprenant Master (nœud maître), Worker (nœud esclave ou nœud de travail), ainsi que l'outil de ligne de commande client kubectl et d'autres modules complémentaires.





### Organisation

> Je pense que l'exemple de la Silicon Valley peut nous aider à bien comprendre :

![image-20221018110649854](http://sm.nsddd.top/smimage-20221018110649854.png)



:: avertissement du plan de contrôle Kubernetes
Le plan de contrôle Kubernetes est responsable du maintien de l’état souhaité de tout objet du cluster. Il gère également les nœuds de travail et les pods. Il se compose de cinq composants, dont Kube-api-server, à savoir « Kube-scheduler », « Kube-controller-manager » et « cloud-controller-manager ». Le nœud exécutant ces composants est appelé « nœud maître ». Ces composants peuvent s'exécuter sur un seul nœud ou sur plusieurs nœuds, mais il est recommandé de s'exécuter sur plusieurs nœuds en production pour assurer une haute disponibilité et une tolérance aux pannes. Chaque composant du plan de contrôle a ses propres responsabilités, mais ensemble, ils prennent des décisions globales concernant le cluster et détectent et répondent aux événements de cluster générés par les utilisateurs ou par toute application tierce intégrée.

![image-20221126204020843](http://sm.nsddd.top/smimage-20221126204020843.png)

Comprenons les différents composants du plan de contrôle Kubernetes. Le plan de contrôle Kubernetes comprend les cinq composants suivants :

+ Serveur Kube-api
+ Planificateur Kube
+ Gestionnaire de contrôleur Kube
+ etcd
+ gestionnaire-contrôleur cloud

**Serveur Kube-API :**

Kube-api-server est le composant principal du plan de contrôle car tout le trafic passe par api-server, si d'autres composants du plan de contrôle doivent communiquer avec le magasin de données « etcd », ils sont également connectés au serveur api car il n'y a que le serveur Kube-api qui peut communiquer avec "etcd". Il fournit des services pour les opérations REST et fournit une interface pour le plan de contrôle Kubernetes, qui expose l'API Kubernetes via laquelle d'autres composants peuvent communiquer avec le cluster. Il existe plusieurs serveurs API qui peuvent être déployés horizontalement pour équilibrer le trafic à l'aide d'un équilibreur de charge.

**Planificateur Kube :**

Kube-scheduler est responsable de la planification des pods nouvellement créés sur le meilleur nœud disponible à exécuter dans le cluster. Cependant, vous pouvez planifier un Pod ou un ensemble de Pods sur un nœud spécifique, dans une zone spécifique, ou en fonction d'étiquettes de nœud, etc., en spécifiant une affinité, une contre-spécification ou des contraintes dans un fichier YAML avant ou avant le Pod. est déployé. déployer. Si aucun nœud disponible ne répond aux exigences spécifiées, le pod n'est pas déployé et reste non planifié jusqu'à ce que le planificateur Kube ne trouve pas de nœud viable. Les nœuds réalisables sont des nœuds qui répondent à toutes les exigences de planification des pods.

Kube-scheduler utilise un processus en 2 étapes pour sélectionner les nœuds, filtrer et évaluer les pods du cluster. Pendant le processus de filtrage, Kube-scheduler trouve un nœud viable en exécutant des vérifications, par exemple si le nœud dispose de suffisamment de ressources disponibles pour être mentionné pour ce pod. Après avoir filtré tous les nœuds viables, il attribue à chaque nœud viable un score basé sur les règles de score d'activité et exécute le pod sur le nœud avec le score le plus élevé. Si plusieurs nœuds ont le même score, il en sélectionne un au hasard.

**Gestionnaire-contrôleur Kube :**

Kube-controller-manager est responsable de l'exécution du processus du contrôleur. Il se compose en fait de quatre processus et fonctionne comme un seul pour réduire la complexité. Il garantit que l'état actuel correspond à l'état souhaité, et si l'état actuel ne correspond pas à l'état souhaité, les modifications appropriées sont apportées au cluster pour atteindre l'état souhaité.

Il comprend le contrôleur de nœud, le contrôleur de réplication, le contrôleur de point final et le contrôleur de compte de service et de jeton.

+ **Node Controller :** – Il gère les nœuds et garde un œil sur les nœuds disponibles dans le cluster et répond en cas de défaillance d'un nœud.
+ **Replication Controller :** – Il garantit que le nombre correct de pods est en cours d'exécution pour chaque objet contrôleur de réplication dans le cluster.
+ **Endpoints Controller :** – Il crée des objets Endpoints, par exemple, afin d'exposer un pod à l'extérieur, nous devons le joindre à un service.
+ **Compte de service et contrôleur de jetons :** – Responsable de la création des comptes par défaut et des jetons d'accès à l'API. Par exemple, chaque fois que nous créons un nouvel espace de noms, nous avons besoin d'un compte de service et d'un jeton d'accès pour y accéder. Ces contrôleurs sont donc responsables de la création du compte par défaut et du jeton d'accès à l'API pour le nouvel espace de noms.

**etcd**

etcd est le magasin de données par défaut pour Kubernetes et est utilisé pour stocker toutes les données du cluster. Il s’agit d’un magasin clé-valeur cohérent, distribué et hautement disponible. etcd n'est accessible que via le serveur Kube-api. Si d'autres composants du plan de contrôle doivent accéder à etcd, ils doivent passer par kube-api-server. etcd ne fait pas partie de Kubernetes. Il s'agit d'un produit open source complètement différent pris en charge par la Cloud Native Computing Foundation. Nous devons mettre en place un plan de sauvegarde approprié pour etcd afin que, en cas de problème avec le cluster, nous puissions restaurer la sauvegarde et reprendre rapidement nos activités.

**gestionnaire-de-contrôleur-cloud**

cloud-controller-manager nous permet de connecter un cluster Kubernetes local à un cluster Kubernetes hébergé dans le cloud. Il s'agit d'un composant distinct qui interagit uniquement avec la plateforme cloud. Le contrôleur de Cloud Controller Manager dépend du fournisseur de cloud sur lequel nous exécutons notre charge de travail. Il n'est pas disponible si nous disposons d'un cluster Kubernetes local ou si Kubernetes est installé sur notre propre PC à des fins d'apprentissage. cloud-controller-manager contient également trois contrôleurs dans un seul processus, à savoir le contrôleur de nœud, le contrôleur de route et le contrôleur de service.

+ **Node Controller :** – Il vérifie en permanence l'état des nœuds hébergés dans le fournisseur de cloud. Par exemple, si un nœud ne répond pas, il vérifie si le nœud a été supprimé dans le cloud.
+ **Route Controller :** – Il contrôle et configure le routage dans l'infrastructure cloud sous-jacente.
+ **Service Controller :** – Créez, mettez à jour et supprimez les équilibreurs de charge du fournisseur de cloud.

:::




## Architecture et composants du cluster

![img](http://sm.nsddd.top/sm1363565-20200523175956216-940931564.png)

### Nœud maître

Master est la passerelle et le hub central du cluster. Ses principales fonctions sont d'exposer les interfaces API, de suivre l'état de santé des autres serveurs, de planifier les charges de manière optimale et d'orchestrer la communication entre les autres composants. Un seul nœud maître peut remplir toutes les fonctions, mais compte tenu du problème du point de défaillance unique, plusieurs nœuds maîtres sont généralement déployés dans un environnement de production pour former un cluster.

| maître | aperçu |
| --------------------------- | --------------------- ------ ---------------------------------- |
| **APIServer** | L'API Kubernetes, entrée unifiée du cluster et coordinateur de chaque composant, fournit des services d'interface avec l'API RESTful. Les opérations d'ajout, de suppression, de modification, de vérification et de surveillance de toutes les ressources d'objet sont confiées à APIServer. pour le traitement, puis soumis au stockage Etcd. |
| **Planificateur** | Sélectionnez un nœud de nœud pour le pod nouvellement créé en fonction de l'algorithme de planification. Il peut être déployé arbitrairement, sur le même nœud ou sur des nœuds différents. |
| **Controller-Manager** | Traite les tâches d'arrière-plan régulières dans le cluster. Une ressource correspond à un contrôleur et ControllerManager est responsable de la gestion de ces contrôleurs. |

### Nœud de travail

Il s'agit du nœud de travail de Kubernetes, chargé de recevoir les instructions de travail du maître, de créer et de détruire les objets Pod en conséquence conformément aux instructions et d'ajuster les règles du réseau pour un routage et un transfert de trafic raisonnables. Dans un environnement de production, il peut y avoir N nœuds.

| Nœud | Présentation |
| -------------------------- | ---------------------- ---- --------------------------------------- |
| **kubelet** | Kubelet est l'agent du maître sur le nœud du nœud. Il gère le cycle de vie du conteneur exécuté localement, comme la création de conteneurs, le montage de volumes de données sur le pod, le téléchargement de secrets, l'obtention de l'état du conteneur et du nœud, etc. Le kubelet convertit chaque Pod en un ensemble de conteneurs. |
| **Pod (Docker ou rocket)** | Moteur de conteneur, exécution de conteneurs. |
| **kube-proxy** | Implémentez le proxy réseau Pod sur le nœud Node pour maintenir les règles réseau et l'équilibrage de charge à quatre couches. |

### etcd stockage de données

Système de stockage clé-valeur distribué. Utilisé pour enregistrer les données d'état du cluster, telles que les informations sur le pod, le service, le réseau et d'autres objets.

### Accessoires de base

Les clusters K8S s'appuient également sur un ensemble de composants complémentaires, généralement spécifiques à l'application et fournis par des tiers.

| Plugins principaux | Présentation |
| ------------------ | ------------------------------ ---- ---------------------------------- |
| KubeDNS | Planifiez et exécutez des pods qui fournissent des services DNS dans le cluster K8S. D'autres pods du même cluster peuvent utiliser ce service DNS pour résoudre les noms d'hôte. K8S utilise le projet CoreDNS par défaut depuis la version 1.11 pour fournir des services de résolution de noms dynamiques pour l'enregistrement et la découverte de services pour le cluster. |
| Tableau de bord | Toutes les fonctions du cluster K8S doivent être basées sur l'interface utilisateur Web pour gérer les applications du cluster et le cluster lui-même. |
| Heapster | Un système de surveillance et d'analyse des performances pour les conteneurs et les nœuds. Il collecte et analyse une variété de données d'indicateurs, telles que l'utilisation des ressources et la durée du cycle de vie. Dans la dernière version, ses principales fonctions sont progressivement remplacées par Prometheus combiné avec d'autres composants. . À partir de la version 1.8, la surveillance de l'utilisation des ressources peut être obtenue via l'API Metrics. Le composant spécifique est Metrics Server, qui est utilisé pour remplacer le heapster précédent. Ce composant a commencé à être progressivement abandonné dans la version 1.11. |
| Metric-Server | Metrics-Server est un agrégateur de données de surveillance de base du cluster. À partir de Kubernetes 1.8, il est déployé par défaut en tant qu'objet de déploiement dans le cluster créé par le script kube-up.sh. S'il est déployé dans d'autres de différentes manières, il doit être déployé séparément. |
| Ingress Controller | Ingress est un équilibrage de charge HTTP(S) implémenté au niveau de la couche application. Cependant, la ressource Ingress elle-même ne peut pas pénétrer le trafic. Il s'agit simplement d'un ensemble de règles de routage. Ces règles doivent fonctionner via le contrôleur Ingress. Actuellement, les projets fonctionnels incluent : Nginx-ingress, Traefik, Envoy et HAproxy, etc. |

### Plug-in réseau

| Vérification des fichiers en ligne | Présentation |
| ------------------------------------------------- - ---------- | ------------------------------------- |
| Interface réseau de conteneurs (CNI) | Interface réseau de conteneurs |
| flunnal | Implémenter la configuration du réseau, superposer le réseau de superposition |
| calico | Configuration réseau, politique réseau ; protocole BGp, protocole tunnel |
| canal (calico + flunnal) | Pour la stratégie de réseau, utilisé avec la flanelle. |
| ![img](http://sm.nsddd.top/sm1363565-20200523180136695-2145890184.png) | |

## Concepts de base de Kubernetes

|Concepts de base | |
| -------------------------- | ---------------------- ---- --------------------------------------- |
| **Étiquette de ressource d'étiquette** | Étiquette (clé/valeur), attachée à une ressource, utilisée pour associer des objets, une requête et un filtre ; |
| **Labe Selector Label Selector** | Un mécanisme pour filtrer les objets ressources qualifiés en fonction de l'étiquette |
| **Objet de ressource Pod** | Un objet de ressource Pod est un composant logique qui combine un ou plusieurs conteneurs d'application, des ressources de stockage, une adresse IP dédiée et d'autres options pour prendre en charge le fonctionnement |
| **Pod Controller** | Abstraction de ressources qui gère le cycle de vie du pod. Il s'agit d'un type d'objet, et non d'un objet de ressource unique. Les plus courants incluent : ReplicaSet, Deployment, StatefulSet, DaemonSet, Job&Cronjob, etc. |
| **Ressource de service de service** | Un service est un objet de ressource construit sur un ensemble d'objets Pod. Il est généralement utilisé pour empêcher les Pods de perdre le contact, définir des politiques d'accès pour un ensemble de Pods et des Pods proxy |
| **Ingress** | Si vous devez fournir certains objets Pod pour l'accès des utilisateurs externes, vous devez ouvrir un port pour ces objets Pod afin d'introduire du trafic externe. En plus du service, Ingress est également un moyen de fournir un accès externe. |
| **Volume de stockage en volume** | Assure le stockage persistant des données |
| **Name&&Namespace** | Name est l'identifiant de l'objet ressource dans le cluster K8S et agit généralement sur l'espace de noms (espace de noms), l'espace de noms est donc un mécanisme de qualification supplémentaire pour les noms. Dans le même espace de noms, les noms des objets ressources du même type doivent être uniques. |
| Annotation | Un autre type de données clé-valeur attachées à un objet ; elles sont pratiques à lire et à trouver pour les outils ou les utilisateurs. |

### Libellé du libellé de la ressource

La balise de ressource incarne des données clé/valeurs ; la balise est utilisée pour identifier un objet spécifié, tel qu'un objet Pod. Les balises peuvent être attachées lors de la création de l'objet, ou ajoutées ou modifiées après la création. Il convient de noter qu'**un objet peut avoir plusieurs balises et qu'une page à onglet peut être attachée à plusieurs objets**.

![img](http://sm.nsddd.top/sm1363565-20200523180226573-1554114165.png)

### Sélecteur d'étiquettes Labe Selector

S'il y a une étiquette, il y a bien sûr un sélecteur d'étiquette ; par exemple, tous les objets Pod contenant l'étiquette « rôle : backend » sont sélectionnés et fusionnés en un seul groupe. Habituellement, lors de l'utilisation, les objets de ressources sont classés par balises, puis filtrés par des sélecteurs de balises. L'application la plus courante consiste à créer un point de terminaison de service pour un groupe d'objets de ressources Pod avec les mêmes balises.

![img](http://sm.nsddd.top/sm1363565-20200523180332039-330736525.png)

### Objet de ressource Pod

Pod est la plus petite unité de planification de Kubernetes ; c'est une collection de conteneurs

> Le Pod peut encapsuler un ou plusieurs conteneurs ! L'espace de noms réseau et les ressources de stockage sont partagés dans le même pod, et les conteneurs peuvent communiquer directement via l'interface de bouclage locale : lo, mais ils sont isolés les uns des autres dans des espaces de noms tels que Mount, User et Pid.

Un Pod est en fait une instance unique d'une application en cours d'exécution. Il se compose généralement d'un ou plusieurs conteneurs d'applications qui partagent des ressources et sont étroitement liés.

![img](http://sm.nsddd.top/sm1363565-20200523180259373-1808638376.png)

Nous comparons chaque objet Pod à un hôte physique. Ensuite, plusieurs processus exécutés dans le même objet Pod sont similaires aux processus indépendants sur l'hôte physique. La différence est que chaque processus de l'objet Pod s'exécute l'un sur l'autre. Dans des conteneurs isolés, deux processus clés les ressources sont partagées entre chaque conteneur ;

Volumes de réseau et de stockage.

+ Réseau : chaque objet Pod se voit attribuer une adresse IP de pod, et tous les conteneurs du même pod partagent l'espace de noms réseau et UTS de l'objet Pod, y compris le nom d'hôte, l'adresse IP, le port, etc. Par conséquent, ces conteneurs peuvent communiquer via l'interface de bouclage locale lo, et la communication avec d'autres composants en dehors du pod doit être effectuée à l'aide du port Cluster IP+ de l'objet de ressource Service.
+ Volume de stockage : les utilisateurs peuvent configurer un ensemble de ressources de volume de stockage pour l'objet Pod. Ces ressources peuvent être partagées avec tous les conteneurs du même Pod, complétant ainsi le partage de données entre les conteneurs.Apprécier. Les volumes de stockage garantissent également un stockage persistant des données même après la fermeture, le redémarrage ou la suppression du conteneur.

Un Pod représente une instance d'une application. Nous devons maintenant étendre cette application ; cela signifie créer plusieurs instances de Pod, chaque instance représentant une copie en cours d'exécution de l'application.

Les outils de gestion de ces objets Pod répliqués sont implémentés par un groupe d'objets appelé Contrôleur ; tels que les objets Contrôleur de déploiement.

Lors de la création d'un Pod, nous pouvons également utiliser l'objet Pod Preset pour injecter des informations spécifiques dans le Pod, telles que Configmap, Secret, volume de stockage, montage de volume, variables d'environnement, etc. Avec l'objet Pod Preset, la création d'un modèle de Pod ne nécessite pas de fournir toutes les informations pour chaque affichage de modèle.

En fonction de l'état souhaité prédéterminé et de la disponibilité des ressources de chaque nœud de nœud ; le maître planifiera l'exécution de l'objet Pod sur le nœud de travail sélectionné. Le nœud de travail télécharge l'image à partir de l'entrepôt d'images pointé et la démarre dans l'environnement d'exécution du conteneur local. .conteneur. Master enregistrera l'état de l'ensemble du cluster dans etcd et le partagera avec divers composants et clients du cluster via API Server.

### Contrôleur de pod (Contrôleur)

Lors de l'introduction de Pod, nous avons mentionné que Pod est la plus petite unité de planification de K8S ; cependant, Kubernetes ne déploie ni ne gère directement les objets Pod, mais s'appuie sur une autre ressource abstraite : le contrôleur pour la gestion.

Contrôleurs Pod courants :

| Contrôleur de pod | |
| -------------------------- | ---------------------- ---- ----------------------------------------------- - |
| **Contrôleur de réplication** | Utilisez le contrôleur de réplique. Seul ce contrôleur de pods est pris en charge dans les versions matinales ; il effectue des opérations telles que l'augmentation et la diminution des pods, le contrôle du nombre total, la mise à jour continue, la restauration, etc., et a été interrompu |
| **ReplicaSet Controller** | Utilisez le contrôleur du jeu de réplicas une fois la version mise à jour et déclarez la méthode d'utilisation ; il s'agit d'une version mise à niveau de Replication Controller |
| **Déploiement** | Utilisé pour le déploiement d'applications sans état, telles que nginx, etc. ; nous mentionnerons le contrôleur HPA (Horizontal Pod Autosaler) plus tard : utilisé pour le contrôleur de mise à l'échelle automatique horizontale du Pod pour contrôler le déploiement et le déploiement |
| **StatefulSet** | Utilisé pour le déploiement d'applications avec état, telles que MySQL, Zookeeper, etc. |
| **DaemonSet** | Assurez-vous que tous les nœuds exécutent le même pod, comme la vérification des fichiers réseau flannel, zabbix_agent, etc. |
| Emploi | Tâche ponctuelle |
| Cronjob | Tâches planifiées |

Les contrôleurs sont des objets de niveau supérieur utilisés pour déployer et gérer les pods.

En prenant le déploiement comme exemple, il est chargé de garantir que le nombre de copies de l'objet Pod défini correspond aux paramètres attendus, de sorte que les utilisateurs n'aient qu'à déclarer l'état souhaité de l'application et que le contrôleur le gère automatiquement.

![img](http://sm.nsddd.top/sm1363565-20200523180401866-1621029241.png)

Les objets Pod créés par les utilisateurs manuellement ou directement via le contrôleur seront programmés par le planificateur pour s'exécuter sur un nœud de travail du cluster. Ils seront terminés normalement une fois l'exécution du processus d'application du conteneur terminée, puis supprimés.

> Lorsque les ressources d'un nœud sont épuisées ou fonctionnent mal, cela entraînera également le recyclage des objets Pod.

Dans la conception du cluster K8S, Pod est un objet avec un cycle de vie. Ensuite, un contrôleur est utilisé pour gérer les objets Pod uniques.

> Par exemple, il faut s'assurer que le nombre de copies Pod de l'application déployée atteint le nombre attendu par l'utilisateur, et reconstruire l'objet Pod à partir du modèle Pod, afin de réaliser l'expansion, la contraction, la mise à jour continue. et les capacités d'auto-guérison de l'objet Pod.
>
> Par exemple, si un nœud tombe en panne, le contrôleur concerné reprogrammera les objets Pod exécutés sur le nœud vers d'autres nœuds pour la reconstruction.

Le contrôleur lui-même est également un type de ressource, et ils sont collectivement appelés contrôleurs Pod. Le déploiement, comme indiqué ci-dessous, est une implémentation représentative de ce type de contrôleur et constitue le contrôleur Pod actuellement utilisé pour gérer les applications sans état.

![img](http://sm.nsddd.top/sm1363565-20200523180431487-339597555.png)

La définition d'un Pod Controller comprend généralement le nombre souhaité de répliques, un modèle de Pod et un sélecteur d'étiquette. Le contrôleur de pods fera correspondre et filtrera les étiquettes des objets de pod en fonction du sélecteur de labe. Tous les pods qui répondent aux conditions de sélection seront gérés par le contrôleur actuel et inclus dans le nombre total de répliques pour garantir que le nombre atteint le nombre attendu. de réplicas de statut.

> Dans les scénarios d'application réels, lorsque la charge de trafic des requêtes reçues est inférieure ou proche de la capacité de charge des répliques de pods existantes actuelles, nous devons modifier manuellement le nombre attendu de répliques dans le contrôleur de pod pour obtenir l'expansion et la contraction de l'application. échelle. . Lorsque des composants de surveillance des ressources tels que HeapSet ou Prometheus sont déployés dans le cluster, les utilisateurs peuvent également utiliser HPA (HorizontalPod Autoscaler) pour calculer le nombre approprié de copies de pod et modifier automatiquement le nombre de copies attendu dans le contrôleur de pod pour obtenir une mise à l'échelle dynamique de l'application. L'échelle améliore l'utilisation des ressources du cluster.

Chaque nœud du cluster K8S exécute "cAdvisor", qui est utilisé pour collecter des données en direct sur l'utilisation des ressources CPU, mémoire et disque des conteneurs et des nœuds. Ces données statistiques sont agrégées par métriques et sont accessibles via le serveur API. Le « HorizontalPodAutoscaler » surveille la santé du conteneur et prend des décisions de mise à l'échelle en fonction de ces statistiques.

### Ressources de service

| Rôle ou fonction principale | |
| ---------------------------------- | -------------- ---- ----------------------------------------------- -- |
| Empêcher le Pod de perdre le contact | Le service est un objet de ressource construit sur un groupe d'objets Pod. Comme mentionné précédemment, il sélectionne un groupe d'objets Pod via le sélecteur Labe et définit une entrée d'accès fixe unifiée pour ce groupe d'objets Pod (généralement une adresse IP), si K8S a une pièce jointe DNS (telle que coredns), il configurera automatiquement un nom DNS pour le service lors de sa création pour que le client puisse découvrir le service. |
| Définir un ensemble de politiques d'accès aux pods, pod proxy | Habituellement, nous demandons directement l'adresse IP du service, et la demande sera équilibrée en charge sur le point de terminaison principal, c'est-à-dire chaque objet Pod, c'est-à-dire l'équilibreur de charge ; par conséquent, le service est essentiellement un service proxy à 4 couches. De plus, le service peut également introduire du trafic de l'extérieur du cluster vers le cluster, ce qui nécessite que les nœuds mappent le port du service. |

L'objet Pod a une adresse IP de pod, mais cette adresse change après le redémarrage ou la reconstruction de l'objet. Le caractère aléatoire de l'adresse IP du pod crée de nombreux problèmes pour la maintenance des dépendances du système d'application.

> Par exemple : l'application Pod frontale `Nginx` ne peut pas charger l'application Pod back-end `Tomcat` sur la base d'une adresse IP fixe.

Les ressources de service doivent ajouter une couche intermédiaire avec une adresse IP fixe à l'objet Pod accédé. Une fois que le client a lancé une demande d'accès à cette adresse, les ressources de service concernées la planifieront et la transmettront par proxy à l'objet Pod back-end.

Le service n'est pas un composant spécifique, mais une collection logique de plusieurs objets Pod définis via des règles et est accompagné d'une stratégie pour accéder à cet ensemble d'objets Pod. Les objets de service sélectionnent et associent les objets Pod de la même manière que les contrôleurs de Pod, qui sont définis via des sélecteurs d'étiquettes.

![img](http://sm.nsddd.top/sm1363565-20200523180459175-924096694.png)

------

L'IP de service est une IP virtuelle, également appelée « IP de cluster », dédiée à la communication intra-cluster.

> Habituellement, un segment d'adresse dédié est utilisé, tel que le réseau 10.96.0.0/12, et l'adresse IP de chaque objet Service est allouée dynamiquement par le système dans cette plage.

Les objets Pod du cluster peuvent demander directement ce type d'« IP de cluster ». Par exemple, la demande d'accès du client Pod dans la figure ci-dessus est accessible via « l'IP de cluster » du service comme adresse cible, mais elle est un réseau privé dans le réseau du cluster. Adresse, **accessible uniquement au sein du cluster**.

Habituellement, nous avons besoin d'un accès externe ; la méthode courante pour l'introduire dans le cluster est via le réseau de nœuds. La méthode de mise en œuvre est la suivante :

> + Demande d'accès via l'adresse IP + le port (Node Port) du nœud de travail.
> + Proxy la requête au port de service de l'IP du cluster de l'objet Service correspondant. En termes simples : le port sur le nœud de travail mappe le port de service.
> + L'objet Service transmet la requête à l'IP du Pod de l'objet Pod backend et au port d'écoute de l'application.

Par conséquent, comme le client externe du cluster du client externe dans la figure ci-dessus, il ne peut pas demander directement l'adresse IP du cluster du service. Au lieu de cela, il doit transmettre l'adresse IP d'un certain nœud de travail. Dans ce cas, la demande doit être transféré deux fois pour atteindre l'objet Pod. cible. L'inconvénient de ce type d'accès est qu'il existe un certain retard dans l'efficacité de la communication.

### Entrée

K8S isole l'objet Pod de l'environnement réseau externe. La communication entre les objets tels que Pod et Service doit être effectuée via des adresses internes dédiées.

Par exemple, si vous devez fournir certains objets Pod pour l'accès des utilisateurs externes, vous devez ouvrir un port pour ces objets Pod afin d'introduire du trafic externe. En plus du service, Ingress est également un moyen de fournir un accès externe.

### Volume de stockage du volume

Un volume de stockage (Volume) est un espace de stockage indépendant du système de fichiers du conteneur. Il est souvent utilisé pour étendre l'espace de stockage du conteneur et lui fournir des capacités de stockage persistantes.

> Les volumes de stockage sont classés dans K8S comme suit :
>
> 1. Volume temporaire
> 2. Volume local
> 3. Volume réseau

Les volumes temporaires et les volumes locaux sont situés localement sur le nœud. Une fois le pod planifié sur d'autres nœuds de nœud, ce type de volume de stockage ne sera pas accessible car les volumes temporaires et les volumes locaux sont généralement utilisés pour la mise en cache des données, et les données persistantes sont généralement utilisées. placé dans des volumes persistants (volume persistant).

### Nom et espace de noms

Les espaces de noms sont souvent utilisés pour isoler les ressources d'un locataire ou d'un projet afin de former des regroupements logiques. Pour ce concept, vous pouvez vous référer au concept dans la documentation Docker https://www.jb51.net/article/136411.htm

Comme le montre la figure : Les objets de ressources créés tels que Pod et Service appartiennent au niveau d'espace de noms. S'ils ne sont pas spécifiés, ils appartiennent tous à l'espace de noms par défaut "default"

![Cette photo est morte⚠️ ~](http://sm.nsddd.top/sm1363565-20200523180512841-2018842328.png)

### Annotations

L'annotation est un autre type de données clé-valeur attachées à des objets. Elle est souvent utilisée pour attacher diverses métadonnées non identifiantes (métadonnées) à des objets, mais elle ne peut pas être utilisée pour identifier et sélectionner des objets. Sa fonction est de faciliter la lecture et la recherche des outils ou des utilisateurs.