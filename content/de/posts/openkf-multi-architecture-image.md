---
Title: "Building Strategy Design of Openkf Multi-Architecture Image"
Date: 2023-09-16T14:15:15+08:00
Draft: false
Keywords:
   - OpenKF
   - Docker Images
   - Multi-Architecture
   - CI/CD
   - GitHub Actions
   - Docker Hub
   - Alibaba Cloud
   - GitHub Container Registry
Description: "A comprehensive guide to creating and distributing OpenKF Docker images for multiple architectures. Learn how to automate the process using GitHub Actions, push to various image registries, and ensure your images are up-to-date and secure."
Categories:
   - Technology
   - DevOps
   - Containerization
   - Continuous Integration
Tags:
   - openkf
   - docker
   - multi-architecture
   - automation
   - GitHub Actions
   - CI/CD
   - security
---

## Erstellen Sie automatisch Multi-Architektur-Images von „openkf“ und übertragen Sie sie an mehrere Image-Warehouses

+ https://github.com/openimsdk/openkf

**beschreiben:**

Um den Anforderungen verschiedener Benutzer gerecht zu werden, ist es unser Ziel, automatisch „openkf“-Docker-Images für verschiedene Architekturen zu erstellen und diese nahtlos in mehrere Image-Repositorys zu übertragen.

**Ziel:**

- Erstellen Sie automatisch Docker-Images der Architekturen „linux/amd64“ und „linux/arm64“ von „openkf“.
- Schieben Sie das Image an Docker Hub, Alibaba Cloud Docker Hub und GitHub Container Warehouse.

**Aufgabe:**

1. **Ein Multi-Architektur-Build-System einrichten**
    - Verwenden Sie GitHub-Aktionen, arbeiten Sie mit QEMU und Docker Buildx zusammen und unterstützen Sie Multi-Architektur-Builds von „linux/amd64“ und „linux/arm64“.
    - Lösen Sie den Build-Prozess jedes Mal aus, wenn eine neue Version veröffentlicht, in den Hauptzweig übernommen oder bei einem regulären Ereignis ausgeführt wird.
2. **Unterstützt mehrere Image-Warehouses**
    - Docker Hub: Push an „openim/openkf-server“.
    - Alibaba Cloud Docker Hub: Push an „registry.cn-hangzhou.aliyuncs.com/openimsdk/openkf-server“.
    - GitHub-Container-Repository: Push an „ghcr.io/openimsdk/openkf-server“.
3. **Dynamische Spiegelmarkierung**
    – Verwenden Sie Docker-Metadatenaktionen, um dynamische Tags basierend auf Ereignissen wie periodischen Triggern, Branch-Commits, Pull-Requests, semantischer Versionierung und Commit-SHAs zu generieren.
    – Stellen Sie sicher, dass erstellte Images nicht in Pull-Request-Ereignissen gepusht werden.
4. **Authentifizierung und Sicherheit**
    - Verwenden Sie Geheimnisse, um die Authentifizierung für Docker Hub-, Alibaba Cloud- und GitHub-Container-Repositorys zu konfigurieren.
    - Stellen Sie sicher, dass Push-Vorgänge für jedes Lager sicher und nahtlos sind.
5. **Benachrichtigungen und Protokolle**
    - Senden Sie über GitHub Actions Benachrichtigungen an das Entwicklungsteam, wenn ein Build oder Push fehlschlägt.
    - Führen Sie zu Nachverfolgungszwecken Protokolle aller Build- und Push-Vorgänge.

**Akzeptanzkriterium:**

- „openkf“-Images sollten erfolgreich für „linux/amd64“- und „linux/arm64“-Architekturen erstellt werden.
– Nach einem erfolgreichen Build sollte das Image auf Docker Hub, Alibaba Cloud Docker Hub und GitHub Container Repository verfügbar sein.
- Bilder werden basierend auf definierten Ereignissen und Eigenschaften ordnungsgemäß getaggt.
- Während des gesamten Prozesses ist kein manueller Eingriff erforderlich.

**Weitere Informationen:**

- Automatisierte Prozesse werden in GitHub Actions-Workflows definiert. Stellen Sie sicher, dass Sie die Arbeitsabläufe überprüfen und bei Bedarf aktualisieren.
– Stellen Sie sicher, dass Sie diesen Prozess in einem separaten Zweig oder einer separaten Umgebung testen, um Unterbrechungen zu vermeiden.
