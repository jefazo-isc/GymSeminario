# Lineamientos para la Exposición del Avance de Proyecto de Tesina del 03 de Noviembre

## Contenido de Exposición

*   **Muestra física de avance del proyecto**
    *   Hacer énfasis en los avances con respecto al desarrollo adicional al MVP presentado.
*   **Presentación del Mapeo de historias de usuario**
    *   Desarrollo con respecto a los sprints definidos a partir del mapeo de las historias de usuario.
*   **Descripción de:**
    *   **Servicios Web empleados**
        *   Justificando herramientas empleadas (APIs, Lenguaje del lado del servidor, Librerías, Frameworks, Lenguajes del lado del front).
    *   **Estructura de las Bases de Datos Empleadas**
        *   Tablas, Colecciones, Espacios de Claves/Almacenes, Buckets, Grafos (Nodos), según corresponda.
        *   Justificar la selección del Manejador de la Base de Datos y el modelo seleccionado si se trata de NoSQL.
    *   **Desarrollo de aplicación móvil** con explicación de módulos en los que se organiza el proyecto considerando:
        *   Punto de entrada (App Module), Módulos de librerías, Interfaz de Usuario, Lógica de Negocio y Dominio, Capa de Datos.
    *   **Opciones de seguridad implementadas en el proyecto**
        *   **Explicando las razones de uso en aplicación Web:**
            *   *Defensa perimetral:* WAF (Web Application Firewall), Mitigación de DDoS, Cifrado y HTTPS, DNSSEC.
            *   *Autenticación, Sesiones y Control de Acceso:* Autenticación Multifactor (MFA), Proveedores de Identidad (IdP/SSO), Principio de mínimo privilegio, Gestión segura de sesiones.
            *   *Seguridad en el Desarrollo:* Validación de datos en el backend, SAST (Static Application Security Testing), DAST (Dynamic Application Security Testing), Pruebas de penetración (Pen-testing), Revisión del OWASP Top 10.
            *   *Monitoreo y Tiempo de Ejecución:* RASP (Runtime Application Self-Protection), Gestión de vulnerabilidades y parches, Plan de respuesta a incidentes.
        *   **Explicando las razones de uso en aplicación Móvil:**
            *   *Autenticación y control de acceso:* Autenticación multifactor, Biometría, Gestión de sesiones.
            *   *Cifrado y gestión de datos:* Cifrado en tránsito, cifrado en reposo, minimización de datos.
            *   *Seguridad en el código y en el desarrollo:* Security by Design, Validación de entradas, Obfuscation & RASP, Pruebas y análisis continuo (SAST, DAST, Análisis de comportamiento de software - SCA).
            *   *Cumplimiento normativo:* Ley de protección de datos, Procesamiento de pagos con tarjeta, etc.
*   **Avance del Pipeline del Proyecto** con demostración de funcionalidad en GitHub Actions.
*   **Documento de Exposición**
    *   Presentación en diapositivas.
    *   Documentación explicativa.

---

# RÚBRICA PARA PRESENTACIÓN DE AVANCE DEL DESARROLLO DE PROYECTO 03 de Noviembre

