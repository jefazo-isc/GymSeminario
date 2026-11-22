# Guión Ejecutivo y Técnico de Sustentación — espacioGYM (GROM 21)
**Seminario de Sistemas Computacionales II (9° B)**  
**Centro de Ciencias Básicas — Departamento de Sistemas de Información**  
**Universidad Autónoma de Aguascalientes**

* **Proyecto:** *Plataforma Web con Inteligencia Artificial para la Gestión de un Gimnasio: Scrum y DevOps*
* **Tutor:** M. en C. Arturo Elías Ramírez
* **Equipo de Desarrollo:**
  1. Jose Alberto Vazquez Guerrero (DevOps & Persistencia)
  2. Luis Antonio García Gómez (Frontend PWA & UX)
  3. Yahir Guevara Cardona (Lead Developer & Pipeline CI/CD)
  4. Martin Alfonso Romo Martínez (QA & Pruebas Unitarias Karma)
  5. Ricardo Padilla Hernández (Scrum Master & Backlog)
  6. Jesús Eduardo Tapia Avalos (Product Owner & Gobernanza)

---

## ⏱️ Estructura de Tiempo de Exposición (10 a 12 Minutos)

| Bloque | Tema | Tiempo Sugerido | Enfoque Principal |
| :---: | :--- | :---: | :--- |
| **1** | Portada, Introducción y Problemática | 1.5 min | Fugas financieras (25%), deserción (35%) y articulación Meso-Micro |
| **2** | Metodología Ágil (Scrum) y Gobernanza | 2.0 min | 8 Sprints de 2 semanas, MoSCoW y compuertas Definition of Done (DoD) |
| **3** | Pipeline DevOps (GitHub Actions) | 2.0 min | 5 Jobs en verde, 156 specs Karma, TruffleHog y despliegue continuo |
| **4** | Arquitectura Micro: PWA, SQLite WAL e IA | 2.5 min | Angular 19, persistencia SQLite en modo WAL y motor dual Gemini |
| **5** | Análisis de Resultados y Evidencias | 2.5 min | Latencia de 118 ms, Docker 198 MB, SonarQube Pass y Dashboard real |
| **6** | Conclusiones y Preguntas del Jurado | 1.5 min | Cumplimiento DoD 4.7.2, trabajo futuro y cierre |

---

## 🎤 Guión Detallado Paso a Paso (Qué Decir en Cada Diapositiva / Sección)

### Bloque 1: Apertura e Introducción (1.5 min)
> *"Buenos días, profesor Arturo Elías y compañeros. A nombre del equipo integrado por Alberto Vazquez, Luis García, Yahir Guevara, Martin Romo, Ricardo Padilla y Jesús Tapia, presentamos nuestro proyecto de tesina titulado: **'Plataforma Web con Inteligencia Artificial para la Gestión de un Gimnasio: Scrum y DevOps'**, desarrollado para el gimnasio **espacioGYM (GROM 21)**.*
> 
> *El problema central que diagnosticamos en los gimnasios independientes radica en dos factores críticos:*
> 1. *Fugas de ingresos de hasta un 25% por cobros extemporáneos y suplantación en accesos.*
> 2. *Deserción temprana del 35% de socios por falta de seguimiento y rutinas personalizadas.*
> 
> *Nuestra solución articula los 3 niveles metodológicos del seminario:*
> - *Nivel Macro: El contexto de la industria y la necesidad de modernización tecnológica.*
> - *Nivel Meso: La metodología Scrum en 8 Sprints articulada con compuertas de calidad DevOps.*
> - *Nivel Micro: La implementación técnica real en Angular 19, persistencia SQLite WAL y automatización con GitHub Actions."*

---

### Bloque 2: Metodología Scrum y Gobernanza Meso (2.0 min)
> *"En el Nivel Meso, no usamos un Scrum tradicional aislado del código, sino un **framework híbrido articulado con DevOps**.*
> *El desarrollo se planificó en **8 Sprints de 2 semanas**, divididos estratégicamente:*
> - *Sprints 1 y 2: Arquitectura base, autenticación JWT y estructura PWA.*
> - *Sprints 3 y 4: Módulo de socios, control de pagos y catálogo de membresías.*
> - *Sprints 5 y 6: Terminal de check-in con código QR dinámico y persistencia SQLite WAL.*
> - *Sprints 7 y 8: Integración de IA con Gemini API, pipeline CI/CD y despliegue a producción.*
> 
> *Lo más importante del Nivel Meso es la **Definition of Done (DoD)**: Ninguna historia de usuario se consideró 'Terminada' sin haber aprobado el 100% de las pruebas automatizadas en el pipeline de GitHub Actions antes de la revisión con el Product Owner."*

---

