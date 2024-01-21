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

## Der Hauptfilm beginnt~

Kubernetes ist ein vom Google-Team initiiertes Open-Source-Projekt. Ziel ist die Verwaltung von Containern über mehrere Hosts hinweg und dient der automatischen Bereitstellung, Erweiterung und Verwaltung von Containeranwendungen. Die Hauptimplementierungssprache ist die Go-Sprache. Die Komponenten und die Architektur von Kubernetes sind noch relativ komplex. Lerne langsam~

> Wir müssen dringend einen Container organisieren~



## Warum Kubernetes Docker veraltet hat

::: Tipp Sehr unerwartet
Es mag etwas schockierend erscheinen zu hören, dass Kubernetes ab Kubernetes Version 1.20 die Unterstützung für Docker als Container-Laufzeitumgebung einstellt.

Kubernetes entfernt die Unterstützung für Docker als Container-Laufzeitumgebung. Kubernetes übernimmt eigentlich nicht den Prozess der Ausführung von Containern auf Maschinen. Stattdessen basiert es auf einer anderen Software namens Container Runtime. .

:::

Docker wurde früher als Kubernetes veröffentlicht

Docker selbst ist nicht mit der CRI-Schnittstelle kompatibel. Kubernetes funktioniert mit allen Container-Laufzeiten, die einen Standard namens Container Runtime Interface (CRI) implementieren. Dies ist im Wesentlichen eine Standardmethode für die Kommunikation zwischen Kubernetes und Container-Laufzeiten, und jede Laufzeit, die diesen Standard unterstützt, funktioniert automatisch mit Kubernetes.

Docker implementiert das Container Runtime Interface (CRI) nicht. In der Vergangenheit, als es noch nicht so viele gute Optionen für Container-Laufzeiten gab, implementierte Kubernetes den Docker-Shim, eine zusätzliche Ebene, die als Schnittstelle zwischen Kubernetes und Docker diente. Da es jedoch mittlerweile so viele Laufzeitumgebungen gibt, die CRI implementieren, ist es für Kubernetes nicht mehr sinnvoll, eine spezielle Unterstützung für Docker beizubehalten.



::: Warnung veraltete Bedeutung
Obwohl Docker entfernt wurde, bleibt das vorherige Dockershim erhalten. Wenn Sie möchten, können Sie weiterhin die Docker-Containerisierungs-Engine verwenden, um Containerisierungsunterstützung bereitzustellen.

Neben Docker gibt es auch Containerd und CRI-O

Ich verrate Ihnen ein Geheimnis: **Docker ist eigentlich keine Container-Laufzeitumgebung**! Es handelt sich eigentlich um eine Sammlung von Tools, die auf einer Container-Laufzeitumgebung namens „containerd“ basieren. .

Das ist richtig! Docker führt Container nicht direkt aus. Es erstellt lediglich eine besser zugängliche und funktionsreichere Schnittstelle auf einer separaten zugrunde liegenden Containerlaufzeit. Beim Einsatz als Container-Laufzeitumgebung für Kubernetes ist Docker lediglich der Vermittler zwischen Kubernetes und Containern.

Allerdings kann Kubernetes Containerd direkt als Container-Laufzeit verwenden, sodass Docker in dieser Vermittlerrolle nicht mehr benötigt wird. Docker hat auch innerhalb des Kubernetes-Ökosystems noch viel zu bieten. Es muss einfach nicht speziell als Container-Laufzeitumgebung verwendet werden.

:::



**Podman wird geboren:**

Podman ist außerdem so positioniert, dass es mit Docker kompatibel ist, sodass es im Einsatz möglichst nah an Docker herankommt. In Bezug auf die Verwendung kann es in zwei Aspekte unterteilt werden: Der eine ist die Perspektive des Systemerstellers und der andere die Perspektive des Systembenutzers.



## Kubernetes(k8s)