| Criterio | Muy bien (9-10) | Bien (8-9) | Regular (7-8) | Mal (2-7) | No entrega (0) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Avances en el proyecto con respecto al MVP (20%)** | Se presentan los sprints posteriores a la entrega del MVP con un avance significativo con respecto al mapeo de las historias de usuario definido. | Se presentan los sprints posteriores a la entrega del MVP pero el avance resulta significativo pero sin apego al mapeo de las historias de usuario definido. | Se presentan avances poco significativos posteriores a la entrega del MVP con respecto a los definidos a partir de mapeo de las historias de usuario. | Se presentan avances poco significativos posteriores a la entrega del MVP sin apego al mapeo de las historias de usuario definido y sin respetar los sprints correspondientes. | No se entrega avances posteriores a la entrega. |
| **Pipeline del proyecto en GitHub Actions (15%)** | Se tiene uno o varios archivos YAML definidos en Github Actions que entregan resultados positivos tras su corrida al lanzar los eventos definidos para ello. | Se tiene uno o varios archivos YAML definidos en Github Actions que entregan resultados parcialmente positivos tras su corrida al lanzar los eventos definidos para ello. | Se tiene uno o varios archivos YAML definidos en Github Actions que entregan resultados parcialmente tras su corrida al lanzar los eventos definidos para ello. | Se tiene uno o varios archivos YAML definidos en Github Actions que no entregan resultados / Sin valor. | No se cuenta con desarrollo en el pipeline. |
| **Servicios Web Empleados (10%)** | Se demuestra con claridad el uso de servicios web empleados en el proyecto, así como una justificación de todos los recursos empleados para su implementación. | Se demuestra con claridad el uso de servicios web empleados en el proyecto, pero la justificación de los recursos empleados para su implementación, no es del todo clara. | Se demuestra con poca claridad el uso de servicios web empleados en el proyecto, pero se justifica adecuadamente los recursos empleados para su implementación. | Se demuestra con poca claridad el uso de servicios web empleados en el proyecto y además no se justifica adecuadamente los recursos empleados para su implementación. | No se presentan servicios web en el proyecto. |
| **Estructura de las bases de datos empleadas (10%)** | Se muestra el aspecto integral de los datos del proyecto en el manejador de bases de datos seleccionado y se justifica con claridad la relación de su uso. | Se muestra parcialmente la organización de los datos del proyecto en el manejador de bases de datos seleccionado y se justifica con claridad la consideración para su empleo. | Se muestra el aspecto integral de la organización de los datos del proyecto en el manejador de bases de datos seleccionado y se justifica con poca claridad la relación de su uso. | Se muestra parcialmente la organización de los datos del proyecto en el manejador de bases de datos seleccionado y se justifica con poca claridad la consideración para su empleo. | No hay uso de bases de datos en el proyecto. |
| **Módulos de la aplicación móvil (10%)** | Se presenta la modularidad de la aplicación móvil del proyecto y se presentan explícitamente cada uno de los módulos principales que sustentan el proyecto. | Se presenta la modularidad de la aplicación móvil del proyecto pero no se presentan explícitamente cada uno de los módulos principales que sustentan el proyecto. | No se presenta la modularidad completa de la aplicación móvil del proyecto, pero lo que se presenta esta bien explicado y definido. | No se presenta la modularidad completa de la aplicación móvil del proyecto, pero no se presentan explícitamente cada uno de los módulos principales que sustentan el proyecto. | No hay desarrollo de aplicación móvil. |
| **Opciones de seguridad implementadas en el proyecto (10%)** | Se cuentan con diversas opciones que soportan la seguridad del proyecto y se explica adecuadamente su implementación en el proyecto. | Se cuentan con diversas opciones que soportan la seguridad del proyecto pero no se explica adecuadamente su implementación en el proyecto. | Se cuentan con pocas opciones que soportan la seguridad del proyecto y se explica adecuadamente su implementación en el proyecto. | Se cuentan con pocas opciones que soportan la seguridad del proyecto y no se explica adecuadamente su implementación en el proyecto. | No se presentan esquemas de seguridad. |
| **Claridad en la presentación y respuestas (15%)** | *(Sin descripción explícita en el documento original)* | *(Sin descripción explícita en el documento original)* | *(Sin descripción explícita en el documento original)* | *(Sin descripción explícita en el documento original)* | *(Sin descripción explícita en el documento original)* |
| **Documentación (10%)** | El documento entregado es acorde a lo expuesto en la presentación. | El documento entregado es parcialmente acorde a lo expuesto en la presentación. | Sin valor. | No existe relación entre el documento entregado y lo expuesto durante la presentación. | No se entrega el documento solicitado. |