### Bloque 3: Pipeline DevOps y Automatización Micro (2.0 min)
> *"En el Nivel Micro, el archivo `.github/workflows/ci.yml` automatiza 5 trabajos obligatorios ante cada commit en la rama main:*
> 1. *Job 1 (Build & Lint): Compilación AOT de Angular 19 y Node 22.*
> 2. *Job 2 (Unit Tests): Ejecución en Chrome Headless de 156 especificaciones unitarias con Karma y Jasmine, logrando un 84.3% de cobertura.*
> 3. *Job 3 (Integration Tests): Pruebas de integración de servicios y adaptadores HTTP.*
> 4. *Job 4 (Security Gate): Escaneo de secretos con TruffleHog y auditoría de vulnerabilidades en dependencias (npm audit).*
> 5. *Job 5 (Docker & Deploy): Creación de imágenes contenerizadas hacia GitHub Packages y despliegue continuo en Render PaaS y GitHub Pages en menos de 4 minutos."*

---

### Bloque 4: Persistencia SQLite WAL e Inteligencia Artificial (2.5 min)
> *"Para resolver el mito de que SQLite no sirve para aplicaciones comerciales web, implementamos **SQLite 3 en modo WAL (Write-Ahead Logging)**:*
> - *Configuramos `PRAGMA journal_mode = WAL;`, `PRAGMA synchronous = NORMAL;` y `PRAGMA busy_timeout = 5000;`.*
> - *Esto permite lecturas simultáneas no bloqueantes mientras ocurren escrituras, soportando más de 100 transacciones concurrentes por minuto con una **latencia media de 118 ms**.*
> - *Beneficio clave: Coste de hosting cero y cero administración de servidores de base de datos.*
> 
> *En cuanto a la IA, implementamos una **arquitectura resiliente de doble motor**:*
> - *Motor Primario: Google Gemini API para generación dinámica de rutinas personalizadas.*
> - *Motor de Respaldo: Motor heurístico local que garantiza servicio ininterrumpido en menos de 0.2 segundos si falla la conexión a internet externa."*

---

### Bloque 5: Resultados Cuantitativos y Evidencias en Producción (2.5 min)
> *(Apoyarse en el cartel o diapositiva de Resultados)*
> *"En la sección de resultados empíricos, destacamos 4 métricas cuantitativas clave:*
> 1. *100% Pass Rate en CI/CD a lo largo de los 8 Sprints.*
> 2. *84.3% de Cobertura en pruebas unitarias (156 Karma specs).*
> 3. *118 ms de latencia p95 en peticiones concurrentes.*
> 4. *198 MB en la imagen final de Docker gracias a compilación multi-etapa.*
> 
> *En pantalla mostramos dos módulos en producción:*
> - *El Dashboard de Analítica: Que grafica las sesiones por horario y calcula la afluencia en tiempo real.*
> - *La Terminal QR: Que valida accesos en menos de 0.5 segundos mediante criptografía dinámica, impidiendo el uso de capturas de pantalla compartidas entre usuarios."*

---

### Bloque 6: Conclusiones y Cierre (1.5 min)
> *"En conclusión:*
> 1. *La articulación Meso-Micro garantizó un software libre de regresiones gracias a la integración entre Scrum y DevOps.*
> 2. *Se demostró la viabilidad técnica de SQLite WAL para aplicaciones comerciales ligeras.*
> 3. *El proyecto cumple al 100% con la Definition of Done y los lineamientos del Apartado 4.7.2 de la tesina.*
> 
> *Agradecemos a nuestro tutor el M. en C. Arturo Elías Ramírez y quedamos abiertos a sus preguntas."*

---

## 🛡️ Preguntas Frecuentes del Jurado / Profesor y Cómo Responderlas

### P1: ¿Por qué usaron SQLite y no MySQL o PostgreSQL?
* **Respuesta clave:**  
  *"Para el modelo de negocio de un gimnasio independiente (gimnasio mediano de hasta 1,000 socios activos), un clúster MySQL/PostgreSQL añade costos fijos de servidor ($15-$30 USD/mes) y complejidad de mantenimiento. SQLite con modo WAL resuelve el problema con latencias de 118 ms y transacciones ACID sin bloqueos. Además, documentamos como Trabajo Futuro la migración a PostgreSQL si el gimnasio se expande a una cadena multi-sucursal."*

### P2: ¿Cómo se conectan los niveles Meso y Micro en el proyecto?
* **Respuesta clave:**  
  *"El Nivel Meso define las reglas del proceso (los 8 Sprints y la compuerta de calidad DoD). El Nivel Micro es el ejecutor técnico (el archivo `.github/workflows/ci.yml`, las 156 pruebas Karma y la configuración PRAGMA de SQLite). Si el Nivel Micro no aprueba el Quality Gate de SonarQube o las pruebas bajan de 80%, el Nivel Meso bloquea el paso del incremento hacia producción."*

### P3: ¿Qué pasa si se cae el servicio de Google Gemini?
* **Respuesta clave:**  
  *"Implementamos el patrón Circuit Breaker con contingencia heurística local. Si la API de Gemini no responde en menos de 3 segundos, el backend conmuta instantáneamente al motor de reglas local y entrega la rutina en 0.2 segundos sin interrumpir la experiencia del socio."*

### P4: ¿Cómo evitaron que los usuarios compartan capturas del código QR?
* **Respuesta clave:**  
  *"El código QR no es estático; se genera dinámicamente con un token firmado con JWT que incluye una marca de tiempo con vigencia de 30 segundos y un hash de un solo uso. Si intentan ingresar con una captura tomada minutos antes, la terminal rechaza el acceso automáticamente."*
