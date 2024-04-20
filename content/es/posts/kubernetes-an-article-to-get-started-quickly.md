---
title: 'Kubernetes an Article to Get Started Quickly'
ShowRssButtonInSectionTermList: true
cover.image:
date: 2022-04-28T23:38:11+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: ["Kubernetes", "k8s", "Docker", Cloud Native", "CNCF"]
tags:
  - blog
  - kubernetes
  - k8s
  - go
  - github
categories:
  - Development
  - Blog
  - Kubernetes
description: >
    Kubernetes is an open source container orchestration engine for automating deployment, scaling, and management of containerized applications. The project is governed by the Cloud Native Computing Foundation, which is hosted by The Linux Foundation.
---

## Comienza la película principal ~

Kubernetes es un proyecto de código abierto iniciado por el equipo de Google. Su objetivo es administrar contenedores en múltiples hosts y se utiliza para implementar, expandir y administrar automáticamente aplicaciones en contenedores. El principal lenguaje de implementación es el lenguaje Go. Los componentes y la arquitectura de Kubernetes siguen siendo relativamente complejos. Aprende lentamente ~

>Necesitamos organizar urgentemente un contenedor~



## ¿Por qué Kubernetes dejó de usar Docker?

::: consejo Muy inesperado
Puede parecer un poco impactante escuchar que Kubernetes está desaprobando el soporte para Docker como tiempo de ejecución de contenedor a partir de la versión 1.20 de Kubernetes.

Kubernetes está eliminando la compatibilidad con Docker como tiempo de ejecución de contenedor. En realidad, Kubernetes no maneja el proceso de ejecutar contenedores en las máquinas. En cambio, se basa en otra pieza de software llamada Container Runtime. .

:::

Docker se lanzó antes que Kubernetes.

Docker en sí no es compatible con la interfaz CRI. Kubernetes funciona con todos los tiempos de ejecución de contenedores que implementan un estándar llamado Container Runtime Interface (CRI). Esta es esencialmente una forma estándar de comunicación entre Kubernetes y los tiempos de ejecución de contenedores, y cualquier tiempo de ejecución que admita este estándar funcionará automáticamente con Kubernetes.

Docker no implementa la Container Runtime Interface (CRI). En el pasado, cuando no había tantas buenas opciones para los tiempos de ejecución de contenedores, Kubernetes implementó Docker shim, que era una capa adicional que servía como interfaz entre Kubernetes y Docker. Sin embargo, ahora que hay tantos tiempos de ejecución que implementan CRI, ya no tiene sentido que Kubernetes mantenga un soporte especial para Docker.



::: advertencia significado obsoleto
Aunque se eliminó Docker, el Dockershim anterior aún se conserva. Si lo desea, aún puede usar el motor de contenedorización de Docker para brindar soporte de contenedorización.

Además de Docker, también existen contenedores y CRI-O.

Te contaré un secreto: **¡Docker no es en realidad un tiempo de ejecución de contenedor**! En realidad, es una colección de herramientas que se encuentran encima de un tiempo de ejecución de contenedor llamado containerd. .

¡Así es! Docker no ejecuta contenedores directamente. Simplemente crea una interfaz más accesible y rica en funciones además de un tiempo de ejecución de contenedor subyacente independiente. Cuando se utiliza como tiempo de ejecución de contenedor para Kubernetes, Docker es solo el intermediario entre Kubernetes y los contenedores.

Sin embargo, Kubernetes puede utilizar directamente Containerd como tiempo de ejecución del contenedor, lo que significa que Docker ya no es necesario en esta función de intermediario. Docker todavía tiene mucho que ofrecer, incluso dentro del ecosistema de Kubernetes. Simplemente no es necesario utilizarlo específicamente como tiempo de ejecución de contenedor.

:::



**Nace Podman:**

podman también está posicionado para ser compatible con Docker, por lo que su uso es lo más parecido posible a Docker. En términos de uso, se puede dividir en dos aspectos, uno es la perspectiva del constructor del sistema y el otro es la perspectiva del usuario del sistema.



##kubernetes(k8s)

[Kubernetes](http://kubernetes.io/) es el motor de programación y orquestación de contenedores de código abierto de Google basado en Borg. Es uno de los componentes más importantes de [CNCF](http://cncf.io/) (Cloud Native Computing Foundation), su objetivo no es solo un sistema de orquestación, sino proporcionar una especificación que le permita describir la arquitectura del clúster y definir el estado final del servicio. `Kubernetes` puede ayudarle a lograr y mantener automáticamente el sistema en este estado. Como piedra angular de las aplicaciones nativas de la nube, "Kubernetes" es equivalente a un sistema operativo en la nube y su importancia es evidente.

> ** En una oración: k8s nos proporciona un marco para ejecutar sistemas distribuidos de manera elástica. k8s cumple con mis requisitos de expansión, conmutación por error, modos de implementación, etc. Por ejemplo: k8s puede administrar fácilmente la implementación Canary del sistema. **



::: ¿Qué son los sellos de punta?
**[sealos](https://www.sealos.io/zh-Hans/docs/Intro) es una distribución de sistema operativo en la nube con kubernetes como núcleo**

Los primeros sistemas operativos independientes también tenían una arquitectura en capas y luego evolucionaron hacia arquitecturas de kernel como Linux y Windows. La arquitectura en capas de los sistemas operativos en la nube se ha descompuesto desde el nacimiento de los contenedores y en el futuro también avanzará hacia una arquitectura de "núcleo de nube" altamente cohesiva.

![image-20221017222736688](http://sm.nsddd.top/smimage-20221017222736688.png)

+ De ahora en adelante, imagine todas las máquinas de su centro de datos como una supercomputadora "abstracta", sealos es el sistema operativo utilizado para administrar esta supercomputadora y kubernetes es
+ ¡El núcleo de este sistema operativo!
+ A partir de ahora, la computación en la nube ya no se divide en IaaS, PaaS y SaaS, sino que solo se compone del controlador del sistema operativo en la nube (implementación CSI CNI CRI), el núcleo del sistema operativo en la nube (kubernetes) y aplicaciones distribuidas.

:::

> Aquí, repasaré todo, desde Docker hasta K8s.
>
> + Algunos métodos comunes de `Docker`, por supuesto, nos centraremos en Kubernetes.
> + Usará `kubeadm` para construir un clúster `Kubernetes`
> + Comprender cómo funciona el clúster `Kubernetes`
> + Algunos métodos comúnmente utilizados para usar controladores
> + También existen algunas estrategias de programación para `Kubernetes`
> + Operación y mantenimiento de `Kubernetes`
> + Uso de la herramienta de gestión de paquetes `Helm`
> + Finalmente implementaremos CI/CD basado en Kubernetes



## arquitectura k8s

Condiciones que debe cumplir un sistema de orquestación de contenedores:

+ Registro de servicios, descubrimiento de servicios.
+ equilibrio de carga
+ Configuración, gestión de almacenamiento.
+ control de salud
+ Expansión y contracción automática
+ cero tiempo de inactividad



### Manera de trabajar

Kubernetes adopta una arquitectura distribuida maestro-esclavo, que incluye Master (nodo maestro), Worker (nodo esclavo o nodo trabajador), así como la herramienta de línea de comandos del cliente kubectl y otros complementos.





### Organización

> Creo que el ejemplo de Silicon Valley puede darnos una buena comprensión:

![image-20221018110649854](http://sm.nsddd.top/smimage-20221018110649854.png)



::: advertencia del plano de control de Kubernetes
El plano de control de Kubernetes es responsable de mantener el estado de deseo de cualquier objeto en el clúster. También gestiona nodos trabajadores y Pods. Consta de cinco componentes, incluido Kube-api-server, a saber, "Kube-scheduler", "Kube-controller-manager" y "cloud-controller-manager". El nodo que ejecuta estos componentes se denomina "nodo maestro". Estos componentes pueden ejecutarse en un solo nodo o en varios nodos, pero se recomienda ejecutarlos en varios nodos en producción para proporcionar alta disponibilidad y tolerancia a fallas. Cada componente del plano de control tiene sus propias responsabilidades, pero juntos toman decisiones globales sobre el clúster y detectan y responden a los eventos del clúster generados por los usuarios o cualquier aplicación integrada de terceros.

![image-20221126204020843](http://sm.nsddd.top/smimage-20221126204020843.png)

Entendamos los diferentes componentes del plano de control de Kubernetes. El plano de control de Kubernetes tiene los siguientes cinco componentes:

+ Servidor Kube-api
+ Programador Kube
+ Kube-controlador-administrador
+ etcétera
+ administrador-controlador-nube

**Servidor Kube-API:**

Kube-api-server es el componente principal del plano de control porque todo el tráfico pasa por api-server, si otros componentes del plano de control tienen que comunicarse con el almacén de datos 'etcd', también están conectados al api-server porque Solo el servidor Kube-api puede comunicarse con "etcd". Proporciona servicios para operaciones REST y proporciona una interfaz para el plano de control de Kubernetes, que expone la API de Kubernetes a través de la cual otros componentes pueden comunicarse con el clúster. Hay varios servidores API que se pueden implementar horizontalmente para equilibrar el tráfico mediante un equilibrador de carga.

**Programador Kube:**

Kube-scheduler es responsable de programar los Pods recién creados en el mejor nodo disponible para ejecutar en el clúster. Sin embargo, puede programar un Pod o un conjunto de Pods en un nodo específico, en una zona específica o en función de etiquetas de nodo, etc., especificando afinidad, contraespecificación o restricciones en un archivo YAML antes o antes de que se implemente el Pod. . desplegar. Si no hay nodos disponibles que cumplan con los requisitos especificados, el Pod no se implementa y permanece sin programar hasta que Kube-scheduler no pueda encontrar un nodo viable. Los nodos factibles son nodos que cumplen con todos los requisitos para la programación de Pod.

Kube-scheduler utiliza un proceso de 2 pasos para seleccionar nodos, filtrar y calificar los pods en el clúster. Durante el proceso de filtrado, Kube-scheduler encuentra un nodo viable ejecutando comprobaciones como, por ejemplo, si el nodo tiene suficientes recursos disponibles para mencionar en este pod. Después de filtrar todos los nodos viables, asigna a cada nodo viable una puntuación basada en las reglas de puntuación de actividad y ejecuta el Pod en el nodo con la puntuación más alta. Si varios nodos tienen la misma puntuación, selecciona uno al azar.

**Gestor-controlador-kube:**

Kube-controller-manager es responsable de ejecutar el proceso del controlador. En realidad, consta de cuatro procesos y se ejecuta como uno solo para reducir la complejidad. Garantiza que el estado actual coincida con el estado deseado y, si el estado actual no coincide con el estado deseado, se realizan los cambios apropiados en el clúster para lograr el estado deseado.

Incluye controlador de nodo, controlador de replicación, controlador de punto final y controlador de cuenta de servicio y token.

+ **Controlador de nodo:**: administra los nodos y vigila los nodos disponibles en el clúster y responde si algún nodo falla.
+ **Controlador de replicación:**: garantiza que se esté ejecutando la cantidad correcta de Pods para cada objeto del controlador de replicación en el clúster.
+ **Controlador de Endpoints:** – Crea objetos Endpoints, por ejemplo, para exponer un pod al exterior, necesitamos unirlo a un servicio.
+ **Cuenta de servicio y controlador de tokens:** – Responsable de crear cuentas predeterminadas y tokens de acceso a API. Por ejemplo, cada vez que creamos un nuevo espacio de nombres, necesitamos una cuenta de servicio y un token de acceso para acceder a él, por lo que estos controladores son responsables de crear la cuenta predeterminada y el token de acceso API para el nuevo espacio de nombres.

**etc.**

etcd es el almacén de datos predeterminado de Kubernetes y se utiliza para almacenar todos los datos del clúster. Es un almacén de valores clave consistente, distribuido y de alta disponibilidad. Solo se puede acceder a etcd a través de Kube-api-server. Si otros componentes del plano de control deben acceder a etcd, deben pasar por kube-api-server. etcd no es parte de Kubernetes. Es un producto de código abierto completamente diferente respaldado por Cloud Native Computing Foundation. Necesitamos configurar un plan de respaldo adecuado para etcd de modo que, si algo sale mal con el clúster, podamos restaurar el respaldo y volver a trabajar rápidamente.

**administrador-de-controlador-de-nube**

cloud-controller-manager nos permite conectar un clúster de Kubernetes local a un clúster de Kubernetes alojado en la nube. Es un componente independiente que sólo interactúa con la plataforma en la nube. El controlador de Cloud Controller Manager depende del proveedor de nube en el que ejecutamos nuestra carga de trabajo. No está disponible si tenemos un cluster de Kubernetes local o si tenemos Kubernetes instalado en nuestro propio PC con fines de aprendizaje. cloud-controller-manager también contiene tres controladores en un solo proceso, que son el controlador de nodo, el controlador de ruta y el controlador de servicio.

+ **Controlador de Nodos:** – Comprueba constantemente el estado de los nodos alojados en el proveedor de la nube. Por ejemplo, si algún nodo no responde, verifica si el nodo se ha eliminado en la nube.
+ **Controlador de ruta:**: controla y configura el enrutamiento en la infraestructura de la nube subyacente.
+ **Controlador de servicio:**: crea, actualiza y elimina balanceadores de carga del proveedor de la nube.

:::




## Arquitectura y componentes del clúster

![img](http://sm.nsddd.top/sm1363565-20200523175956216-940931564.png)

### Nodo maestro

Master es la puerta de enlace y el centro central del clúster. Sus funciones principales son exponer las interfaces API, rastrear el estado de salud de otros servidores, programar cargas de manera óptima y orquestar la comunicación entre otros componentes. Un solo nodo maestro puede completar todas las funciones, pero considerando el problema del punto único de falla, generalmente se implementan múltiples nodos maestros en un entorno de producción para formar un clúster.

| maestro | descripción general |
| --------------------------- | --------------------- ------ ---------------------------------- |
| **APIServer** | La API de Kubernetes, la entrada unificada del clúster y el coordinador de cada componente, proporciona servicios de interfaz con API RESTful. Las operaciones de adición, eliminación, modificación, verificación y monitoreo de todos los recursos del objeto se entregan a APIServer para su procesamiento y luego enviado al almacenamiento de Etcd. |
| **Programador** | Seleccione un nodo Nodo para el Pod recién creado de acuerdo con el algoritmo de programación. Se puede implementar arbitrariamente, en el mismo nodo o en diferentes nodos. |
| **Controller-Manager** | Procesa tareas regulares en segundo plano en el clúster. Un recurso corresponde a un controlador, y ControllerManager es responsable de administrar estos controladores. |

### Nodo de trabajo

Es el nodo de trabajo de Kubernetes, responsable de recibir instrucciones de trabajo del Maestro, crear y destruir objetos Pod en consecuencia de acuerdo con las instrucciones y ajustar las reglas de la red para un enrutamiento y reenvío de tráfico razonables. En un entorno de producción, puede haber N nodos.

|Nodo |Descripción general |
| -------------------------- | ---------------------- ---- --------------------------------------- |
| **kubelet** | Kubelet es el agente maestro en el nodo Node. Gestiona el ciclo de vida del contenedor que se ejecuta localmente, como la creación de contenedores, el montaje de volúmenes de datos del Pod, la descarga de secretos, la obtención del estado del contenedor y del nodo, etc. El kubelet convierte cada Pod en un conjunto de contenedores. |
| **Pod (Docker o cohete)** | Motor de contenedor, ejecutando contenedores. |
| **kube-proxy** | Implemente el proxy de red Pod en el nodo Node para mantener las reglas de red y el equilibrio de carga de cuatro capas. |

### etcd almacenamiento de datos

Sistema distribuido de almacenamiento de valores clave. Se utiliza para guardar datos de estado del clúster, como pod, servicio, red y otra información de objetos.

### Accesorios principales

Los clústeres K8S también dependen de un conjunto de componentes complementarios, normalmente específicos de la aplicación proporcionados por terceros.

| Complementos principales | Descripción general |
| ------------------ | ------------------------------ ---- ---------------------------------- |
| KubeDNS | Programe y ejecute Pods que proporcionen servicios DNS en el clúster K8S. Otros Pods en el mismo clúster pueden usar este servicio DNS para resolver nombres de host. K8S utiliza el proyecto CoreDNS de forma predeterminada desde la versión 1.11 para proporcionar servicios dinámicos de resolución de nombres para el registro y descubrimiento de servicios para el clúster. |
| Panel de control | Todas las funciones del clúster K8S deben basarse en la interfaz de usuario web para administrar las aplicaciones en el clúster y el propio clúster. |
| Heapster | Un sistema de análisis y seguimiento del rendimiento para contenedores y nodos. Recopila y analiza una variedad de datos de indicadores, como la utilización de recursos y el tiempo del ciclo de vida. En la última versión, sus funciones principales son reemplazadas gradualmente por Prometheus combinado con otros componentes. . A partir de v1.8, el monitoreo del uso de recursos se puede obtener a través de Metrics API, el componente específico es Metrics Server, que se utiliza para reemplazar el heapster anterior, este componente comenzó a abandonarse gradualmente en 1.11. |
| Metric-Server | Metrics-Server es un agregador de datos de monitoreo del núcleo del clúster. A partir de Kubernetes 1.8, se implementa de forma predeterminada como un objeto de implementación en el clúster creado por el script kube-up.sh. Si se implementa en otros maneras, debe implementarse por separado. Instalar. |
| Controlador de ingreso | Ingress es el equilibrio de carga HTTP(S) implementado en la capa de aplicación. Sin embargo, el recurso de Ingress en sí no puede penetrar el tráfico. Es sólo un conjunto de reglas de enrutamiento que deben funcionar a través del controlador de Ingress. Actualmente, los proyectos funcionales incluyen: Nginx-ingress, Traefik, Envoy y HAproxy, etc. |

### Complemento de red

| Comprobación de archivos en línea | Descripción general |
| ------------------------------------------------- ----------- | ------------------------------------- |
|Interfaz de red de contenedores (CNI) |Interfaz de red de contenedores |
| flunnal | Implementar configuración de red, red superpuesta red superpuesta |
| calico | Configuración de red, política de red; protocolo BGp, protocolo de túnel |
| canal (calico + flunnal) | Para estrategia de red, usado con franela. |
| ![img](http://sm.nsddd.top/sm1363565-20200523180136695-2145890184.png) | |

## Conceptos básicos de Kubernetes

| Conceptos básicos | |
| -------------------------- | ---------------------- ---- --------------------------------------- |
| **Etiqueta etiqueta de recurso** | Etiqueta (clave/valor), adjunta a un recurso, utilizada para asociar objetos, consultar y filtrar; |
| **Labe Selector Label Selector** | Un mecanismo para filtrar objetos de recursos calificados según Label |
| **Objeto de recurso Pod** | Un objeto de recurso Pod es un componente lógico que combina uno o más contenedores de aplicaciones, recursos de almacenamiento, IP dedicada y otras opciones para respaldar la operación |
| **Pod Controller** | Abstracción de recursos que gestiona el ciclo de vida del Pod, y es un tipo de objeto, no un único objeto de recurso. Los más comunes incluyen: ReplicaSet, Deployment, StatefulSet, DaemonSet, Job&Cronjob, etc. |
| **Recurso de servicio de servicio** | El servicio es un objeto de recurso creado en un conjunto de objetos Pod. Generalmente se usa para evitar que los Pods pierdan contacto, definir políticas de acceso para un conjunto de Pods y Pods proxy |
| **Ingress** | Si necesita proporcionar ciertos objetos Pod para el acceso de usuarios externos, debe abrir un puerto para que estos objetos Pod introduzcan tráfico externo. Además del servicio, Ingress también es una forma de proporcionar acceso externo. |
| **Volumen de almacenamiento en volumen** | Garantiza el almacenamiento persistente de datos |
| **Nombre&&Espacio de nombres** | El nombre es el identificador del objeto de recurso en el clúster K8S y generalmente actúa en el espacio de nombres (espacio de nombres), por lo que el espacio de nombres es un mecanismo de calificación adicional para los nombres. En el mismo espacio de nombres, los nombres de los objetos de recursos del mismo tipo deben ser únicos. |
| Anotación | Otro tipo de datos clave-valor adjuntos a un objeto; es conveniente para que las herramientas o los usuarios lo lean y lo encuentren. |

### Etiqueta de recurso de etiqueta

La etiqueta de recurso incorpora datos clave/valor; la etiqueta se utiliza para identificar un objeto específico, como un objeto Pod. Las etiquetas se pueden adjuntar cuando se crea el objeto, o agregarlas o modificarlas después de su creación. Vale la pena señalar que **un objeto puede tener varias etiquetas y se puede adjuntar una pestaña a varios objetos**.

![img](http://sm.nsddd.top/sm1363565-20200523180226573-1554114165.png)

### Selector de etiquetas Selector de etiquetas

Si hay una etiqueta, por supuesto hay un selector de etiquetas; por ejemplo, todos los objetos Pod que contienen la etiqueta "rol: backend" se seleccionan y se fusionan en un grupo. Por lo general, durante el uso, los objetos de recursos se clasifican por etiquetas y luego se filtran mediante selectores de etiquetas. La aplicación más común es crear un punto final de servicio para un grupo de objetos de recursos Pod con las mismas etiquetas.

![img](http://sm.nsddd.top/sm1363565-20200523180332039-330736525.png)

### Objeto de recurso de pod

Pod es la unidad de programación más pequeña de Kubernetes; es una colección de contenedores.

> ¡Pod puede encapsular uno o varios contenedores! El espacio de nombres de la red y los recursos de almacenamiento se comparten en el mismo Pod, y los contenedores pueden comunicarse directamente a través de la interfaz de loopback local: he aquí, pero están aislados entre sí en espacios de nombres como Mount, User y Pid.

Un Pod es en realidad una instancia única de una aplicación en ejecución y, por lo general, consta de uno o más contenedores de aplicaciones que comparten recursos y están estrechamente relacionados.

![img](http://sm.nsddd.top/sm1363565-20200523180259373-1808638376.png)

Hacemos una analogía de cada objeto Pod con un host físico. Luego, varios procesos que se ejecutan en el mismo objeto Pod son similares a procesos independientes en el host físico. La diferencia es que cada proceso en el objeto Pod se ejecuta entre sí. En contenedores aislados, dos claves los recursos se comparten entre cada contenedor;

Volúmenes de red y almacenamiento.

+ Red: a cada objeto Pod se le asigna una dirección IP de Pod, y todos los contenedores dentro del mismo Pod comparten la red y el espacio de nombres UTS del objeto Pod, incluido el nombre de host, la dirección IP, el puerto, etc. Por lo tanto, estos contenedores pueden comunicarse a través de la interfaz de bucle invertido local lo, y la comunicación con otros componentes fuera del Pod debe completarse utilizando el puerto IP+ del clúster del objeto de recurso de Servicio.
+ Volumen de almacenamiento: los usuarios pueden configurar un conjunto de recursos de volumen de almacenamiento para el objeto Pod. Estos recursos se pueden compartir con todos los contenedores en el mismo Pod, completando así el intercambio de datos entre contenedores.Disfrutar. Los volúmenes de almacenamiento también garantizan un almacenamiento persistente de datos incluso después de que el contenedor se cierre, reinicie o elimine.

Un Pod representa una instancia de una aplicación. Ahora necesitamos extender esta aplicación; esto significa crear múltiples instancias de Pod, cada instancia representa una copia en ejecución de la aplicación.

Las herramientas para administrar estos objetos Pod replicados se implementan mediante un grupo de objetos llamado Controlador; como los objetos del controlador de implementación.

Al crear un Pod, también podemos usar el objeto Pod Preset para inyectar información específica en el Pod, como Configmap, Secret, volumen de almacenamiento, montaje de volumen, variables de entorno, etc. Con el objeto Pod Preset, la creación de plantillas de Pod no requiere proporcionar toda la información para cada visualización de plantilla.

Según el estado deseado predeterminado y la disponibilidad de recursos de cada nodo Nodo, el Maestro programará el objeto Pod para que se ejecute en el nodo trabajador seleccionado. El nodo trabajador descarga la imagen del almacén de imágenes puntiagudas y la inicia en el entorno de ejecución del contenedor local. .contenedor. Master guardará el estado de todo el clúster en etcd y lo compartirá con varios componentes y clientes del clúster a través del servidor API.

### Controlador de cápsula (Controlador)

Al presentar Pod, mencionamos que Pod es la unidad de programación más pequeña de K8S; sin embargo, Kubernetes no implementa ni administra objetos Pod directamente, sino que depende de otro recurso abstracto: el Controlador para la administración.

Controladores de pod comunes:

| Controlador de cápsulas | |
| -------------------------- | ---------------------- ---- ---------------------------------------------- - |
| **Controlador de replicación** | Utilice el controlador de réplica. Solo este controlador de Pod es compatible con los madrugadores; completa operaciones como el aumento y la disminución de Pod, el control del número total, la actualización continua, la reversión, etc., y ha sido descontinuado |
| **ReplicaSet Controller** | Utilice el controlador del conjunto de réplicas después de actualizar la versión y declare el método de uso; es una versión actualizada de Replication Controller |
| **Implementación** | Se utiliza para la implementación de aplicaciones sin estado, como nginx, etc.; mencionaremos el controlador HPA (Horizontal Pod Autosaler) más adelante: se utiliza para el controlador de escalado automático de Pod horizontal para controlar rs&deployment |
| **StatefulSet** | Se utiliza para la implementación de aplicaciones con estado, como mysql, zookeeper, etc. |
| **DaemonSet** | Asegúrese de que todos los nodos ejecuten el mismo Pod, como franela de verificación de archivos de red, zabbix_agent, etc.
| Trabajo | Tarea única |
| Cronjob | Tareas programadas |

Los controladores son objetos de nivel superior que se utilizan para implementar y administrar Pods.

Tomando la implementación como ejemplo, es responsable de garantizar que la cantidad de copias del objeto Pod definido cumpla con la configuración esperada, de modo que los usuarios solo necesiten declarar el estado deseado de la aplicación y el controlador la administrará automáticamente.

![img](http://sm.nsddd.top/sm1363565-20200523180401866-1621029241.png)

El Programador programará los objetos Pod creados por los usuarios manualmente o directamente a través del Controlador para que se ejecuten en un nodo de trabajo en el clúster, finalizarán normalmente una vez que finalice la ejecución del proceso de la aplicación del contenedor y luego se eliminarán.

> Cuando los recursos de un nodo se agotan o no funcionan correctamente, también provocará el reciclaje de objetos Pod.

En el diseño del clúster K8S, Pod es un objeto con un ciclo de vida. Luego se usa un controlador para administrar objetos Pod únicos.

> Por ejemplo, es necesario asegurarse de que la cantidad de copias de Pod de la aplicación implementada alcance la cantidad esperada por el usuario y reconstruir el objeto Pod en función de la plantilla de Pod, para lograr la expansión, contracción y actualización continua. y capacidades de autorreparación del objeto Pod.
>
> Por ejemplo, si un nodo falla, el controlador correspondiente reprogramará los objetos Pod que se ejecutan en el nodo a otros nodos para su reconstrucción.

El controlador en sí también es un tipo de recurso y, en conjunto, se denominan controladores Pod. La implementación, como se muestra a continuación, es una implementación representativa de este tipo de controlador y es el controlador Pod que se utiliza actualmente para administrar aplicaciones sin estado.

![img](http://sm.nsddd.top/sm1363565-20200523180431487-339597555.png)

La definición de un controlador de pod generalmente consta de la cantidad deseada de réplicas, una plantilla de pod y un selector de etiquetas. El controlador de pod combinará y filtrará las etiquetas de los objetos de pod según el selector de etiquetas. Todos los pods que cumplan con las condiciones de selección serán administrados por el controlador actual y se incluirán en el número total de réplicas para garantizar que el número alcance el número esperado. de réplicas de estado.

> En escenarios de aplicaciones reales, cuando la carga de tráfico de solicitudes recibidas es menor o cercana a la capacidad de carga de las réplicas de Pod existentes actualmente, debemos modificar manualmente la cantidad esperada de réplicas en el controlador de Pod para lograr la expansión y contracción de la aplicación. escala. . Cuando se implementan componentes de monitoreo de recursos como HeapSet o Prometheus en el clúster, los usuarios también pueden usar HPA (HorizontalPod Autoscaler) para calcular la cantidad adecuada de copias de Pod y modificar automáticamente la cantidad esperada de copias en el controlador de Pod para lograr un escalado dinámico de la aplicación. La escala mejora la utilización de los recursos del clúster.

Cada nodo en el clúster K8S ejecuta "cAdvisor", que se utiliza para recopilar datos en vivo sobre la utilización de CPU, memoria y recursos de disco de contenedores y nodos. Estos datos estadísticos se agregan mediante métricas y se puede acceder a ellos a través del servidor API. El `HorizontalPodAutoscaler` monitorea el estado del contenedor y toma decisiones de escala en función de estas estadísticas.

### Recursos de servicio de servicio

| Rol o función principal | |
| ---------------------------------- | -------------- ---- ---------------------------------------------- -- |
| Evitar que Pod pierda contacto | El servicio es un objeto de recurso construido en un grupo de objetos Pod. Como se mencionó anteriormente, selecciona un grupo de objetos Pod a través del Selector de etiquetas y define una entrada de acceso fija unificada para este grupo de objetos Pod (generalmente una dirección IP), si K8S tiene un archivo adjunto DNS (como coredns), configurará automáticamente un nombre DNS para el servicio cuando se cree para que el cliente descubra el servicio. |
| Definir un conjunto de políticas de acceso al Pod, Pod proxy | Por lo general, solicitamos directamente la IP del servicio y la solicitud se equilibrará con la carga en el punto final de back-end, es decir, cada objeto Pod, es decir, el equilibrador de carga; por lo tanto, El Servicio es esencialmente un servicio Proxy de 4 capas; además, el Servicio también puede introducir tráfico desde fuera del clúster al clúster, lo que requiere que los nodos asigne el puerto del Servicio. |

El objeto Pod tiene una dirección IP del Pod, pero esta dirección cambia después de que el objeto se reinicia o reconstruye. La aleatoriedad de la dirección IP del Pod crea muchos problemas para el mantenimiento de la dependencia del sistema de la aplicación.

> Por ejemplo: la aplicación Pod de front-end `Nginx` no puede cargar la aplicación Pod de back-end `Tomcat` basada en una dirección IP fija.

Los recursos de servicio deben agregar una capa intermedia con una dirección IP fija al objeto Pod al que se accede. Después de que el cliente inicia una solicitud de acceso a esta dirección, los recursos de servicio relevantes la programarán y la enviarán al objeto Pod de back-end.

El servicio no es un componente específico, sino una colección lógica de múltiples objetos Pod definidos mediante reglas y viene con una estrategia para acceder a este conjunto de objetos Pod. Los objetos de servicio seleccionan y asocian objetos Pod de la misma manera que los controladores Pod, que se definen mediante selectores de etiquetas.

![img](http://sm.nsddd.top/sm1363565-20200523180459175-924096694.png)

------

La IP de servicio es una IP virtual, también conocida como "IP de clúster", dedicada a la comunicación dentro del clúster.

> Por lo general, se utiliza un segmento de dirección dedicado, como la red 10.96.0.0/12, y el sistema asigna dinámicamente la dirección IP de cada objeto de Servicio dentro de este rango.

Los objetos Pod en el clúster pueden solicitar directamente este tipo de "IP de clúster". Por ejemplo, se puede acceder a la solicitud de acceso del cliente Pod en la figura anterior a través de la "IP de clúster" del Servicio como dirección de destino, pero es una red privada en la red del clúster. Dirección, **solo se puede acceder a ella dentro del clúster**.

Normalmente lo que necesitamos es acceso externo, el método común para introducirlo en el cluster es a través de la red de nodos, el método de implementación es el siguiente:

> + Solicitud de acceso a través de la dirección IP + puerto (Node Port) del nodo de trabajo.
> + Proxy la solicitud al puerto de servicio de la IP del clúster del objeto de servicio correspondiente. En términos sencillos: el puerto en el nodo de trabajo asigna el puerto de servicio.
> + El objeto Servicio reenvía la solicitud a la IP del Pod del objeto Pod backend y al puerto de escucha de la aplicación.

Por lo tanto, similar al cliente externo del clúster desde el Cliente externo en la figura anterior, no puede solicitar directamente la IP del clúster del Servicio. En su lugar, necesita pasar la dirección IP de un determinado nodo de trabajo. En este caso, la solicitud debe que se reenviará dos veces para llegar al objeto Pod. de destino. La desventaja de este tipo de acceso es que existe un cierto retraso en la eficiencia de la comunicación.

### Ingreso

K8S aísla el objeto Pod del entorno de red externo. La comunicación entre objetos como Pod y Servicio debe realizarse a través de direcciones internas dedicadas.

Por ejemplo, si necesita proporcionar ciertos objetos Pod para el acceso de usuarios externos, debe abrir un puerto para que estos objetos Pod introduzcan tráfico externo. Además del Servicio, Ingress también es una forma de proporcionar acceso externo.

### Volumen de almacenamiento de volumen

Un volumen de almacenamiento (Volumen) es un espacio de almacenamiento independiente del sistema de archivos del contenedor y, a menudo, se utiliza para expandir el espacio de almacenamiento del contenedor y proporcionarle capacidades de almacenamiento persistentes.

> Los volúmenes de almacenamiento se clasifican en K8S como:
>
> 1. Volumen temporal
> 2. Volumen local
> 3. Volumen de red

Tanto los volúmenes temporales como los volúmenes locales se encuentran localmente en el Nodo. ​​Una vez que el Pod está programado para otros nodos del Nodo, este tipo de volumen de almacenamiento no será accesible porque los volúmenes temporales y los volúmenes locales generalmente se usan para el almacenamiento en caché de datos, y los datos persistentes generalmente se usan para almacenar en caché los datos. colocado en volúmenes persistentes (volumen persistente).

### Nombre y espacio de nombres

Los espacios de nombres se utilizan a menudo para aislar recursos para que un inquilino o proyecto forme agrupaciones lógicas. Para este concepto, puede consultar el concepto en la documentación de Docker https://www.jb51.net/article/136411.htm

Como se muestra en la figura: Los objetos de recursos creados, como Pod y Servicio, pertenecen al nivel de espacio de nombres. Si no se especifica, todos pertenecen al espacio de nombres predeterminado "predeterminado".

![Esta imagen está muerta⚠️ ~](http://sm.nsddd.top/sm1363565-20200523180512841-2018842328.png)

### Anotación de anotación

La anotación es otro tipo de datos clave-valor adjuntos a objetos. A menudo se usa para adjuntar varios metadatos no identificables (metadatos) a objetos, pero no se puede usar para identificar y seleccionar objetos. Su función es facilitar a las herramientas o usuarios la lectura y búsqueda.