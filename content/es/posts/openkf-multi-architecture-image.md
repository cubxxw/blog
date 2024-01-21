---
título: 'Diseño de estrategia de construcción de imagen multiarquitectura Openkf'
fecha : 2023-09-16T14:15:15+08:00
borrador: falso
etiquetas:
   - Blog
---

## Cree automáticamente imágenes de múltiples arquitecturas de `openkf` y envíelas a múltiples almacenes de imágenes

+ https://github.com/openimsdk/openkf

**describir:**

Para satisfacer las necesidades de varios usuarios, nuestro objetivo es crear automáticamente imágenes Docker "openkf" para varias arquitecturas y enviarlas sin problemas a múltiples repositorios de imágenes.

**Objetivo:**

- Cree automáticamente imágenes Docker de las arquitecturas `linux/amd64` y `linux/arm64` de `openkf`.
- Envíe la imagen a Docker Hub, Alibaba Cloud Docker Hub y al almacén de contenedores de GitHub.

**Tarea:**

1. **Configurar un sistema de compilación de múltiples arquitecturas**
    - Utilice GitHub Actions, coopere con QEMU y Docker Buildx y admita compilaciones de múltiples arquitecturas de `linux/amd64` y `linux/arm64`.
    - Activa el proceso de compilación cada vez que se lanza una nueva versión, se envía a la rama "principal" o en un evento regular.
2. **Admite múltiples almacenes de imágenes**
    - Docker Hub: empuje a `openim/openkf-server`.
    - Alibaba Cloud Docker Hub: envíelo a `registry.cn-hangzhou.aliyuncs.com/openimsdk/openkf-server`.
    - Repositorio de contenedores de GitHub: envíelo a `ghcr.io/openimsdk/openkf-server`.
3. **Marca de espejo dinámico**
    - Utilice acciones de metadatos de Docker para generar etiquetas dinámicas basadas en eventos como activadores periódicos, confirmaciones de rama, solicitudes de extracción, versiones semánticas y SHA de confirmación.
    - Asegúrese de que las imágenes creadas no se incluyan en eventos de solicitud de extracción.
4. **Autenticación y Seguridad**
    - Utilice secretos para configurar la autenticación para los repositorios de contenedores Docker Hub, Alibaba Cloud y GitHub.
    - Garantizar que las operaciones push para cada almacén sean seguras y fluidas.
5. **Notificaciones y registros**
    - Enviar notificaciones al equipo de desarrollo si falla alguna compilación o envío a través de GitHub Actions.
    - Mantenga registros de cada operación de compilación y envío para fines de seguimiento.

**Criterios de aceptación:**

- Las imágenes `openkf` deberían compilarse correctamente para las arquitecturas `linux/amd64` y `linux/arm64`.
- Después de una compilación exitosa, la imagen debería estar disponible en Docker Hub, Alibaba Cloud Docker Hub y GitHub Container Repository.
- Las imágenes están etiquetadas correctamente según eventos y propiedades definidos.
- No se requiere intervención manual durante todo el proceso.

**Información adicional:**

- Los procesos automatizados se definen en los flujos de trabajo de GitHub Actions. Asegúrese de revisar y actualizar los flujos de trabajo según sea necesario.
- Asegúrese de probar este proceso en una rama o entorno independiente para evitar interrupciones.