[Kubernetes](http://kubernetes.io/) ist Googles Open-Source-Container-Orchestrierungs- und Planungs-Engine basierend auf Borg. Es ist eine der wichtigsten Komponenten von [CNCF](http://cncf.io/) (Cloud). Ziel der Native Computing Foundation ist nicht nur ein Orchestrierungssystem, sondern die Bereitstellung einer Spezifikation, die es Ihnen ermöglicht, die Cluster-Architektur zu beschreiben und den Endzustand des Dienstes zu definieren. „Kubernetes“ kann Ihnen dabei helfen, das System automatisch zu erreichen und zu warten Zustand. Als Eckpfeiler cloudnativer Anwendungen entspricht „Kubernetes“ einem Cloud-Betriebssystem und seine Bedeutung liegt auf der Hand.

> **In einem Satz: k8s bietet uns ein Framework für den elastischen Betrieb verteilter Systeme. k8s erfüllt meine Erweiterungsanforderungen, Failover, Bereitstellungsmodi usw. Zum Beispiel: k8s kann die Canary-Bereitstellung des Systems problemlos verwalten. **



::: Was sind Tip-Sealos?
**[sealos](https://www.sealos.io/zh-Hans/docs/Intro) ist eine Cloud-Betriebssystemdistribution mit Kubernetes als Kern**

Frühe eigenständige Betriebssysteme verfügten ebenfalls über eine Schichtarchitektur und entwickelten sich später zu Kernel-Architekturen wie Linux und Windows. Die Schichtarchitektur von Cloud-Betriebssystemen wurde seit der Geburt von Containern aufgeschlüsselt und wird sich in Zukunft auch in diese Richtung entwickeln eine hochkohärente „Cloud-Kernel“-Architektur. migrieren

![image-20221017222736688](http://sm.nsddd.top/smimage-20221017222736688.png)

+ Stellen Sie sich von nun an alle Maschinen in Ihrem Rechenzentrum als einen „abstrakten“ Supercomputer vor. Sealos ist das Betriebssystem, mit dem dieser Supercomputer verwaltet wird, und Kubernetes ist es
+ .Der Kernel dieses Betriebssystems!
+ Von nun an ist Cloud Computing nicht mehr in IaaS, PaaS und SaaS unterteilt, sondern besteht nur noch aus Cloud-Betriebssystemtreiber (CSI CNI CRI-Implementierung), Cloud-Betriebssystemkernel (Kubernetes) und verteilten Anwendungen.

:::

> Hier werde ich alles von Docker bis K8s durchgehen
>
> + Einige gängige Methoden von „Docker“, unser Fokus liegt natürlich auf Kubernetes
> + Wird „kubeadm“ verwenden, um einen „Kubernetes“-Cluster zu erstellen
> + Verstehen Sie, wie der „Kubernetes“-Cluster funktioniert
> + Einige häufig verwendete Methoden zur Verwendung von Controllern
> + Es gibt auch einige Planungsstrategien für „Kubernetes“.
> + Betrieb und Wartung von „Kubernetes“.
> + Verwendung des Paketverwaltungstools „Helm“.
> + Abschließend werden wir CI/CD auf Basis von Kubernetes implementieren



## k8s-Architektur

Bedingungen, die ein Container-Orchestrierungssystem erfüllen muss:

+ Dienstregistrierung, Diensterkennung
+ Lastausgleich
+ Konfiguration, Speicherverwaltung
+ Gesundheitscheck
+ Automatische Expansion und Kontraktion
+ Keine Ausfallzeiten



### Arbeitsweise

Kubernetes verwendet eine verteilte Master-Slave-Architektur, einschließlich Master (Masterknoten), Worker (Slaveknoten oder Workerknoten) sowie das Client-Befehlszeilentool kubectl und andere Add-Ons.





### Organisation

> Ich denke, das Beispiel Silicon Valley kann uns ein gutes Verständnis vermitteln:

![image-20221018110649854](http://sm.nsddd.top/smimage-20221018110649854.png)



::: Warnung Kubernetes Control Plane
Die Kubernetes-Steuerungsebene ist für die Aufrechterhaltung des Desire State aller Objekte im Cluster verantwortlich. Es verwaltet auch Worker-Knoten und Pods. Es besteht aus fünf Komponenten, einschließlich Kube-API-Server, nämlich „Kube-Scheduler“, „Kube-Controller-Manager“ und „Cloud-Controller-Manager“. Der Knoten, auf dem diese Komponenten ausgeführt werden, wird als „Masterknoten“ bezeichnet. Diese Komponenten können auf einem einzelnen Knoten oder auf mehreren Knoten ausgeführt werden. Es wird jedoch empfohlen, sie in der Produktion auf mehreren Knoten auszuführen, um eine hohe Verfügbarkeit und Fehlertoleranz zu gewährleisten. Jede Steuerungsebenenkomponente hat ihre eigenen Verantwortlichkeiten, aber gemeinsam treffen sie globale Entscheidungen über den Cluster und erkennen und reagieren auf Clusterereignisse, die von Benutzern oder integrierten Anwendungen von Drittanbietern generiert werden.

![image-20221126204020843](http://sm.nsddd.top/smimage-20221126204020843.png)

Lassen Sie uns die verschiedenen Komponenten der Kubernetes Control Plane verstehen. Die Kubernetes-Kontrollebene besteht aus den folgenden fünf Komponenten:

+ Kube-API-Server
+ Kube-Scheduler
+ Kube-Controller-Manager
+ usw
+ Cloud-Controller-Manager

**Kube-API-Server:**

Der Kube-API-Server ist die Hauptkomponente der Kontrollebene, da der gesamte Datenverkehr über den API-Server läuft. Wenn andere Komponenten der Kontrollebene mit dem Datenspeicher „etcd“ kommunizieren müssen, sind sie ebenfalls mit dem API-Server verbunden Es gibt nur einen Kube-API-Server, der mit „etcd“ kommunizieren kann. Es stellt Dienste für REST-Vorgänge bereit und stellt ein Frontend für die Kubernetes-Kontrollebene bereit, das die Kubernetes-API verfügbar macht, über die andere Komponenten mit dem Cluster kommunizieren können. Es gibt mehrere API-Server, die horizontal bereitgestellt werden können, um den Datenverkehr mithilfe eines Load Balancers auszugleichen.

**Kube-Scheduler:**

Kube-Scheduler ist für die Planung neu erstellter Pods auf dem besten verfügbaren Knoten zur Ausführung im Cluster verantwortlich. Sie können jedoch einen Pod oder eine Reihe von Pods auf einem bestimmten Knoten, in einer bestimmten Zone oder basierend auf Knotenbezeichnungen usw. planen, indem Sie Affinität, Gegenspezifikation oder Einschränkungen in einer YAML-Datei vor oder vor dem Pod angeben wird eingesetzt. einsetzen. Wenn keine verfügbaren Knoten vorhanden sind, die die angegebenen Anforderungen erfüllen, wird der Pod nicht bereitgestellt und bleibt ungeplant, bis Kube-Scheduler keinen brauchbaren Knoten findet. Machbare Knoten sind Knoten, die alle Anforderungen für die Pod-Planung erfüllen.

Kube-Scheduler verwendet einen zweistufigen Prozess, um Knoten auszuwählen, zu filtern und für Pods im Cluster zu bewerten. Während des Filtervorgangs findet Kube-Scheduler einen brauchbaren Knoten, indem er Prüfungen durchführt, z. B. ob der Knoten über genügend verfügbare Ressourcen verfügt, die für diesen Pod erwähnt werden können. Nachdem alle lebensfähigen Knoten herausgefiltert wurden, weist es jedem lebensfähigen Knoten eine Bewertung basierend auf Aktivitätsbewertungsregeln zu und führt den Pod auf dem Knoten mit der höchsten Bewertung aus. Wenn mehrere Knoten die gleiche Punktzahl haben, wird einer zufällig ausgewählt.

**Kube-Controller-Manager:**

Kube-Controller-Manager ist für die Ausführung des Controller-Prozesses verantwortlich. Es besteht tatsächlich aus vier Prozessen und wird zur Reduzierung der Komplexität als einer ausgeführt. Es stellt sicher, dass der aktuelle Zustand mit dem gewünschten Zustand übereinstimmt. Wenn der aktuelle Zustand nicht mit dem gewünschten Zustand übereinstimmt, werden entsprechende Änderungen am Cluster vorgenommen, um den gewünschten Zustand zu erreichen.

Es umfasst Node Controller, Replication Controller, Endpoint Controller sowie Service Account und Token Controller.

+ **Node Controller:** – Er verwaltet die Knoten, behält die verfügbaren Knoten im Cluster im Auge und reagiert, wenn ein Knoten ausfällt.
+ **Replikationscontroller:** – Stellt sicher, dass für jedes Replikationscontrollerobjekt im Cluster die richtige Anzahl von Pods ausgeführt wird.
+ **Endpoints Controller:** – Er erstellt Endpoints-Objekte. Um beispielsweise einen Pod nach außen zugänglich zu machen, müssen wir ihn mit einem Dienst verbinden.
+ **Dienstkonto- und Token-Controller:** – Verantwortlich für die Erstellung von Standardkonten und API-Zugriffstokens. Wenn wir beispielsweise einen neuen Namespace erstellen, benötigen wir ein Dienstkonto und ein Zugriffstoken, um darauf zuzugreifen. Daher sind diese Controller für die Erstellung des Standardkontos und des API-Zugriffstokens für den neuen Namespace verantwortlich.

**usw.**

etcd ist der Standarddatenspeicher für Kubernetes und wird zum Speichern aller Clusterdaten verwendet. Es handelt sich um einen konsistenten, verteilten, hochverfügbaren Schlüsselwertspeicher. Auf etcd kann nur über den Kube-API-Server zugegriffen werden. Wenn andere Komponenten der Steuerungsebene auf etcd zugreifen müssen, müssen sie über kube-api-server zugreifen. etcd ist nicht Teil von Kubernetes. Es handelt sich um ein völlig anderes Open-Source-Produkt, das von der Cloud Native Computing Foundation unterstützt wird. Wir müssen einen geeigneten Backup-Plan für etcd einrichten, damit wir im Falle eines Fehlers im Cluster das Backup wiederherstellen und schnell wieder mit dem Geschäft beginnen können.

**Cloud-Controller-Manager**

Mit dem Cloud-Controller-Manager können wir einen lokalen Kubernetes-Cluster mit einem in der Cloud gehosteten Kubernetes-Cluster verbinden. Es handelt sich um eine separate Komponente, die nur mit der Cloud-Plattform interagiert. Der Controller des Cloud Controller Managers hängt vom Cloud-Anbieter ab, auf dem wir unsere Workload ausführen. Es ist nicht verfügbar, wenn wir einen lokalen Kubernetes-Cluster haben oder wenn wir Kubernetes zu Lernzwecken auf unserem eigenen PC installiert haben. Der Cloud-Controller-Manager enthält außerdem drei Controller in einem einzigen Prozess: Node-Controller, Route-Controller und Service-Controller.

+ **Node Controller:** – Er überprüft ständig den Status der beim Cloud-Anbieter gehosteten Knoten. Wenn beispielsweise ein Knoten nicht reagiert, prüft es, ob der Knoten in der Cloud gelöscht wurde.
+ **Route Controller:** – Er steuert und richtet das Routing in der zugrunde liegenden Cloud-Infrastruktur ein.
+ **Service Controller:** – Cloud-Anbieter-Load-Balancer erstellen, aktualisieren und löschen.

:::




## Cluster-Architektur und -Komponenten

![img](http://sm.nsddd.top/sm1363565-20200523175956216-940931564.png)

### Masterknoten

Der Master ist das Gateway und der zentrale Knotenpunkt des Clusters. Seine Hauptfunktionen bestehen darin, API-Schnittstellen bereitzustellen, den Gesundheitsstatus anderer Server zu verfolgen, Lasten optimal zu planen und die Kommunikation zwischen anderen Komponenten zu orchestrieren. Ein einzelner Master-Knoten kann alle Funktionen ausführen. Angesichts des Problems eines einzelnen Fehlerpunkts werden jedoch normalerweise mehrere Master-Knoten in einer Produktionsumgebung bereitgestellt, um einen Cluster zu bilden.

| Master | Übersicht |
| --------------------------- | ------- ------ --------------------- |
| **APIServer** | Die Kubernetes-API, der einheitliche Eingang des Clusters und der Koordinator jeder Komponente, stellt Schnittstellendienste mit RESTful API bereit. Die Hinzufügungs-, Lösch-, Änderungs-, Prüf- und Überwachungsvorgänge aller Objektressourcen werden an APIServer übergeben zur Verarbeitung gespeichert und dann an den Etcd-Speicher übermittelt. |
| **Scheduler** | Wählen Sie gemäß dem Planungsalgorithmus einen Knotenknoten für den neu erstellten Pod aus. Er kann beliebig, auf demselben Knoten oder auf verschiedenen Knoten bereitgestellt werden. |
| **Controller-Manager** | Verarbeitet reguläre Hintergrundaufgaben im Cluster. Eine Ressource entspricht einem Controller, und ControllerManager ist für die Verwaltung dieser Controller verantwortlich. |

### Arbeitsknoten

Es ist der Arbeitsknoten von Kubernetes, der dafür verantwortlich ist, Arbeitsanweisungen vom Master zu empfangen, Pod-Objekte entsprechend den Anweisungen zu erstellen und zu zerstören und Netzwerkregeln für eine angemessene Weiterleitung und Verkehrsweiterleitung anzupassen. In einer Produktionsumgebung kann es N Knoten geben.

| Knoten | Übersicht |
| ------------ | -------- ---- --------------------------------------- |
| **kubelet** | Kubelet ist der Master-Agent auf dem Node-Knoten. Es verwaltet den Lebenszyklus des lokal ausgeführten Containers, z. B. das Erstellen von Containern, das Mounten von Datenvolumes auf dem Pod, das Herunterladen von Geheimnissen, das Abrufen des Container- und Knotenstatus usw. Das Kubelet wandelt jeden Pod in eine Reihe von Containern um. |
| **Pod (Docker oder Rakete)** | Container-Engine, die Container ausführt. |
| **kube-proxy** | Implementieren Sie den Pod-Netzwerk-Proxy auf dem Node-Knoten, um Netzwerkregeln und vierschichtigen Lastausgleich aufrechtzuerhalten. |

### etcd Datenspeicherung

Verteiltes Schlüsselwertspeichersystem. Wird zum Speichern von Cluster-Statusdaten wie Pod-, Dienst-, Netzwerk- und anderen Objektinformationen verwendet.

### Kernzubehör

K8S-Cluster basieren außerdem auf einer Reihe von Zusatzkomponenten, typischerweise anwendungsspezifischen Komponenten, die von Drittanbietern bereitgestellt werden

| Kern-Plugins | Übersicht |
| ----- | --------------- ---- --------------------- |
| KubeDNS | Pods planen und ausführen, die DNS-Dienste im K8S-Cluster bereitstellen. Andere Pods im selben Cluster können diesen DNS-Dienst zum Auflösen von Hostnamen verwenden. K8S verwendet seit Version 1.11 standardmäßig das CoreDNS-Projekt, um dynamische Namensauflösungsdienste für die Dienstregistrierung und Diensterkennung für den Cluster bereitzustellen. |
| Dashboard | Alle Funktionen des K8S-Clusters müssen auf der Web-Benutzeroberfläche basieren, um die Anwendungen im Cluster und den Cluster selbst zu verwalten. |
| Heapster | Ein Leistungsüberwachungs- und Analysesystem für Container und Knoten. Es sammelt und analysiert eine Vielzahl von Indikatordaten, wie z. B. Ressourcennutzung und Lebenszykluszeit. In der neuesten Version werden seine Hauptfunktionen nach und nach durch Prometheus in Kombination mit anderen Komponenten ersetzt . Ab Version 1.8 kann die Überwachung der Ressourcennutzung über die Metrics-API abgerufen werden. Die spezifische Komponente ist Metrics Server, die als Ersatz für den vorherigen Heapster verwendet wird. Diese Komponente wurde in 1.11 schrittweise aufgegeben. |
| Metric-Server | Metrics-Server ist ein Aggregator von Cluster-Kernüberwachungsdaten. Ab Kubernetes 1.8 wird es standardmäßig als Bereitstellungsobjekt in dem vom kube-up.sh-Skript erstellten Cluster bereitgestellt. Wenn es in anderen bereitgestellt wird Auf diese Weise muss es separat bereitgestellt werden. Installieren. |
| Ingress Controller | Ingress ist ein auf der Anwendungsebene implementierter HTTP(S)-Lastausgleich. Die Ingress-Ressource selbst kann jedoch nicht in den Datenverkehr eindringen. Es handelt sich lediglich um eine Reihe von Routing-Regeln. Diese Regeln müssen über den Ingress-Controller funktionieren. Derzeit umfassen die funktionalen Projekte: Nginx-ingress, Traefik, Envoy und HAproxy usw. |

### Netzwerk-Plug-in

| Online-Aktenprüfung | Übersicht |
| ------------------------------------------------- - ---------- | ------------------------------------- |
| Container-Netzwerkschnittstelle (CNI) | Container-Netzwerkschnittstelle |
| flunnal | Netzwerkkonfiguration implementieren, Overlay-Netzwerk Overlay-Netzwerk |
| calico | Netzwerkkonfiguration, Netzwerkrichtlinie; BGp-Protokoll, Tunnelprotokoll |
| Kanal (Kaliko + Flunnal) | Für Netzwerkstrategien, verwendet mit Flanell. |
| ![img](http://sm.nsddd.top/sm1363565-20200523180136695-2145890184.png) | |

## Grundkonzepte von Kubernetes

| Grundkonzepte | |
| ------------ | -------- ---- --------------------------------------- |
| **Label-Ressourcenlabel** | Label (Schlüssel/Wert), das an eine Ressource angehängt ist und zum Zuordnen von Objekten, Abfragen und Filtern verwendet wird; |
| **Labe Selector Label Selector** | Ein Mechanismus zum Filtern qualifizierter Ressourcenobjekte basierend auf Label |
| **Pod-Ressourcenobjekt** | Ein Pod-Ressourcenobjekt ist eine logische Komponente, die einen oder mehrere Anwendungscontainer, Speicherressourcen, dedizierte IP und andere Optionen zur Unterstützung des Betriebs kombiniert |
| **Pod-Controller** | Ressourcenabstraktion, die den Pod-Lebenszyklus verwaltet und ein Objekttyp und kein einzelnes Ressourcenobjekt ist. Zu den häufigsten gehören: ReplicaSet, Deployment, StatefulSet, DaemonSet, Job&Cronjob usw. |
| **Service-Service-Ressource** | Service ist ein Ressourcenobjekt, das auf einer Reihe von Pod-Objekten basiert. Es wird normalerweise verwendet, um zu verhindern, dass Pods den Kontakt verlieren, um Zugriffsrichtlinien für eine Reihe von Pods zu definieren und Pods zu vertreten |
| **Ingress** | Wenn Sie bestimmte Pod-Objekte für den externen Benutzerzugriff bereitstellen müssen, müssen Sie einen Port für diese Pod-Objekte öffnen, um externen Datenverkehr einzuführen. Neben Service ist Ingress auch eine Möglichkeit, externen Zugriff bereitzustellen. |
| **Volume Storage Volume** | Gewährleistet die dauerhafte Speicherung von Daten |
| **Name&&Namespace** | Name ist die Kennung des Ressourcenobjekts im K8S-Cluster und wirkt normalerweise auf den Namespace (Namespace), sodass der Namespace ein zusätzlicher Qualifizierungsmechanismus für Namen ist. Im selben Namespace müssen die Namen von Ressourcenobjekten desselben Typs eindeutig sein. |
| Anmerkung | Eine andere Art von Schlüsselwertdaten, die an ein Objekt angehängt sind; sie sind für Tools oder Benutzer bequem zu lesen und zu finden. |

### Label-Ressourcenlabel

Das Ressourcen-Tag verkörpert Schlüssel-/Wertdaten; das Tag wird verwendet, um ein bestimmtes Objekt zu identifizieren, beispielsweise ein Pod-Objekt. Tags können beim Erstellen des Objekts angehängt oder nach der Erstellung hinzugefügt oder geändert werden. Es ist erwähnenswert, dass **ein Objekt mehrere Tags haben kann und eine Registerkarte an mehrere Objekte angehängt werden kann**.

![img](http://sm.nsddd.top/sm1363565-20200523180226573-1554114165.png)

### Label-Selektor Etikettenauswahl

Wenn es ein Label gibt, gibt es natürlich auch einen Label-Selektor; zum Beispiel werden alle Pod-Objekte, die das Label „role: backend“ enthalten, ausgewählt und in einer Gruppe zusammengeführt. Normalerweise werden Ressourcenobjekte während der Verwendung nach Tags klassifiziert und dann durch Tag-Selektoren gefiltert. Die häufigste Anwendung besteht darin, einen Service-Endpunkt für eine Gruppe von Pod-Ressourcenobjekten mit denselben Tags zu erstellen.

![img](http://sm.nsddd.top/sm1363565-20200523180332039-330736525.png)

### Pod-Ressourcenobjekt

Pod ist die kleinste Planungseinheit von Kubernetes; es handelt sich um eine Sammlung von Containern

> Pod kann einen oder mehrere Container kapseln! Der Netzwerk-Namespace und die Speicherressourcen werden im selben Pod gemeinsam genutzt, und Container können direkt über die lokale Loopback-Schnittstelle kommunizieren: lo, aber sie sind in Namespaces wie Mount, Benutzer und Pid voneinander isoliert.

Ein Pod ist eigentlich eine einzelne Instanz einer laufenden Anwendung. Er besteht normalerweise aus einem oder mehreren Anwendungscontainern, die Ressourcen gemeinsam nutzen und eng miteinander verbunden sind.

![img](http://sm.nsddd.top/sm1363565-20200523180259373-1808638376.png)

Wir vergleichen jedes Pod-Objekt mit einem physischen Host. Dann ähneln mehrere Prozesse, die im selben Pod-Objekt ausgeführt werden, unabhängigen Prozessen auf dem physischen Host. Der Unterschied besteht darin, dass jeder Prozess im Pod-Objekt aufeinander ausgeführt wird. In isolierten Containern gibt es zwei Schlüssel Ressourcen werden von jedem Container gemeinsam genutzt;

Netzwerk- und Speichervolumes.

+ Netzwerk: Jedem Pod-Objekt wird eine Pod-IP-Adresse zugewiesen, und alle Container innerhalb desselben Pods teilen sich das Netzwerk und den UTS-Namespace des Pod-Objekts, einschließlich Hostname, IP-Adresse, Port usw. Daher können diese Container über die lokale Loopback-Schnittstelle lo kommunizieren, und die Kommunikation mit anderen Komponenten außerhalb des Pods muss über den Cluster-IP+-Port des Service-Ressourcenobjekts abgeschlossen werden.
+ Speichervolumes: Benutzer können eine Reihe von Speichervolume-Ressourcen für das Pod-Objekt konfigurieren. Diese Ressourcen können mit allen Containern im selben Pod geteilt werden, wodurch die Datenfreigabe zwischen Containern abgeschlossen wird.Genießen. Speichervolumes gewährleisten außerdem eine dauerhafte Speicherung von Daten, selbst nachdem der Container beendet, neu gestartet oder gelöscht wurde.

Ein Pod stellt eine Instanz einer Anwendung dar. Jetzt müssen wir diese Anwendung erweitern; das bedeutet, dass wir mehrere Pod-Instanzen erstellen, wobei jede Instanz eine laufende Kopie der Anwendung darstellt.

Die Tools zum Verwalten dieser replizierten Pod-Objekte werden von einer Gruppe von Objekten namens Controller implementiert, beispielsweise Deployment-Controller-Objekten.

Beim Erstellen eines Pods können wir auch das Pod-Preset-Objekt verwenden, um bestimmte Informationen in den Pod einzufügen, z. B. Configmap, Secret, Speichervolume, Volume-Mounting, Umgebungsvariablen usw. Mit dem Pod-Preset-Objekt ist es für die Erstellung einer Pod-Vorlage nicht erforderlich, alle Informationen für jede Vorlagenanzeige bereitzustellen.

Basierend auf dem vorgegebenen gewünschten Zustand und der Ressourcenverfügbarkeit jedes Node-Knotens plant der Master die Ausführung des Pod-Objekts auf dem ausgewählten Worker-Knoten. Der Worker-Knoten lädt das Image aus dem verwiesenen Image-Warehouse herunter und startet es in der lokalen Container-Laufzeitumgebung . Behälter. Der Master speichert den Status des gesamten Clusters in etcd und teilt ihn über den API-Server mit verschiedenen Komponenten und Clients des Clusters.

### Pod-Controller (Controller)

Bei der Einführung von Pod haben wir erwähnt, dass Pod die kleinste Planungseinheit von K8S ist; Kubernetes stellt Pod-Objekte jedoch nicht direkt bereit und verwaltet sie, sondern verlässt sich für die Verwaltung auf eine andere abstrakte Ressource – den Controller.

Gängige Pod-Controller:

| Pod-Controller | |
| ------------ | -------- ---- ---------------------------------------------- - |
| **Replikationscontroller** | Verwenden Sie den Replikatcontroller. Nur dieser Pod-Controller wird in Frühaufstehern unterstützt; er kann Vorgänge wie Pod-Erhöhung und -Verringerung, Gesamtzahlkontrolle, fortlaufende Aktualisierung, Rollback usw. ausführen und wurde eingestellt |
| **ReplicaSet Controller** | Verwenden Sie den Replikatsatz-Controller, nachdem die Version aktualisiert wurde, und deklarieren Sie die Verwendungsmethode; es handelt sich um eine aktualisierte Version des Replikationscontrollers |
| **Bereitstellung** | Wird für die zustandslose Anwendungsbereitstellung wie Nginx usw. verwendet; wir werden später den HPA-Controller (Horizontal Pod Autosaler) erwähnen: Wird für den horizontalen Pod-Controller für die automatische Skalierung verwendet, um rs&deployment zu steuern |
| **StatefulSet** | Wird für die zustandsbehaftete Anwendungsbereitstellung wie MySQL, Zookeeper usw. verwendet. |
| **DaemonSet** | Stellen Sie sicher, dass alle Knoten denselben Pod ausführen, z. B. Flanell zur Netzwerkdateiprüfung, zabbix_agent usw. |
| Job | Einmalige Aufgabe |
| Cronjob | Geplante Aufgaben |

Controller sind übergeordnete Objekte, die zum Bereitstellen und Verwalten von Pods verwendet werden.

Am Beispiel der Bereitstellung ist es dafür verantwortlich, sicherzustellen, dass die Anzahl der Kopien des definierten Pod-Objekts den erwarteten Einstellungen entspricht, sodass Benutzer nur den gewünschten Status der Anwendung deklarieren müssen und der Controller ihn automatisch verwaltet.

![img](http://sm.nsddd.top/sm1363565-20200523180401866-1621029241.png)

Von Benutzern manuell oder direkt über den Controller erstellte Pod-Objekte werden vom Scheduler so geplant, dass sie auf einem Arbeitsknoten im Cluster ausgeführt werden. Sie werden normal beendet, nachdem die Ausführung des Containeranwendungsprozesses abgeschlossen ist, und dann gelöscht.

> Wenn die Ressourcen eines Knotens erschöpft sind oder eine Fehlfunktion auftritt, führt dies auch zum Recycling von Pod-Objekten.

Im K8S-Clusterdesign ist Pod ein Objekt mit einem Lebenszyklus. Dann wird ein Controller verwendet, um einmalige Pod-Objekte zu verwalten.

> Beispielsweise muss sichergestellt werden, dass die Anzahl der Pod-Kopien der bereitgestellten Anwendung die vom Benutzer erwartete Anzahl erreicht, und das Pod-Objekt basierend auf der Pod-Vorlage rekonstruiert werden, um die Erweiterung, Kontraktion und fortlaufende Aktualisierung zu realisieren und Selbstheilungsfunktionen des Pod-Objekts.
>
> Fällt beispielsweise ein Knoten aus, verlagert der entsprechende Controller die auf dem Knoten ausgeführten Pod-Objekte zur Rekonstruktion auf andere Knoten.

Der Controller selbst ist ebenfalls ein Ressourcentyp und wird zusammenfassend als Pod-Controller bezeichnet. Die unten gezeigte Bereitstellung ist eine repräsentative Implementierung dieses Controllertyps und der Pod-Controller, der derzeit zur Verwaltung zustandsloser Anwendungen verwendet wird.

![img](http://sm.nsddd.top/sm1363565-20200523180431487-339597555.png)

Die Definition eines Pod-Controllers besteht normalerweise aus der gewünschten Anzahl von Replikaten, einer Pod-Vorlage und einem Label-Selektor. Der Pod-Controller gleicht die Beschriftungen der Pod-Objekte basierend auf dem Labe-Selektor ab und filtert sie. Alle Pods, die die Auswahlbedingungen erfüllen, werden vom aktuellen Controller verwaltet und in die Gesamtzahl der Replikate einbezogen, um sicherzustellen, dass die Anzahl die erwartete Anzahl erreicht von Statusreplikaten.

> Wenn in tatsächlichen Anwendungsszenarien die empfangene Anforderungsverkehrslast niedriger oder nahe der Tragfähigkeit der aktuell vorhandenen Pod-Replikate ist, müssen wir die erwartete Anzahl von Replikaten im Pod-Controller manuell ändern, um eine Erweiterung und Kontraktion der Anwendung zu erreichen Skala. . Wenn Ressourcenüberwachungskomponenten wie HeapSet oder Prometheus im Cluster bereitgestellt werden, können Benutzer auch HPA (HorizontalPod Autoscaler) verwenden, um die entsprechende Anzahl von Pod-Kopien zu berechnen und die erwartete Anzahl von Kopien im Pod-Controller automatisch zu ändern, um eine dynamische Skalierung der Anwendung zu erreichen Die Skalierung verbessert die Ressourcenauslastung des Clusters.

Jeder Knoten im K8S-Cluster führt „cAdvisor“ aus, der zum Sammeln von Live-Daten zur Auslastung von CPU-, Speicher- und Festplattenressourcen von Containern und Knoten verwendet wird. Auf diese statistischen Daten kann über den API-Server zugegriffen werden, nachdem sie von Metrics aggregiert wurden. Der „HorizontalPodAutoscaler“ überwacht den Zustand des Containers und trifft Skalierungsentscheidungen basierend auf diesen Statistiken.

### Service-Service-Ressourcen

| Hauptrolle oder Funktion | |
| -------------------- | -------------- ---- ---------------------------------------------- -- |
| Verhindern Sie, dass Pod den Kontakt verliert. | Der Dienst ist ein Ressourcenobjekt, das auf einer Gruppe von Pod-Objekten basiert. Wie bereits erwähnt, wählt er eine Gruppe von Pod-Objekten über den Labe Selector aus und definiert einen einheitlichen festen Zugriffseingang für diese Gruppe von Pod-Objekten (normalerweise). Wenn K8S über einen DNS-Anhang (z. B. coredns) verfügt, konfiguriert es automatisch einen DNS-Namen für den Dienst, wenn dieser erstellt wird, damit der Client den Dienst erkennen kann. |
| Definieren Sie eine Reihe von Pod-Zugriffsrichtlinien, Proxy-Pod | Normalerweise fordern wir die Service-IP direkt an und die Anforderung wird an den Back-End-Endpunkt, d. Der Dienst ist im Wesentlichen ein vierschichtiger Proxy-Dienst. Darüber hinaus kann der Dienst auch Datenverkehr von außerhalb des Clusters in den Cluster einleiten, was erfordert, dass Knoten den Dienst-Port zuordnen. |

Das Pod-Objekt verfügt über eine Pod-IP-Adresse, aber diese Adresse ändert sich, nachdem das Objekt neu gestartet oder neu erstellt wurde. Die Zufälligkeit der Pod-IP-Adresse verursacht große Probleme bei der Wartung der Abhängigkeiten des Anwendungssystems.

> Beispiel: Die Front-End-Pod-Anwendung „Nginx“ kann die Back-End-Pod-Anwendung „Tomcat“ nicht basierend auf einer festen IP-Adresse laden.

Serviceressourcen sollen dem aufgerufenen Pod-Objekt eine Zwischenschicht mit einer festen IP-Adresse hinzufügen. Nachdem der Client eine Zugriffsanforderung an diese Adresse initiiert hat, planen die relevanten Serviceressourcen diese und stellen sie per Proxy an das Back-End-Pod-Objekt weiter.

Der Dienst ist keine spezifische Komponente, sondern eine logische Sammlung mehrerer Pod-Objekte, die durch Regeln definiert werden, und verfügt über eine Strategie für den Zugriff auf diesen Satz von Pod-Objekten. Serviceobjekte wählen Pod-Objekte aus und verknüpfen sie auf die gleiche Weise wie Pod-Controller, die über Label-Selektoren definiert werden.

![img](http://sm.nsddd.top/sm1363565-20200523180459175-924096694.png)

------

Service-IP ist eine virtuelle IP, auch bekannt als „Cluster-IP“, die für die Kommunikation innerhalb des Clusters bestimmt ist.

> Normalerweise wird ein dediziertes Adresssegment verwendet, z. B. das Netzwerk 10.96.0.0/12, und die IP-Adresse jedes Serviceobjekts wird vom System innerhalb dieses Bereichs dynamisch zugewiesen.

Pod-Objekte im Cluster können diese Art von „Cluster-IP“ direkt anfordern. Auf die Zugriffsanforderung vom Pod-Client in der Abbildung oben kann beispielsweise über die „Cluster-IP“ des Dienstes als Zieladresse zugegriffen werden, dies ist jedoch der Fall ein privates Netzwerk im Cluster-Netzwerk. Adresse, **kann nur innerhalb des Clusters aufgerufen werden**.

Normalerweise benötigen wir externen Zugriff. Die übliche Methode, ihn in den Cluster einzuführen, ist das Knotennetzwerk. Die Implementierungsmethode ist wie folgt:

> + Zugriffsanfrage über die IP-Adresse + Port (Node Port) des Arbeitsknotens.
> + Leiten Sie die Anfrage an den Service-Port der Cluster-IP des entsprechenden Service-Objekts weiter. Laienhaft ausgedrückt: Der Port auf dem Arbeitsknoten bildet den Service-Port ab.
> + Das Service-Objekt leitet die Anfrage an die Pod-IP des Backend-Pod-Objekts und den Überwachungsport der Anwendung weiter.

Daher kann er, ähnlich wie der externe Cluster-Client vom externen Client in der obigen Abbildung, die Cluster-IP des Dienstes nicht direkt anfordern. Stattdessen muss er die IP-Adresse eines bestimmten Arbeitsknotenknotens übergeben. In diesem Fall die Anforderung muss zweimal weitergeleitet werden, um das Ziel-Pod.-Objekt zu erreichen. Der Nachteil dieser Zugriffsart besteht darin, dass es zu einer gewissen Verzögerung der Kommunikationseffizienz kommt.

### Eindringung

K8S isoliert das Pod-Objekt von der externen Netzwerkumgebung. Die Kommunikation zwischen Objekten wie Pod und Service muss über interne dedizierte Adressen erfolgen.

Wenn Sie beispielsweise bestimmte Pod-Objekte für den externen Benutzerzugriff bereitstellen müssen, müssen Sie einen Port für diese Pod-Objekte öffnen, um externen Datenverkehr einzuführen. Neben Service ist Ingress auch eine Möglichkeit, externen Zugriff bereitzustellen.

### Volume-Speichervolumen

Ein Speichervolumen (Volume) ist ein vom Container-Dateisystem unabhängiger Speicherplatz, der häufig verwendet wird, um den Speicherplatz des Containers zu erweitern und ihm dauerhafte Speicherfunktionen bereitzustellen.

> Speichervolumina werden in K8S klassifiziert als:
>
> 1. Temporäres Volumen
> 2. Lokales Volumen
> 3. Netzwerklautstärke

Sowohl temporäre Volumes als auch lokale Volumes befinden sich lokal auf dem Knoten. Sobald der Pod für andere Knotenknoten geplant ist, ist auf diese Art von Speicher-Volume kein Zugriff mehr möglich, da temporäre Volumes und lokale Volumes normalerweise für die Datenzwischenspeicherung verwendet werden und persistente Daten normalerweise in persistenten Volumes abgelegt. (persistentes Volume).

### Name und Namespace

Namespaces werden häufig verwendet, um Ressourcen für einen Mandanten oder ein Projekt zu isolieren und logische Gruppierungen zu bilden. Informationen zu diesem Konzept finden Sie in der Docker-Dokumentation https://www.jb51.net/article/136411.htm

Wie in der Abbildung gezeigt: Die erstellten Ressourcenobjekte wie Pod und Service gehören zur Namespace-Ebene. Wenn nicht angegeben, gehören sie alle zum Standard-Namespace „default“.

![Dieses Bild ist tot⚠️ ~](http://sm.nsddd.top/sm1363565-20200523180512841-2018842328.png)

### Anmerkung Anmerkung

Anmerkungen sind eine andere Art von Schlüsselwertdaten, die an Objekte angehängt werden. Sie werden häufig zum Anhängen verschiedener nicht identifizierender Metadaten (Metadaten) an Objekte verwendet, können jedoch nicht zum Identifizieren und Auswählen von Objekten verwendet werden. Seine Funktion besteht darin, Tools oder Benutzern das Lesen und Suchen zu erleichtern.