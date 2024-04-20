---
title: 'Comprensión profunda de Kubernetes y otros componentes ETCD'
ShowRssButtonInSectionTermList: true
cover.image:
date : 2023-09-26T12:03:38+08:00
draft : false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: ["kubernetes", "etcd", "raft", "go"]
tags:
  - blog
  - kubernetes
  - etcd
  - raft
  - go
categories:
  - Development
  - Blog
  - Kubernetes
description: >
    Este artículo explicará ETCD y Raft en profundidad y en todo momento. Y analice ETCD en profundidad desde la perspectiva de Kubernetes.
---

## Antes de empezar

> ETCD es el más difícil de todos los componentes de Kubernetes porque ETCD tiene estado, no apátrida.

Cuando estaba diseñando el tiempo de ejecución de k3s antes, aprendí algunos conceptos sobre los algoritmos ETCD y Raft. Como preludio al conocimiento, vaya a [ETCD] (https://docker.nsddd.top/Cloud-Native-k8s/24. html) y [Algoritmo Raft](https://docker.nsddd.top/Cloud-Native-k8s/25.html) para el aprendizaje previo.

**Este artículo explicará ETCD y Raft en profundidad y en todo momento. Y analice ETCD en profundidad desde la perspectiva de Kubernetes. **



##ETCD

### introducir

Etcd es un almacenamiento distribuido de valores clave desarrollado por CoreOS basado en Raft, que se puede utilizar para el descubrimiento de servicios, la configuración compartida y la garantía de coherencia (como la selección maestra de la base de datos, bloqueos distribuidos, etc.).

Todas las funciones y características incluidas se han aprendido en Prelude. Echemos un vistazo al almacenamiento que más preocupa a Kubernetes:

### La función principal

+ Almacenamiento básico de valores clave
+ Mecanismo de seguimiento
+ Mecanismo de vencimiento y renovación de claves para monitoreo y descubrimiento de servicios
+ Comparación e intercambio atómico y Comparación y eliminación, utilizados para bloqueos distribuidos y elección de líder

### escenas a utilizar

+ Se puede utilizar para almacenamiento de valores clave, las aplicaciones pueden leer y escribir datos en etcd.
+ Los escenarios de aplicación más comunes de etcd son para el registro y descubrimiento de servicios.
+ Sistema asincrónico distribuido basado en mecanismo de escucha.

etcd es un componente de almacenamiento de valores clave y otras aplicaciones se basan en su función de almacenamiento de valores clave.

+ Utiliza almacenamiento de datos tipo kv, que generalmente es más rápido que las bases de datos relacionales.
+ Admite almacenamiento dinámico (memoria) y almacenamiento estático (disco).
+ Almacenamiento distribuido, que se puede integrar en un clúster de múltiples nodos.
+ Método de almacenamiento, utilizando una estructura de directorio similar. (árbol B+)
   + Solo los nodos hoja pueden almacenar datos, lo que equivale a archivos.
   + El nodo padre de un nodo hoja debe ser un directorio y el directorio no puede almacenar datos.

**Registro y descubrimiento de servicios:**

+ Directorio de almacenamiento de servicios de alta consistencia y alta disponibilidad.
   + etcd basado en el algoritmo Raft es inherentemente un directorio de almacenamiento de servicios con gran consistencia y alta disponibilidad.
+ Un mecanismo para el registro de servicios y servicios de salud.
   + Los usuarios pueden registrar servicios en etcd, configurar TTL clave para el servicio registrado y mantener periódicamente el latido del servicio para monitorear el estado de salud.

**Publicación de mensajes y suscripción:**

+ En un sistema distribuido, el método de comunicación más adecuado entre componentes es la publicación de mensajes y la suscripción.
+ Eso es construir un centro de intercambio de configuración. Los proveedores de datos publican mensajes en este centro de configuración y los consumidores de mensajes se suscriben a los temas que les interesan. Una vez que se publica un mensaje sobre el tema, los suscriptores serán notificados en tiempo real.
+ De esta manera, se puede lograr una gestión centralizada y una actualización dinámica de las configuraciones del sistema distribuido.
+ Parte de la información de configuración utilizada en la aplicación se coloca en etcd para una administración centralizada.
+ La aplicación obtiene activamente la información de configuración de etcd cuando se inicia. Al mismo tiempo, registra un Vigilante en el nodo etcd y espera. Cada vez que la configuración se actualice en el futuro, etcd notificará a los suscriptores en tiempo real, por lo que para obtener la información de configuración más reciente.



## instalar

```golpecito
ETCD_VER=v3.4.17
DOWNLOAD_URL=https://github.com/etcd-io/etcd/releases/download
rm -f /tmp/etcd-${ETCD_VER}-linux-amd64.tar.gz
rm -rf /tmp/etcd-descargar-prueba && mkdir -p /tmp/etcd-descargar-prueba
curl -L ${DOWNLOAD_URL}/${ETCD_VER}/etcd-${ETCD_VER}-linux-amd64.tar.gz -o /tmp/etcd-${ETCD_VER}-linux-amd64.tar.gz
tar xzvf /tmp/etcd-${ETCD_VER}-linux-amd64.tar.gz -C /tmp/etcd-download-test --strip-components=1
rm -f /tmp/etcd-${ETCD_VER}-linux-amd64.tar.gz
rm -rf /tmp/etcd-descargar-prueba
```



### puesta en marcha

Cabe señalar que ETCD se instaló localmente cuando instalé Kubernetes. Hay dos soluciones a este problema:

+ Utilice la bandera para especificar el puerto y cambiar el puerto
+ Desinstalar, reinstalar



UNO:

```golpecito
etcd --listen-client-urls 'http://localhost:12379' \
  --advertise-client-urls 'http://localhost:12379' \
  --listen-peer-urls 'http://localhost:12380' \
  --URL-de-pares-de-publicidad-inicial 'http://localhost:12380' \
  --clúster inicial 'predeterminado=http://localhost:12380'
```



### Demostración

Ver miembros del clúster:

![image-20230304170809258](http://sm.nsddd.top/sm202303041708430.png)



**Algunas operaciones simples:**

> Hay muchos casos en el prefacio, continúe ~

```golpecito
# Entrada de datos
etcdctl --endpoints=localhost:12379 poner /key1 val1
# Consultar datos
etcdctl --endpoints=localhost:12379 obtener /key1
# Consultar datos: mostrar información detallada.
etcdctl --endpoints=localhost:12379 obtener /key1 -w json
# Consultar datos por prefijo de clave
etcdctl --endpoints=localhost:12379 obtener --prefix /
# Mostrar solo valores clave
etcdctl --endpoints=localhost:12379 obtener --prefix / --keys-only
# datos de visualización
etcdctl --endpoints=localhost:12379 reloj --prefix /
```

**Tenga en cuenta:**

watch proporciona una conexión larga para monitorear los cambios en los eventos y recibirá suscripciones si se producen cambios.

```golpecito
❯ etcdctl --endpoints=localhost:12379 reloj --prefix / --rev 0
PONER
/llave
val3
```



### plan de ruta

** Sí, cuando hablamos anteriormente sobre la estructura del directorio del código fuente de Kubernetes, explicamos: la API en el directorio de Kubernetes y dijimos que la API cumple con el estándar RESTful API y que el identificador de versión generalmente se coloca en la URL. como `/v1/users`, la ventaja de esto es que es muy intuitivo. **

**El diseño de GKV es así~**

ETCD admite la coincidencia de rutas:

```golpecito
❯ etcdctl --endpoints=localhost:12379 obtiene un
❯ etcdctl --endpoints=localhost:12379 ponga un
^C
❯ etcdctl --endpoints=localhost:12379 ponga un 1
DE ACUERDO
❯ etcdctl --endpoints=localhost:12379 poner b 2
DE ACUERDO
❯ etcdctl --endpoints=localhost:12379 poner /a 11
DE ACUERDO
❯ etcdctl --endpoints=localhost:12379 poner /b 22
DE ACUERDO
❯ etcdctl --endpoints=localhost:12379 poner /a/b 1122
DE ACUERDO
❯ etcdctl --endpoints=localhost:12379 get --prefix /
/a
11
/a/b
1122
/b
Veintidós
/llave
val3
/Dakota del Sur
como
❯ etcdctl --endpoints=localhost:12379 get --prefix /a
/a
11
/a/b
1122
❯ etcdctl --endpoints=localhost:12379 get --prefix /b
/b
Veintidós
```

** Todo lo anterior tiene valores, pero también sabemos que el valor de datos de la API de Kubernetes es muy grande y es un archivo yaml uno por uno, por lo que podemos filtrar la clave: **

```golpecito
❯ etcdctl --endpoints=localhost:12379 get --prefix / --keys-only
/a

/a/b

/b

/llave

/Dakota del Sur
```



**Podemos agregar el parámetro `debug` para ver los detalles del comando y la información de depuración: **

```golpecito
❯ etcdctl --endpoints=localhost:12379 get --prefix / --keys-only --debug
```





### Núcleo: TTL y CAS

TTL (tiempo de vida) se refiere a establecer un período de validez para una clave. Después de su vencimiento, la clave se eliminará automáticamente. Esto se utiliza en muchas implementaciones de bloqueo distribuido para garantizar la efectividad del bloqueo en tiempo real.

> Pero desde la perspectiva de Kubernetes, no mucha gente usa TTL, así que ~

Atomic Compare-and-Swap (CAS) significa que al asignar una clave, el cliente debe proporcionar algunas condiciones. Cuando se cumplen estas condiciones, la asignación puede tener éxito. Estas condiciones incluyen:

+ `prevExist`: si la clave existe antes de la asignación actual
+ `prevValue`: el valor de la clave antes de la asignación actual
+ `prevIndex`: índice antes de que la clave esté asignada actualmente

En este caso, la configuración de la clave es un requisito previo y necesita conocer la situación específica actual de la clave antes de poder configurarla.


### Kubernetes interactúa con ETCD

```golpecito
kubectl obtiene la vaina -A
kubectl exec -it etcd-cadmin sh # etcd tiene sh pero no bash
```

## Protocolo de balsa

El protocolo Raft se basa en el mecanismo de quórum, que es el principio de consentimiento mayoritario: cualquier cambio debe ser confirmado por más de la mitad de los miembros.

> Visualización recomendada: [Animación del protocolo de balsa](http://thesecretlivesofdata.com/raft/)



### Aprendiz

Nuevos roles introducidos en Raft 4.2.1

Cuando aparece un clúster etcd y necesita agregar nodos

En este momento, la diferencia de datos entre el nuevo nodo y el líder es grande y se requiere más sincronización de datos para mantenerse al día con los datos más recientes del líder.

En este momento, es probable que el ancho de banda de la red del líder se agote, lo que hace que el líder no pueda mantener los latidos normales. Esto, a su vez, hace que el seguidor reinicie la votación. Esto puede provocar que el clúster etcd deje de estar disponible.

> **Es decir**: agregar miembros al clúster etcd tendrá un gran impacto en la estabilidad del clúster.

Por lo tanto, se agregó el rol de aprendiz. Los nodos que se unen al clúster en este rol no participan en la votación y reciben el "mensaje de replicación" del líder hasta que se sincronizan con el "líder".

** El rol de Estudiante solo recibe datos pero no participa en la votación ni proporciona servicios de lectura y escritura, por lo que al agregar nodos de aprendizaje, el quórum del clúster permanece sin cambios. **

Los administradores de clústeres deben minimizar las operaciones innecesarias al agregar nuevos nodos al clúster. Puede agregar un nodo `aprendiz` al clúster etcd mediante el comando `member add --learner`. No participa en la votación y solo recibe `mensajes de replicación`.

Después de sincronizar el nodo "Aprendiz" con el líder, el estado del nodo se puede promover a seguidor a través de "promoción de miembro", y luego se incluirá en el tamaño del quórum.



### consistencia de etcd basada en Raft

**Método de elección:**

+ Durante el inicio inicial, el nodo está en el estado "seguidor" y está configurado con un tiempo de espera de elección. Si no se recibe ningún latido del líder dentro de este período de tiempo, el nodo iniciará una **elección**: después de cambiar a candidato, envíe una solicitud a otros nodos seguidores en el clúster para preguntarles si deben elegirse a sí mismos como líder.
+ Después de recibir el voto de aceptación de **más de la mitad** de los nodos del clúster, el nodo se convierte en líder y comienza a recibir y guardar datos del cliente y a sincronizar registros con otros nodos seguidores. Si no se llega a un consenso, el candidato selecciona aleatoriamente un intervalo de espera (150 ms ~ 300 ms) para iniciar la votación nuevamente. El candidato que sea aceptado por más de la mitad de los seguidores del grupo se convertirá en el líder.
+ El nodo líder depende del envío regular de latidos a los seguidores para mantener su estado.
+ Si en algún momento otros seguidores no reciben un latido del líder durante el tiempo de espera de la elección, también cambiarán su estado a candidato e iniciarán una elección. Por cada elección exitosa, el mandato del nuevo líder será uno mayor que el mandato del líder anterior. **



### Replicación de registros

Cuando el "Líder" recibe el registro del cliente (solicitud de transacción), primero agrega el registro al "Registro" local y luego sincroniza la "Entrada" con otros Seguidores a través del "latido". El Seguidor registra el registro después de recibir el registro. Luego envía ACK al Líder. Cuando el Líder recibe la información ACK de la mayoría de los (n/2+1) Seguidores, configura el registro como enviado y lo agrega al disco local, notifica al cliente y lo envía al Líder en el siguiente "latido" `Se notificará a todos los `Seguidores` para que almacenen el registro en sus discos locales.



### seguridad

La seguridad es un mecanismo de seguridad que se utiliza para garantizar que cada nodo ejecute la misma secuencia. Por ejemplo, cuando un seguidor deja de estar disponible durante el registro de confirmación del líder actual, el seguidor puede ser elegido nuevamente como líder más tarde, y luego el nuevo líder puede crear un nuevo registro. se utiliza para sobrescribir el Registro previamente comprometido, lo que hace que el nodo ejecute diferentes secuencias; La seguridad es un mecanismo utilizado para garantizar que el Líder elegido debe contener el Registro previamente comprometido; Seguridad de las elecciones: cada término (Término) solo puede elegir un Líder. Completitud del líder (completitud del líder): se refiere a la integridad del registro del líder. Cuando el registro se compromete en el Término 1, el Líder en los términos posteriores, Término 2, Término 3, etc., debe contener el Registro; Balsa está en la fase de elección El criterio de uso del Término se utiliza para garantizar la integridad: cuando el Término del Candidato solicitado para votar es mayor o el Término tiene el mismo Índice y es mayor, se vota, de lo contrario se rechaza la solicitud.



### Manejo de fallas

1) **Falla del líder**: Otros nodos que no hayan recibido latidos iniciarán una nueva elección y, cuando el líder se recupere, automáticamente se convertirá en seguidor debido a la pequeña cantidad de pasos (el registro también será sobrescrito por el registro del nuevo líder)

2) El nodo seguidor no está disponible: la situación en la que el nodo seguidor no está disponible es relativamente fácil de resolver. Debido a que el contenido del registro en el clúster siempre se sincroniza desde el nodo líder, siempre que este nodo se una nuevamente al clúster, puede copiar el registro del nodo líder nuevamente.

3) Múltiples candidatos: después del conflicto, el candidato seleccionará aleatoriamente un intervalo de espera (150 ms ~ 300 ms) para iniciar la votación nuevamente. El candidato aceptado por más de la mitad de los seguidores en el grupo se convertirá en el líder.



### registro de pared

El registro wal es binario y, después del análisis, es la estructura de datos anterior LogEntry. El primer campo, tipo, tiene sólo dos tipos,

+ Uno es 0 significa "Normal", 1 significa ConfChange (ConfChange significa la sincronización de los cambios de configuración del propio Etcd, como la unión de nuevos nodos, etc.).
+ El segundo campo es "término". Cada término representa el término de un nodo maestro. El término cambiará cada vez que cambie el nodo maestro.
+ El tercer campo es "índice". Este número de serie aumenta estrictamente de forma secuencial y representa el número de serie del cambio.
+ El cuarto campo son datos binarios, que guardan toda la estructura pb del objeto de solicitud de balsa.

Hay herramientas/etcddump-logs en el código fuente de etcd, que pueden volcar el registro de wal en texto para verlo y pueden ayudar a analizar el protocolo Raft.

El protocolo Raft en sí no se preocupa por los datos de la aplicación, es decir, la parte de los datos. La coherencia se logra sincronizando el registro de pared. Cada nodo aplica los datos recibidos del nodo maestro al almacenamiento local. Raft solo se preocupa por la sincronización. estado del registro. Si hay un error en la implementación del almacenamiento local, por ejemplo, los datos no se aplican correctamente localmente, también puede provocar inconsistencia en los datos.



### Mecanismo de almacenamiento

La tienda etcd v3 se divide en dos partes: una parte es el índice en memoria, kvindex, que se implementa en base a un Golang btree de código abierto de Google, y la otra parte es el almacenamiento back-end. Según su diseño, el backend puede conectarse a una variedad de almacenamientos, actualmente usando BoltDB. Boltdb es un almacenamiento kv independiente que admite transacciones, y las transacciones etcd se implementan en función de las transacciones de BoltDB. La clave almacenada por etcd en BoltDB es la reversión y el valor es la combinación clave-valor de etcd, es decir, etcd guardará cada versión en BoltDB, implementando así un mecanismo de múltiples versiones.

La reversión consta principalmente de dos partes: la primera parte es la rev principal, que se incrementa en uno para cada transacción y la segunda parte es la rev secundaria, que se incrementa en uno para cada operación en la misma transacción.

etcd proporciona comandos y opciones de configuración para controlar compacto y admite parámetros de operación de colocación para controlar con precisión la cantidad de versiones históricas de una determinada clave.

La memoria kvindex guarda la relación de mapeo entre clave y revisión, que se utiliza para acelerar las consultas.



### Mecanismo de reloj

watcherGroup es el mecanismo de agrupación de Watchers en ETCD, que se puede utilizar para administrar Watchers de manera más efectiva y evitar que los Watchers consuman demasiados recursos.

Al utilizar watcherGroup, puede crear varios observadores y asignarlos a diferentes grupos de observadores. Hay un bucle de eventos dentro de cada watcherGroup, que es responsable de procesar las notificaciones de eventos de los Watchers en el grupo. A través del mecanismo de agrupación, Watcher puede responder a los cambios de datos en el almacenamiento de manera más eficiente, reduciendo así el consumo de recursos del clúster ETCD.

watcherGroup se puede crear de las siguientes maneras:

```ir
irCopiar código
wg := clientv3.NewWatcher(watchCli).Watchers()
```

El código anterior crea un WatcherGroup wg que está asociado con el cliente ETCD watchCli. Se puede agregar un Watcher a un WatcherGroup usando el siguiente código:

```ir
irCopiar código
observador := wg.NewWatcher()
```

Esto creará un nuevo Watcher y lo agregará al WatcherGroup. Cuando crea un Vigilante, puede especificar las claves o prefijos que el Vigilante desea monitorear, así como el comportamiento de respuesta del Vigilante (como la activación directa o la activación por lotes).

Cuando se utiliza watcherGroup, los Watchers también se pueden administrar en grupos. Se puede agregar un Watcher a un watcherGroup específico usando el siguiente código:

```ir
goCopiar códigowg.Group("grupo1").Agregar(observador1)
wg.Group("grupo2").Agregar(observador2)
```

Esto agregará watcher1 a un WatcherGroup llamado "group1" y watcher2 a un WatcherGroup llamado "group2".

Al utilizar watcherGroup, puede administrar mejor los Watchers y mejorar el rendimiento y la escalabilidad de su clúster ETCD.



### Diagrama de flujo de solicitud de ETCD

![image-20230304194117423](http://sm.nsddd.top/sm202303041941660.png)

**Módulo MVCC**

> Kubernetes API Server no proporciona un mecanismo de almacenamiento en caché de forma predeterminada, siempre lee los datos más recientes de etcd y los devuelve al cliente. Esto se debe a que etcd, como backend de almacenamiento de Kubernetes, ya tiene garantías de alta disponibilidad y confiabilidad, por lo que el servidor API puede leer datos directamente de etcd para garantizar la coherencia y confiabilidad de los datos.
>
> Sin embargo, dado que el rendimiento de etcd es relativamente deficiente y puede convertirse fácilmente en un cuello de botella en situaciones de alta concurrencia, es necesario utilizar el almacenamiento en caché en algunos escenarios para optimizar el rendimiento del servidor API. Con este fin, Kubernetes proporciona un componente llamado kube-aggregator, que puede construir una capa de caché frente al servidor API para mejorar el rendimiento y la escalabilidad del servidor API.
>
> kube-aggregator es en realidad un agregador de API, que puede agregar solicitudes de múltiples servidores API y proporcionar funciones como almacenamiento en caché y equilibrio de carga. kube-aggregator puede almacenar en caché los datos devueltos por el servidor API localmente y actualizarlos periódicamente según sea necesario. De esta manera, en condiciones de alta concurrencia, el servidor API puede leer datos directamente desde el caché local, evitando el acceso frecuente a etcd, mejorando así el rendimiento y la estabilidad del sistema.

El cliente envía una solicitud a etcd.

> El cliente puede enviar una solicitud a ETCD a través de la API proporcionada por ETCD, que puede ser una operación de lectura o una operación de escritura.

La solicitud es recibida primero por la capa de red de ETCD.

> Cuando una solicitud llega al servidor ETCD, primero la recibe y procesa la capa de red. La capa de red de ETCD utiliza el protocolo gRPC para la comunicación, que puede garantizar la confiabilidad y eficiencia de las solicitudes.

Luego, ETCD enviará la solicitud a su capa interna Raft.

> ETCD utiliza internamente el algoritmo Raft para lograr coherencia distribuida y todos los datos se almacenan en la capa Raft. Cuando la solicitud llega a la capa Raft, la capa Raft la procesará de acuerdo con el estado actual del clúster y reenviará la solicitud al nodo apropiado para su procesamiento.

La capa Raft procesará la solicitud. Si es una operación de lectura, los datos se devolverán. Si es una operación de escritura, los datos se escribirán en el motor de almacenamiento.

> Cuando la solicitud llega al nodo de destino, la capa Raft la procesará según el tipo de solicitud. Si es una operación de lectura, la capa Raft leerá los datos del motor de almacenamiento y los devolverá al cliente; si es una operación de escritura, la capa Raft escribirá los datos en el motor de almacenamiento y esperará a que el motor de almacenamiento devolver una respuesta exitosa.

El motor de almacenamiento escribe los datos en el disco y devuelve una respuesta exitosa.

> El motor de almacenamiento es la capa de almacenamiento de datos subyacente de ETCD, que utiliza el motor de almacenamiento del árbol LSM. Cuando el motor de almacenamiento recibe la solicitud de escritura, escribe los datos en la memoria.En MemTable, cuando MemTable esté lleno, el archivo SSTable se generará y se escribirá en el disco. Después de escribir en el disco, el motor de almacenamiento devolverá una respuesta exitosa a la capa Raft.

La capa Raft devuelve la respuesta a la capa de red de ETCD.

> Cuando la capa Raft recibe una respuesta exitosa del motor de almacenamiento, devolverá la respuesta a la capa de red ETCD para su procesamiento. La capa de red encapsulará la respuesta y la devolverá al cliente a través del protocolo gRPC.

Finalmente, la capa de red de etcd envía la respuesta al cliente.
Cuando la capa de red recibe la respuesta devuelta por la capa Raft, la descomprimirá y la devolverá al cliente para completar todo el proceso de procesamiento de la solicitud.



## Parámetros relacionados

### Parámetros importantes de los miembros de etcd

Parámetros relacionados con miembros

* `--nombre 'predeterminado'`
   * Nombre legible por humanos para este miembro.

* `--data-dir '${nombre}.etcd'`
   * Ruta al directorio de datos.

* `--listen-peer-urls 'http://localhost:2380'`
   * Lista de URL para escuchar el tráfico de pares.

* `--listen-client-urls 'http://localhost:2379'`
   * Lista de URL para escuchar el tráfico de clientes.



### Parámetros importantes del clúster etcd

Parámetros relacionados con el clúster

* `--URL-de-pares-anuncio-inicial 'http://localhost:2380'`
   * Lista de las URL de pares de este miembro para anunciar al resto del clúster.

* `--initial-cluster 'default=http://localhost:2380'`
   * Configuración inicial del cluster para bootstrapping.

* `--estado-clúster-inicial 'nuevo'`
   * Estado inicial del clúster ('nuevo' o 'existente').

* `--initial-cluster-token 'etcd-cluster'`
   * Token de clúster inicial para el clúster etcd durante el arranque.

* `--advertise-client-urls 'http://localhost:2379'`
   * Lista de las URL de los clientes de este miembro para anunciar al público.





### parámetros relacionados con la seguridad de etcd

* `--archivo-certificado ''`
   * Ruta al archivo de certificado TLS del servidor cliente.

* `--archivo-clave ''`
   * Ruta al archivo de clave TLS del servidor cliente.

* `--archivo-crl-cliente ''`
   * Ruta al archivo de lista de revocación de certificados del cliente.

* `--archivo-ca-de confianza ''`
   * Ruta al archivo de certificado de CA de confianza TLS del servidor cliente.

* `--peer-cert-file ''`
   * Ruta al archivo de certificado TLS del servidor par.

* `--peer-key-file ''`
   * Ruta al archivo de clave TLS del servidor par.

* `--peer-trusted-ca-file ''`
   * Ruta al archivo CA de confianza TLS del servidor par.



#### Recuperación de desastres

**Crear instantánea:**

```golpecito
etcdctl --endpoints https://127.0.0.1:3379 --cert /tmp/etcd-certs/certs/127.0.0.1.pem --key /tmp/etcd-certs/certs/127.0.0.1-key.pem - -cacert /tmp/etcd-certs/certs/ca.pem instantánea guardar instantánea.db
```

**Recuperación de datos:**

```golpecito
etcdctl instantánea restaurar instantánea.db \
--nombre infra2 \
--data-dir=/tmp/etcd/infra2 \
--clúster inicial infra0=http://127.0.0.1:3380,infra1=http://127.0.0.1:4380,infra2=http://127.0.0.1:5380 \
--initial-cluster-token etcd-cluster-1 \
--URL-de-pares-de-publicidad-inicial http://127.0.0.1:5380
```





### Gestión de capacidad

**Recomendaciones de almacenamiento:**

1. No se recomienda que un solo objeto supere los 1,5 M

2. Capacidad predeterminada 2G

3. No se recomienda exceder los 8G


**Alarma y Desarmar Alarma**

> Cuando la capacidad de etcd esté llena, aparecerá una alarma. Cuando la alarma existe, etcd no puede procesar la solicitud de escritura.

Establecer umbral de almacenamiento etcd

```golpecito
etcd --quota-backend-bytes=$((16*1024*1024))
```

Bucle infinito, simulando sobrescritura de disco.

```golpecito
while [ 1 ]; hacer dd if=/dev/urandom bs=1024 count=1024 | ETCDCTL_API=3 etcdctl poner clave || break; hecho
```

Ver el estado del terminal

```golpecito
ETCDCTL_API=3 etcdctl --write-out=estado del punto final de la tabla
```

Ver alarma

```golpecito
ETCDCTL_API=3 lista de alarmas etcdctl
```

Limpiar los escombros

```golpecito
ETCDCTL_API=3 desfragmentación etcdctl
```

borrar alarma

```golpecito
ETCDCTL_API=3 desarmar alarma etcdctl
```



### Desfragmentación

Establecer compresión cada hora

```golpecito
etcd --auto-compactación-retención=1
```

compacto hasta revisión 3

```golpecito
etcdctl compacto 3
```

Desfragmentación

```golpecito
etcdctl desfragmentar
```



## Solución etcd de alta disponibilidad

> La preparación para desastres anterior del ETCD es totalmente manual y cualquier accidente requiere intervención manual. Entonces, es muy problemático.
>
> Entonces, ¿existe una forma automática de lograrlo? `operador-etcd: coreos`

`etcd-operator: coreos` es de código abierto y completa la configuración del clúster etcd basado en `kubernetes CRD`. Archivado

kubeadm se utiliza como inicialización y debe instalarse manualmente.

https://github.com/coreos/etcd-operator

Gráfico de Helm con estado completo de Etcd: Bitnami (con tecnología de vmware)

https://bitnami.com/stack/etcd/helm

https://github.com/bitnami/charts/blob/master/bitnami/etcd



### Operador Etcd

![img](http://sm.nsddd.top/sm202303051230490.png)



### Instalar el clúster de alta disponibilidad etcd basado en Bitnami

instalar el timón

https://github.com/helm/helm/releases

Instalar etcd a través del timón

```golpecito
repositorio de timón agregar bitnami https://charts.bitnami.com/bitnami

helm instalar mi-versión bitnami/etcd
```



Interactuar con el servicio a través del cliente.

```golpecito
kubectl ejecuta my-release-etcd-client --restart='Never' --image docker.io/bitnami/etcd:3.5.0-debian-10-r94 --env ROOT_PASSWORD=$(kubectl get secret --namespace default mi-lanzamiento-etcd -o jsonpath="{.data.etcd-root-password}"|base64 --decode) --env ETCDCTL_ENDPOINTS="mi-lanzamiento etcd.default.svc.cluster.local:2379" -- espacio de nombres predeterminado --comando --sleep infinity
```



## Cómo usar etcd en Kubernetes

etcd es el almacenamiento back-end de kubernetes. Para cada objeto de kubernetes, hay un almacenamiento.go correspondiente responsable de la operación de almacenamiento del objeto.

> + paquete/registry/core/pod/storage/storage.go

Especifique el clúster de servidores etcd en el script de inicio del servidor API

```golpecito
Especificaciones:
contenedores:
   - dominio:
     - kube-apiserver
     - --advertise-address=192.168.34.2
     - --enable-bootstrap-token-auth=true
     - --etcd-cafile=/etc/kubernetes/pki/etcd/ca.crt
     - --etcd-certfile=/etc/kubernetes/pki/apiserver-etcd-client.crt
     - --etcd-keyfile=/etc/kubernetes/pki/apiserver-etcd-client.key
     - --etcd-servers=https://127.0.0.1:2379
```

En los primeros días, el servidor API realizaba una verificación de ping simple en etcd para verificar si el puerto estaba abierto, pero ahora se ha cambiado a una llamada api etcd real.

> Una conexión de puerto no significa necesariamente que el servicio sea normal.





### La ruta de almacenamiento de los objetos de Kubernets en etcd.

Introduzca el módulo etcd

```golpecito
kubectl -n kube-system exec -it etcd-cadmin sh
```

Utilice etcdctl en el contenedor para realizar solicitudes.

```golpecito
ETCDCTL_API=3

alias ectl='etcdctl --puntos finales https://127.0.0.1:2379 \
--cacert /etc/kubernetes/pki/etcd/ca.crt \
--cert /etc/kubernetes/pki/etcd/server.crt \
--clave /etc/kubernetes/pki/etcd/server.key'

ectl get --prefix --solo claves /
```



### anulaciones-de-servidores-etcd

Ciertos objetos en el clúster k8s se crearán y eliminarán en grandes cantidades, como eventos. La creación de un pod puede tener docenas de eventos, lo que ejercerá una gran presión sobre etcd. Por lo tanto, apiserver proporciona el parámetro etcd-servers-overrides. Ejecute y luego master etcd. Además del servidor, se proporciona un etcd para almacenar objetos que no son tan importantes.

  ```golpecito
/usr/local/bin/kube-apiserver --etcd_servers=https://localhost:4001 --etcd-cafile=/etc/ssl/kubernetes/ca.crt--storage-backend=etcd3 --etcd-servers- anulaciones=/eventos#https://localhost:4002
  ```



### Topología de alta disponibilidad del clúster etcd apilado

Esta topología acopla el plano de control y los miembros etcd en el mismo nodo.

La ventaja es que es muy fácil de configurar y administrar copias es más sencillo. Sin embargo, el apilamiento conlleva el riesgo de que falle el acoplamiento. Si un nodo falla, tanto los miembros de etcd como las instancias del plano de control se pierden y la redundancia del clúster se ve comprometida. Este riesgo se puede mitigar agregando más nodos del plano de control. Por lo tanto, para lograr una alta disponibilidad del clúster, se deben ejecutar al menos tres nodos maestros apilados.

![img](http://sm.nsddd.top/sm202303051232586.png)



### Topología de alta disponibilidad para clúster etcd externo

Esta topología desacopla el plano de control y los miembros etcd. Si se pierde un nodo maestro, el impacto en los miembros de etcd será pequeño y no tendrá tanto impacto en la redundancia del clúster como una topología apilada. Sin embargo, esta topología requiere el doble de hosts que una topología apilada. Un clúster con esta topología requiere al menos tres hosts para los nodos del plano de control y tres hosts para el clúster etcd.

![img](http://sm.nsddd.top/sm202303051232839.png)





### Alta disponibilidad del clúster Practice-etcd

#### ¿Cuántos compañeros son los más adecuados?

*1? 3? 5?
   * Se recomiendan 3 o 5 entornos de construcción
   * 3 tienen un mayor rendimiento y la solicitud solo necesita dos nodos para confirmar antes de poder devolverse.
   * El problema con el tercer problema es que operación y mantenimiento deben manejarlo inmediatamente después de que ocurre un problema, si no se maneja a tiempo, si el segundo también falla, todo el clúster será inútil.
   * Si hay 5, se puede permitir que dos se estropeen, lo que puede dar a la operación y mantenimiento un poco más de tiempo de reserva.
   * **Se recomienda utilizar 5** en entornos de producción generales.

* Garantizar una alta disponibilidad es el objetivo principal,
* Todas las operaciones de escritura deben pasar por el líder.
* ¿Tener más pares puede mejorar la simultaneidad de las operaciones de lectura del clúster?
   * La configuración del apiserver solo se conecta al par etcd local
   * La configuración del apiserver especifica todos los pares etcd, pero solo si el miembro etcd actualmente conectado es anormal, el apiserver cambiará el objetivo.
* ¿Necesitas flexión dinámica?
   * En circunstancias normales, etcd no necesita expandir o reducir dinámicamente la capacidad, si lo planifica bien, no tendrá que moverlo.



#### Garantizar una comunicación eficiente entre apiserver y etcd

* apiserver y etcd se implementan en el mismo nodo
* La comunicación entre apiserver y etcd se basa en gRPC
   * Para cada objeto, Conexión -> compartir secuencia entre apiserver y etcd
   * Características de http2
     *Cuota de transmisión
     * ¿Problemas causados? Para clústeres a gran escala, provocará congestión en los enlaces.
     * Con 10.000 pods, los datos devueltos por una operación de lista pueden superar los 100 millones





#### planificación de almacenamiento etcd

¿Local versus remoto?

*Almacenamiento remoto
   * Se supone que la ventaja está siempre disponible, ¿es realmente así?
   * La desventaja es la eficiencia IO, ¿qué problemas puede causar?
* Mejores prácticas:
   * SSD locales
   * Utilice el volumen local para asignar espacio

¿Cuanto espacio?

*Relacionado con el tamaño del clúster
*2G predeterminado, generalmente no más de 8G.

Pensamiento: ¿Por qué el tamaño de la base de datos de cada miembro es inconsistente?



#### seguridad

Cifrado de comunicación entre pares.

* ¿Hay alguna demanda?
   *Gasto adicional de TLS
   * Mayor complejidad operativa

cifrado de datos

* ¿Hay alguna demanda?
* Kubernetes proporciona cifrado de secretos
   * https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/





**--anulaciones-de-servidores-etcd**

* Para grupos a gran escala, una gran cantidad de eventos ejercerán presión sobre etcd.
* Especifique el clúster de servidores etcd en el script de inicio del servidor API

```golpecito
/usr/local/bin/kube-apiserver --etcd_servers=https://localhost:4001 --etcd-cafile=/etc/ssl/kubernetes/ca.crt--storage-backend=etcd3 --etcd-servers- anulaciones=/eventos#https://localhost:4002
```



#### Reducir la latencia de la red

El RTT dentro del centro de datos es probablemente de unos pocos milisegundos, el RTT típico a nivel nacional es de unos 50 ms y el RTT entre dos continentes puede ser tan lento como 400 ms. Por lo tanto, se recomienda implementar los clústeres etcd en la misma región posible.

Cuando hay demasiadas conexiones simultáneas del cliente al Líder, las solicitudes de otros nodos Seguidores al Líder pueden retrasarse debido a la congestión de la red. En el nodo Seguidor, es posible que vea errores como este:

```consola
eliminó MsgProp a 247ae21ff9436b2d ya que el búfer de envío de streamMsg está lleno
```

Esto se puede evitar utilizando la herramienta de control de tráfico (Traffic Control) en el nodo para aumentar la prioridad del envío de datos entre los miembros de etcd.



#### Reducir la latencia de E/S del disco

Para la latencia del disco, la latencia de escritura típica del disco giratorio es de aproximadamente 10 milisegundos. Para las SSD (unidades de estado sólido), la latencia suele ser inferior a 1 milisegundo. La latencia del HDD (unidad de disco duro) o del disco de red será inestable cuando se lea y escriba una gran cantidad de datos. Por lo tanto, **se recomienda encarecidamente utilizar SSD**.

Al mismo tiempo, para reducir la interferencia de las operaciones de E/S de otras aplicaciones en etcd, se recomienda almacenar los datos de etcd en un disco separado. También se pueden almacenar diferentes tipos de objetos en varios clústeres etcd diferentes. Por ejemplo, los objetos de eventos que cambian con frecuencia se pueden separar del clúster etcd principal para garantizar el alto rendimiento del clúster principal. Esto se puede configurar a través de parámetros en APIServer. Lo mejor es tener un disco de almacenamiento independiente para cada uno de estos grupos de etcd.

Si es inevitable que etcd y otras empresas compartan discos de almacenamiento, entonces debe establecer una prioridad de E/S de disco más alta para el servicio etcd mediante el siguiente comando ionice para evitar el impacto de otros procesos tanto como sea posible.

```golpecito
ionice -c2 -n0 -p 'pgrep etcd'
```



#### Mantenga el tamaño del archivo de registro razonable

etcd guarda datos en forma de registros. Ya sea que se trate de creación o modificación de datos, agrega operaciones al archivo de registro, por lo que el tamaño del archivo de registro crecerá linealmente con la cantidad de modificaciones de datos.

Cuando el clúster de Kubernetes es grande, los datos del clúster etcd se cambiarán con frecuencia y el archivo de registro del clúster crecerá rápidamente.

Para reducir eficazmente el tamaño del archivo de registro, etcd creará instantáneas a intervalos regulares para guardar el estado actual del sistema y eliminar los archivos de registro antiguos. Además, cuando el número de modificaciones se acumula hasta un cierto número (el valor predeterminado es 10000, especificado por el parámetro "--snapshot-count"), etcd también creará archivos de instantáneas.

Si el uso de memoria y el uso de disco de etcd son demasiado altos, primero puede analizar si la frecuencia de escritura de datos es demasiado alta, lo que hace que la frecuencia de la instantánea sea demasiado alta. Después de la confirmación, puede reducir el uso de memoria y disco reduciendo el umbral para activar instantáneas.



#### Establecer cuotas de almacenamiento razonables

Las cuotas de espacio de almacenamiento se utilizan para controlar el tamaño del espacio de datos etcd. Cuotas de almacenamiento razonables garantizan la confiabilidad de las operaciones del clúster.

> 8G recomendado.

Si no hay una cuota de almacenamiento, es decir, etcd puede utilizar todo el espacio en disco, el rendimiento de etcd disminuirá seriamente debido al crecimiento continuo del espacio de almacenamiento, e incluso existe el riesgo de quedarse sin espacio en el disco del clúster, lo que provocará un clúster impredecible. comportamiento. Si la cuota de almacenamiento se establece demasiado pequeña, una vez que el espacio de almacenamiento de la base de datos backend de uno de los nodos excede la cuota de almacenamiento, etcd activará una alarma en todo el clúster y pondrá el clúster en modo de mantenimiento que solo acepta solicitudes de lectura y eliminación. El clúster puede reanudar las operaciones normales solo después de que se haya liberado suficiente espacio, se haya desfragmentado la base de datos backend y se hayan borrado las alarmas de cuota de almacenamiento.



#### Comprimir automáticamente versiones históricas

etcd guarda versiones históricas para cada clave. Para evitar problemas de rendimiento o imposibilidad de escribir debido al agotamiento del espacio de almacenamiento, estas versiones históricas deben comprimirse periódicamente. Comprimir versiones históricas significa descartar toda la información antes de una versión determinada de la clave, y el espacio ahorrado se puede utilizar para operaciones de escritura posteriores. etcd admite la compresión automática de versiones históricas. Especifique el parámetro **--auto-compactation** en los parámetros de inicio, cuyo valor está en horas. Es decir, etcd comprimirá automáticamente la versión histórica antes de la ventana de tiempo establecida por este valor.



#### Eliminar periódicamente la fragmentación

Comprimir versiones históricas equivale a borrar discretamente ciertos datos en el espacio de almacenamiento de etcd, y aparecerán fragmentos en el espacio de almacenamiento de etcd. Estos fragmentos no pueden ser utilizados por el almacenamiento de fondo, pero aún ocupan el espacio de almacenamiento del nodo. Por lo tanto, eliminar periódicamente la fragmentación del almacenamiento liberará espacio de almacenamiento fragmentado y reajustará todo el espacio de almacenamiento.



#### Plan de respaldo

Plan de respaldo

* copia de seguridad etcd: copia de seguridad de la información completa del clúster, recuperación ante desastres
   * guardar instantánea etcdctl
* Realizar una copia de seguridad de los eventos de Kubernetes

  ¿Frecuencia?

* El intervalo de tiempo es demasiado largo:
   * ¿Se pueden aceptar la pérdida de datos del usuario?
   * Si existen configuraciones de recursos externos, como equilibrio de carga, ¿se pueden aceptar fugas provocadas por pérdida de datos?

* El intervalo de tiempo es demasiado corto:
   * Impacto en etcd
     * Al tomar una instantánea, etcd bloqueará los datos actuales
     * Las operaciones de escritura simultáneas requieren que se abra nuevo espacio para la escritura incremental, lo que genera un crecimiento del espacio en disco.

¿Cómo garantizar la puntualidad de la copia de seguridad y evitar la explosión del disco?

* Desfragmentación automática



#### Optimizar los parámetros operativos

Cuando se corrige la latencia de la red y la latencia del disco, los parámetros operativos de etcd se pueden optimizar para mejorar la eficiencia del clúster. etcd lleva a cabo la elección de Líder según el protocolo Raft. Las operaciones de lectura y escritura de datos solo pueden comenzar después de que se selecciona el Líder. Por lo tanto, las elecciones frecuentes de Líder causarán una reducción significativa en el rendimiento de lectura y escritura de datos. Puede reducir la posibilidad de elección de líder ajustando el intervalo de latido (Heatbeat Interval) y el tiempo de espera de la elección (Election Timeout).

El ciclo de latidos controla la frecuencia con la que el líder envía notificaciones de latidos a los seguidores. Además de indicar el estado activo del líder, la notificación de latido también contiene información de datos que se escribirá. Los seguidores escriben datos en función de la información de latido. El período de latido predeterminado es de 100 ms. El tiempo de espera de la elección define cuánto tiempo le toma al seguidor reiniciar la elección si no recibe el latido del líder. La configuración predeterminada de este parámetro es 1000 ms.

Si se implementan diferentes instancias del clúster etcd en el mismo centro de datos con baja latencia, la configuración predeterminada suele ser suficiente. Si se implementan diferentes instancias en múltiples centros de datos o en un entorno de clúster con alta latencia de red, es necesario ajustar el período de latido y el tiempo de espera de las elecciones. Se recomienda que el parámetro del ciclo de latido se establezca cerca del valor máximo del ciclo de ida y vuelta de datos promedio entre múltiples miembros etcd, que generalmente es de 0,55 a 1,5 veces el RTT promedio. Si el período de latido se establece demasiado bajo, etcd enviará mucha información de latido innecesaria, lo que aumentará la carga sobre la CPU y la red. Si se fija demasiado alto, provocará frecuentes tiempos muertos en las elecciones. El tiempo de espera de las elecciones también debe establecerse en función del tiempo promedio de RTT entre los miembros de etcd. El tiempo de espera de la elección se establece en al menos 10 veces el tiempo de RTT entre miembros de etcd para evitar fluctuaciones en la red.

Los valores del intervalo de latido y el tiempo de espera de elección deben ser efectivos para todos los nodos en el mismo clúster etcd. Si las configuraciones de cada nodo son diferentes, los resultados de la negociación entre los miembros del clúster serán impredecibles e inestables.



#### almacenamiento de copia de seguridad etcd

El directorio de trabajo predeterminado de etcd generará dos subdirectorios: wal y snap. wal se utiliza para almacenar mensajes escritos previamenteLa función más importante del registro es registrar todo el proceso de cambios de datos. Todas las modificaciones de datos deben escribirse a wal antes de enviarlas.

snap se utiliza para almacenar datos de instantáneas. Para evitar demasiados archivos wal, etcd creará instantáneas periódicamente (cuando los datos en wal excedan los 10,000 registros, establecidos por el parámetro "--snapshot-count"). Cuando se genera la instantánea, los datos en WAL se pueden eliminar.

Si los datos están dañados o modificados incorrectamente y es necesario revertirlos a un estado anterior, existen dos métodos:

* Primero, el interesado se restaura a partir de la instantánea, pero los datos que no se incluyen en la instantánea se perderán;
* El segundo es realizar todas las operaciones de modificación registradas en el WAL y restaurar los datos originales al estado antes de que se dañaran, pero el tiempo de recuperación es más largo.



#### Práctica de solución de respaldo

El método de copia de seguridad recomendado oficialmente para el clúster etcd es crear instantáneas con regularidad. A diferencia del propósito de crear instantáneas periódicamente dentro de etcd, este método de copia de seguridad se basa en programas externos para crear instantáneas periódicamente y cargarlas en dispositivos de almacenamiento de red para lograr una copia de seguridad redundante de los datos de etcd. Los datos cargados en dispositivos de red deben estar cifrados. Esto permite que el clúster etcd se recupere en cualquier lugar desde un buen momento conocido, incluso cuando todas las instancias de etcd hayan perdido datos. Según los requisitos del clúster para la granularidad de la copia de seguridad etcd, el ciclo de copia de seguridad se puede ajustar adecuadamente. Según mediciones reales en un entorno de producción, la toma de instantáneas generalmente afecta el rendimiento del clúster en ese momento, por lo que no se recomienda crear instantáneas con frecuencia. Pero si el ciclo de copia de seguridad es demasiado largo, puede provocar la pérdida de una gran cantidad de datos.

Aquí puede utilizar el método de **copia de seguridad incremental**. El programa de respaldo genera una instantánea cada 30 minutos. Luego comienza desde la versión (Revisión) donde termina la instantánea, escucha los eventos del clúster etcd, guarda los eventos en un archivo cada 10 segundos y carga la instantánea y los archivos de eventos al dispositivo de almacenamiento de red. Un ciclo de instantáneas de 30 minutos tiene poco impacto en el rendimiento del clúster. Cuando ocurre una catástrofe, se perderán como máximo 10 segundos de datos. En cuanto a la restauración de datos, primero se descargan los datos del dispositivo de almacenamiento de red, luego se restauran grandes cantidades de datos a partir de la instantánea y todos los eventos almacenados se aplican secuencialmente sobre esta base. De esta manera, los datos del clúster se pueden restaurar al momento anterior a que ocurriera el desastre.



#### Versión de recurso

versión de recurso de un solo objeto

* La última versión del recurso modificada del objeto.

versión de recurso del objeto Lista

* ResourceVersion al generar respuesta de lista

Comportamiento de lista

* Cuando se utiliza el objeto Lista, si no se agrega ResourceVersion, significa que se requieren los datos más recientes y la solicitud penetrará en la caché del APIServer y se enviará directamente a etcd.

* Cuando APIServer filtra consultas de objetos a través de Etiqueta, la acción de filtrado está en el lado de APIServer y APIServer necesita iniciar una solicitud de consulta completa a etcd.