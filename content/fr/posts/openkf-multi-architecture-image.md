---
titre : « Conception stratégique de l'image multi-architecture d'Openkf »
date : 2023-09-16T14:15:15+08:00
brouillon : faux
Mots clés:
   - Blog
---

## Créez automatiquement des images multi-architectures de `openkf` et transférez-les vers plusieurs entrepôts d'images

+ https://github.com/openimsdk/openkf

**décrire:**

Afin de répondre aux besoins des différents utilisateurs, notre objectif est de créer automatiquement des images Docker « openkf » pour diverses architectures et de les transférer de manière transparente vers plusieurs référentiels d'images.

**Cible:**

- Créez automatiquement des images Docker des architectures `linux/amd64` et `linux/arm64` de `openkf`.
- Transférez l'image vers Docker Hub, Alibaba Cloud Docker Hub et l'entrepôt de conteneurs GitHub.

**Tâche:**

1. **Configurer un système de build multi-architecture**
    - Utilisez GitHub Actions, coopérez avec QEMU et Docker Buildx et prenez en charge les versions multi-architectures de « linux/amd64 » et « linux/arm64 ».
    - Déclenchez le processus de construction à chaque fois qu'une nouvelle version est publiée, validée dans la branche « principale » ou lors d'un événement régulier.
2. **Prend en charge plusieurs entrepôts d'images**
    - Docker Hub : poussez vers `openim/openkf-server`.
    - Alibaba Cloud Docker Hub : appuyez sur « registry.cn-hangzhou.aliyuncs.com/openimsdk/openkf-server ».
    - Dépôt de conteneurs GitHub : poussez vers `ghcr.io/openimsdk/openkf-server`.
3. **Marque de miroir dynamique**
    - Utilisez les actions de métadonnées Docker pour générer des balises dynamiques basées sur des événements tels que des déclencheurs périodiques, des validations de branche, des demandes d'extraction, une gestion des versions sémantiques et des SHA de validation.
    - Assurez-vous que les images construites ne sont pas poussées dans les événements de demande d'extraction.
4. **Authentification et sécurité**
    - Utilisez des secrets pour configurer l'authentification pour les référentiels de conteneurs Docker Hub, Alibaba Cloud et GitHub.
    - Veiller à ce que les opérations push pour chaque entrepôt soient sécurisées et transparentes.
5. **Notifications et journaux**
    - Envoyez des notifications à l'équipe de développement en cas d'échec d'une build ou d'un push via GitHub Actions.
    - Conservez des journaux de chaque opération de build et de push à des fins de suivi.

**Critères d'acceptation :**

- Les images `openkf` devraient être construites avec succès pour les architectures `linux/amd64` et `linux/arm64`.
- Après une construction réussie, l'image devrait être disponible sur Docker Hub, Alibaba Cloud Docker Hub et GitHub Container Repository.
- Les images sont correctement étiquetées en fonction d'événements et de propriétés définis.
- Aucune intervention manuelle n'est requise pendant tout le processus.

**Informations Complémentaires:**

- Les processus automatisés sont définis dans les workflows GitHub Actions. Assurez-vous de revoir et de mettre à jour les flux de travail si nécessaire.
- Assurez-vous de tester ce processus dans une branche ou un environnement distinct pour éviter les interruptions.