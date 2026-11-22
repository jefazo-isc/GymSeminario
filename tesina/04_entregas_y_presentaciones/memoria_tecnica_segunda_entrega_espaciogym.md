# UNIVERSIDAD AUTÓNOMA DE AGUASCALIENTES
### CENTRO DE CIENCIAS BÁSICAS
### DEPARTAMENTO DE SISTEMAS COMPUTACIONALES

---

# MEMORIA TÉCNICA Y DOCUMENTO EXPLICATIVO
## SEGUNDA ENTREGA DE AVANCE DE PROYECTO DE TESINA
### PROYECTO: *espacioGYM (GROM 21) — Plataforma Integral de Gestión y Acondicionamiento Físico Asistida por Inteligencia Artificial*

* **Asignatura:** Seminario de Sistemas Computacionales I (8° Semestre)  
* **Profesor Titular:** Dr. / M. en C. Arturo Elías Ramírez  
* **Alumno:** Yahir Guevara Cardona  
* **Fecha:** Noviembre de 2026  
* **Repositorio de Código:** [https://github.com/jefazo-isc/GymSeminario](https://github.com/jefazo-isc/GymSeminario)  
* **Entorno de Producción Web (PWA):** [https://jefazo-isc.github.io/GymSeminario](https://jefazo-isc.github.io/GymSeminario)  
* **Servicios Backend Cloud:** [https://gymseminario.onrender.com](https://gymseminario.onrender.com)  

---

## ÍNDICE GENERAL

1. [Resumen Ejecutivo e Introducción](#1-resumen-ejecutivo-e-introducción)
2. [Avances en el Proyecto con Respecto al MVP (20%)](#2-avances-en-el-proyecto-con-respecto-al-mvp-20)
   - 2.1. Mapeo de Historias de Usuario y Trazabilidad Jira
   - 2.2. Comparativa Funcional: MVP vs Incremento Actual
   - 2.3. Nuevos Módulos Implementados en Sprints 2 y 3
3. [Pipeline CI/CD en GitHub Actions (15%)](#3-pipeline-cicd-en-github-actions-15)
   - 3.1. Arquitectura y Etapas del Flujo de Trabajo
   - 3.2. Verificación Estática, Compilación y Linting
   - 3.3. Batería de Pruebas Unitarias (Karma + Jasmine)
   - 3.4. Pruebas de Integración con HttpClientTestingModule
   - 3.5. Auditoría de Seguridad, SAST y Escaneo de Secretos (TruffleHog)
   - 3.6. Empaquetado OCI / Docker y Despliegue Continuo Multi-Entorno
4. [Arquitectura y Justificación de Servicios Web (10%)](#4-arquitectura-y-justificación-de-servicios-web-10)
   - 4.1. Microservicios Backend en Node.js 22 LTS y Express
   - 4.2. Mailing Transaccional: Migración de SMTP a Brevo HTTPS REST API
   - 4.3. Coach Virtual IA: Patrón Dual Fallback (Mercury + Gemini) con Circuit Breaker
   - 4.4. Catálogo de Endpoints REST
5. [Estructura y Modelado de Bases de Datos (10%)](#5-estructura-y-modelado-de-bases-de-datos-10)
   - 5.1. Paradigma de Persistencia Híbrida / Políglota
   - 5.2. Cloud Firestore (NoSQL Document Store)
   - 5.3. SQLite Relacional (SQL Transaccional ACID)
   - 5.4. Almacenamiento Local del Cliente PWA (LocalStorage / Offline Cache)
6. [Modularidad y Arquitectura de la Aplicación Móvil PWA (10%)](#6-modularidad-y-arquitectura-de-la-aplicación-móvil-pwa-10)
   - 6.1. Organización Arquitectónica en Angular 19
   - 6.2. Punto de Entrada (App Module / app.config)
   - 6.3. Capa de Dominio y Lógica de Negocio
   - 6.4. Capa de Datos (Data Layer e Interceptores)
   - 6.5. Capa de Presentación (UI) y Módulos de Librerías
   - 6.6. Capacidades PWA y Soporte Offline
7. [Opciones y Estrategia de Seguridad Implementadas (10%)](#7-opciones-y-estrategia-de-seguridad-implementadas-10)
   - 7.1. Seguridad en la Aplicación Web y Servidor Backend
   - 7.2. Seguridad en la Aplicación Móvil PWA
   - 7.3. Protección de Credenciales y Principio de Mínimo Privilegio
8. [Resultados Obtenidos y Evidencias de Operación](#8-resultados-obtenidos-y-evidencias-de-operación)
9. [Conclusiones y Trabajo Futuro (Tercera Entrega)](#9-conclusiones-y-trabajo-futuro-tercera-entrega)

---

## 1. Resumen Ejecutivo e Introducción

El proyecto **espacioGYM (GROM 21)** consiste en una solución de software integral, distribuida y modular, concebida para modernizar la gestión operativa, comercial y de entrenamiento de gimnasios y centros deportivos independientes en la región de Aguascalientes. 

Tradicionalmente, este tipo de establecimientos opera con controles manuales en papel o esquemas fragmentados que provocan descontrol de aforos, filtración de accesos sin membresía vigente, deficiencias en la comunicación de avisos y nulo seguimiento al progreso de acondicionamiento físico de los usuarios.

En esta **Segunda Entrega de Avance de Tesina**, se presenta una evolución sustancial con respecto al Producto Mínimo Viable (MVP). El sistema ha superado la etapa de maquetación y lectura estática, convirtiéndose en una plataforma viva respaldada por:
1. Un pipeline de integración y entrega continua (CI/CD) completamente automatizado en **GitHub Actions**, con 156 pruebas unitarias y de integración que garantizan la calidad del software.
2. Un backend en **Node.js 22 LTS y Express**, desplegado en la nube con Render.
3. Integraciones de servicios en la nube de alta disponibilidad: **Brevo HTTPS REST API** para mensajería transaccional y un orquestador inteligente de **Modelos de Lenguaje Grande (LLMs: Inception Mercury y Google Gemini)** con mecanismo de *Circuit Breaker*.
4. Una arquitectura de datos híbrida que conjuga **Cloud Firestore (NoSQL)** y **SQLite Relacional**.
5. Una aplicación móvil basada en estándares **PWA (Progressive Web App)** desarrollada en **Angular 19**.

---

## 2. Avances en el Proyecto con Respecto al MVP (20%)

### 2.1. Mapeo de Historias de Usuario y Trazabilidad Jira

El desarrollo se gestionó mediante el marco de trabajo ágil **Scrum**, sincronizado con el tablero de Jira (`espacioGYM / SCRUM`). A continuación se resume la correspondencia entre los sprints planificados y las historias de usuario efectivamente implementadas en el código fuente:

```
+---------------+--------------------------------------------+-----------+---------------+
| Clave Jira    | Historia de Usuario                        | Prioridad | Estado Real   |
+---------------+--------------------------------------------+-----------+---------------+
| SCRUM-16..22  | Sprint 1: Sitio Público, Ubicación y Auth  | Media     | Terminada     |
| SCRUM-40      | Sprint 1: SSO Google Firebase              | Baja      | Terminada     |
| SCRUM-24..26  | Sprint 2: Registro y Vigencia de Membresía | Alta      | Terminada     |
| SCRUM-27..29  | Sprint 2: Registro y Estado de Pagos       | Alta      | Terminada     |
| SCRUM-31      | Sprint 3: Agendamiento de Sesiones (Clases)| Media     | Terminada     |
| SCRUM-32      | Sprint 3: Cancelación de Reservas          | Baja      | Terminada     |
| SCRUM-33      | Sprint 3: Historial y Pase QR Dinámico     | Media     | Terminada     |
| SCRUM-34..36  | Sprint 3: Coach Virtual IA (Gemini/Mercury)| Media     | Terminada     |
| SCRUM-41..43  | Sprint 3: Métricas de Asistencia y Aforo   | Media     | Terminada     |
| SCRUM-23, 39  | Backlog: Gestión y Alertas Transaccionales | Alta      | En curso      |
+---------------+--------------------------------------------+-----------+---------------+
```

### 2.2. Comparativa Funcional: MVP vs Incremento Actual

| Área Funcional | Entrega Anterior (MVP) | Segunda Entrega (Avance Actual) |
| :--- | :--- | :--- |
| **Experiencia de Usuario** | Sitio web estático de presentación informativa. | Aplicación PWA interactiva instalable, reactiva y con soporte offline. |
| **Acceso y Autenticación** | Formulario local simulado en memoria. | Autenticación robusta con **JWT (JSON Web Tokens)** + Google OAuth federado. |
| **Gestión de Membresías** | Visualización estática de tarifas. | Consulta de vigencia en tiempo real y registro de pagos con corte automático. |
| **Agendamiento de Clases** | Inexistente (registro en mostrador). | **Módulo interactivo `/f2`** con selección de turnos, cupos, QR de acceso y correo. |
| **Notificaciones** | Inexistente. | **Despacho transaccional en tiempo real** mediante la API HTTPS de Brevo. |
| **Entrenamiento Asistido** | Catálogo estático de ejercicios en JSON. | **Coach Virtual IA** con prompts contextualizados y arquitectura de doble proveedor. |
| **Calidad de Software** | Build manual local sin pruebas. | **Pipeline CI/CD automatizado** con 7 fases, 156 pruebas y escáneres de seguridad. |

### 2.3. Nuevos Módulos Implementados en Sprints 2 y 3

1. **Módulo de Agendamiento y Control de Aforo (`/f2`):** Permite a los socios reservar espacios en disciplinas de alta demanda (Yoga, Crossfit, Funcional, Spinning) seleccionando fecha y turno (Matutino, Vespertino, Nocturno).
2. **Generador Dinámico de Pase de Acceso (Código QR):** Una vez confirmada la sesión, el frontend compila una cadena criptográfica de validación (`ID-TIMESTAMP-HASH`) y genera un código QR vectorial mediante `qrcode.js` para su posterior escaneo en torniquetes.
3. **Módulo de Coach Virtual IA:** Interfaz de asesoramiento técnico en acondicionamiento físico. El usuario define sus metas físicas, nivel de experiencia y lesiones previas; el sistema consulta a los LLMs para construir una rutina periodizada con series, repeticiones y tiempos de descanso recomendados.
4. **Dashboard de Analítica y Métricas:** Panel gerencial que calcula el porcentaje de ocupación por franjas horarias y el índice de retención de membresías.

---

## 3. Pipeline CI/CD en GitHub Actions (15%)

El repositorio cuenta con una configuración declarativa de Integración y Entrega Continua alojada en `.github/workflows/ci.yml`. Este pipeline se dispara automáticamente ante eventos de tipo `push` o `pull_request` sobre la rama principal (`main`).

```
                              ARQUITECTURA DEL PIPELINE CI/CD
  ┌────────────────────────────────────────────────────────────────────────────────────────┐
  │ 1. Build & Lint (Angular AOT + ESLint)                                                 │
  └───────────┬────────────────────────────────────────────────────────────────────────────┘
              │
              ├──► 2. Pruebas Unitarias (156 Jasmine Specs en ChromeHeadless + LCOV Coverage)
              │
              ├──► 3. Pruebas de Integración (HttpClientTestingModule en 5 Servicios Críticos)
              │
              └──► 4. Análisis de Vulnerabilidades (npm audit + TruffleHog Secret Scanner)
              │
  ┌───────────┴────────────────────────────────────────────────────────────────────────────┐
  │ 5. Empaquetado OCI Container Docker (Multi-Stage Build en Node.js 22 Alpine)          │
  └───────────┬────────────────────────────────────────────────────────────────────────────┘
              │
              ├──► 6. Despliegue Continuo Frontend (GitHub Pages gh-pages)
              │
              └──► 7. Despliegue Continuo Backend (Webhook Trigger hacia Render PaaS)
```

### 3.1. Fase 1: Build y Verificación Estática (ESLint)
* Instala el árbol de dependencias mediante `npm ci` con caché determinista.
* Compila la aplicación Angular en modo estricto de producción (`ng build --configuration=production`).
* Ejecuta el linter estático de código mediante `@angular-eslint` validando buenas prácticas de TypeScript y la inexistencia de llamadas asíncronas no manejadas en plantillas (`@angular-eslint/template/no-negated-async`).

### 3.2. Fase 2: Pruebas Unitarias (Karma + Jasmine)
* Ejecución automatizada sobre un entorno contenedorizado de **Google Chrome en modo Headless** (`ChromeHeadless --no-sandbox`).
* Se ejecutan **156 especificaciones unitarias** que cubren componentes, pipes y servicios de la aplicación.
* Se genera reporte de cobertura en formato LCOV e HTML, verificando que la cobertura de líneas y sentencias supere el umbral del 65%.

### 3.3. Fase 3: Pruebas de Integración (HttpClientTesting)
* Aísla las capas de red externas para garantizar pruebas herméticas, reproducibles e independientes de la conexión a internet.
* Utiliza `HttpClientTestingModule` y `HttpTestingController` para verificar que:
  - `EjercicioService` maneja adecuadamente las respuestas de catálogo y propaga códigos HTTP 4xx/5xx sin loops infinitos de reintentos.
  - `RutinaService`, `ApiService`, `QrService` y `UsuarioService` envían los encabezados esperados y procesan correctamente los payloads JSON devueltos por el backend.

### 3.4. Fase 4: Auditoría de Seguridad y Escaneo de Secretos (TruffleHog)
* **npm audit:** Evalúa el árbol de dependencias contrastándolo contra la base de datos de vulnerabilidades conocidas de Node Security / CVEs con nivel `--audit-level=moderate`.
* **TruffleHog:** Escáner criptográfico avanzado que analiza el historial de Git buscando llaves API privadas, certificados o tokens accidentales (filtraciones de llaves de Google Cloud, Brevo, AWS o Stripe).

### 3.5. Fase 5, 6 y 7: Empaquetado Docker y Despliegue Continuo
* Construcción de imágenes OCI ligeras multi-stage usando **Node.js 22 Alpine** y **Nginx Alpine**.
* Publicación de las imágenes etiquetadas con el SHA del commit en **GitHub Container Registry (GHCR)**: `ghcr.io/jefazo-isc/gymseminario`.
* Despliegue del cliente estático hacia **GitHub Pages**.
* Disparo del webhook de despliegue continuo hacia **Render** para actualizar los microservicios del servidor.

---

## 4. Arquitectura y Justificación de Servicios Web (10%)

### 4.1. Microservicios Backend en Node.js 22 LTS y Express

El backend se organiza como una API REST desacoplada, orientada a servicios y diseñada bajo principios de arquitectura limpia. Se optó por **Node.js 22 LTS con Express** debido a:
* **Modelo de E/S No Bloqueante (Event-Driven):** Permite procesar de manera concurrente cientos de peticiones de consulta de catálogo, validación de membresía y comunicación con LLMs sin que una petición lenta degrade el rendimiento general.
* **Huella de Memoria Reducida:** El contenedor consume menos de 128 MB de RAM en reposo, lo que maximiza la eficiencia de costos en instancias en la nube.
* **Unificación de Lenguaje:** El uso de JavaScript/TypeScript a lo largo de todo el stack tecnológico facilita el intercambio de modelos de datos e interfaces entre frontend y backend.

### 4.2. Mailing Transaccional: Migración de SMTP a Brevo HTTPS REST API

Durante las pruebas de despliegue en entornos PaaS modernos (como Render o Vercel), se identificó que las solicitudes basadas en **SMTP tradicional** (protocolos que utilizan los puertos TCP 25, 465 o 587 mediante bibliotecas como Nodemailer) eran bloqueadas por el firewall de la infraestructura en la nube por motivos de mitigación de spam. Dicho bloqueo provocaba retardos de más de 40 segundos por tiempo de espera agotado (*timeout*) y cancelaba las peticiones del frontend.

**Solución Arquitectónica Implementada:**
Se rediseñó el servicio de correo (`services/email.service.js`) implementando la **API REST HTTPS de Brevo v3** (consumida a través del puerto 443 estándar mediante llamadas `fetch` nativas de Node.js):

```javascript
// Llamada HTTPS REST no bloqueante hacia Brevo API
const response = await fetch('https://api.brevo.com/v3/smtp/email', {
  method: 'POST',
  headers: {
    'accept': 'application/json',
    'api-key': apiKey,
    'content-type': 'application/json'
  },
  body: JSON.stringify({
    sender: { name: 'espacioGYM GROM', email: 'cuentaalumnosterceroc@gmail.com' },
    to: [{ email: destinatario, name: nombreUsuario }],
    subject: `Confirmación de Reserva: ${actividad}`,
    htmlContent: htmlBody
  })
});
```
**Ventajas Obtenidas:**
- Latencia de respuesta reducida de 40+ segundos a **750 milisegundos**.
- Tasa de éxito de entrega del **100%**, confirmada mediante identificador de mensaje transaccional (`messageId: <...@smtp-relay.mailin.fr>`).
- Cero dependencias nativas pesadas en el contenedor.

### 4.3. Coach Virtual IA: Patrón Dual Fallback (Mercury + Gemini) con Circuit Breaker

Para evitar la dependencia exclusiva de un único proveedor de Inteligencia Artificial que pudiera colapsar la funcionalidad por cuotas agotadas (*rate limiting*) o fallas de autenticación (códigos HTTP 401/403/429), se diseñó e implementó un **Servicio Orquestador de IA con Circuit Breaker** (`services/aiProvider.service.js`):

```
                   PATRÓN ORQUESTADOR RESILIENTE DE IA
  ┌────────────────────────────────────────────────────────────────┐
  │ Petición de Plan de Entrenamiento / Rutina Personalizada       │
  └───────────────────────────────┬────────────────────────────────┘
                                  │
                 ┌────────────────▼────────────────┐
                 │ ¿Mercury disponible y activo?   │
                 └────────┬───────────────┬────────┘
                    SÍ    │               │  NO / Circuito Abierto
                          │               │
        ┌─────────────────▼─────┐         │
        │ Inception Mercury API │         │
        └─────────┬─────────────┘         │
                  │                       │
      ¿Éxito? ────┼──► [SÍ] ── Retornar respuesta al socio
                  │
                 [NO] (Error 401, 403, 429)
                  │
        ┌─────────▼────────────────────────┐
        │ Abrir Circuito por 5 minutos     │
        │ y disparar Fallback inmediato    │
        └─────────┬────────────────────────┘
                  │
        ┌─────────▼────────────────────────┐
        │ Google Gemini 2.5 / 2.0 Flash    │
        └─────────┬────────────────────────┘
                  │
                  ▼
          Retornar respuesta y registrar telemetría
```

El estado del circuito y la salud de ambos proveedores se expone en tiempo real a través del endpoint de observabilidad `GET /api/ai/status`.

### 4.4. Catálogo de Endpoints REST

| Método | Endpoint | Descripción | Parámetros / Payload |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Verificación de estado del backend y versión de Node.js | Ninguno |
| `GET` | `/api/ai/status` | Telemetría del Circuit Breaker y estado de proveedores LLM | Ninguno |
| `POST` | `/api/ai/coach` | Generación de rutina inteligente por IA | `{ mensaje, nivel, objetivo, restricciones }` |
| `POST` | `/api/enviar-correo` | Envío de correo transaccional de confirmación de clase | `{ destinatario, nombreUsuario, actividad, fecha, turno, folio }` |
| `GET` | `/api/ejercicios` | Catálogo centralizado de movimientos y músculos | Query params opcionales: `?grupoMuscular=pecho` |
| `POST` | `/api/reservas` | Registro y decremento de cupo para sesión deportiva | `{ usuarioId, actividad, fecha, turno }` |
| `GET` | `/api/metricas` | Estadísticas acumuladas de ocupación y asistencias | Ninguno |

---

## 5. Estructura y Modelado de Bases de Datos (10%)

### 5.1. Paradigma de Persistencia Híbrida / Políglota

El sistema utiliza una arquitectura de persistencia heterogénea o políglota, combinando motores NoSQL orientados a documentos con bases de datos relacionales tradicionales:

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                        MATRIZ DE SELECCIÓN DE BD                       │
  ├────────────────────────┬───────────────────────┬───────────────────────┤
  │   Cloud Firestore      │   SQLite Relacional   │   LocalStorage / PWA  │
  │   (NoSQL Documents)    │      (SQL ACID)       │      (Cache Local)    │
  ├────────────────────────┼───────────────────────┼───────────────────────┤
  │ • Usuarios & Perfiles  │ • Registro de Pagos   │ • Catálogo de         │
  │ • Membresías Activas   │ • Pólizas Contables   │   ejercicios offline  │
  │ • Sesiones de Clase    │ • Bitácora de Accesos │ • JWT Token de sesión │
  │ • Rutinas de IA        │ • Auditoría de Dinero │ • Tema visual UI      │
  └────────────────────────┴───────────────────────┴───────────────────────┘
```

### 5.2. Cloud Firestore (NoSQL Document Store)
* **Justificación:** Los perfiles deportivos de los socios son inherentemente polimórficos (algunos usuarios registran lesiones crónicas, alergias o medidas antropométricas variables). Firestore permite almacenar documentos JSON con esquemas dinámicos sin el sobrecosto de migraciones rígidas de base de datos.
* **Colecciones Principales:**
  - `usuarios`: `{ uid, nombre, email, rol, fechaRegistro, fotoUrl }`
  - `membresias`: `{ membresiaId, usuarioId, tipo, costo, fechaInicio, fechaVencimiento, estatus }`
  - `sesiones`: `{ sesionId, actividad, fecha, turno, cupoMaximo, cupoActual, sociosInscritos: [] }`
  - `rutinas_ai`: `{ rutinaId, usuarioId, fechaCreacion, providerUtilizado, contenidoMarkdown }`

### 5.3. SQLite Relacional (SQL Transaccional ACID)
* **Justificación:** Las operaciones que involucran movimientos financieros (cobro de mensualidades, registro de transferencias y cortes de caja) requieren soporte estricto de transacciones atómicas (**ACID**). El uso de SQLite garantiza consistencia matemática, integridad referencial y facilidad de transporte en contenedores livianos.
* **Esquema de Tablas Relacionales:**
  ```sql
  CREATE TABLE transacciones_pago (
      folio_pago TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL,
      membresia_id TEXT NOT NULL,
      monto DECIMAL(10,2) NOT NULL,
      metodo_pago TEXT NOT NULL CHECK(metodo_pago IN ('efectivo','tarjeta','transferencia')),
      fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
      estatus TEXT DEFAULT 'COMPLETADO'
  );

  CREATE TABLE bitacora_accesos (
      id_acceso INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id TEXT NOT NULL,
      folio_reserva TEXT NOT NULL,
      fecha_ingreso DATETIME DEFAULT CURRENT_TIMESTAMP,
      metodo_validacion TEXT DEFAULT 'QR_CODE'
  );
  ```

---

## 6. Modularidad y Arquitectura de la Aplicación Móvil PWA (10%)

### 6.1. Organización Arquitectónica en Angular 19

La interfaz móvil está estructurada bajo una arquitectura en capas desacopladas, lo que facilita el mantenimiento, las pruebas unitarias y la escalabilidad del sistema:

```
src/app/
│
├── core/                           # Lógica transversal de la aplicación
│   ├── auth/                       # Autenticación, JWT, Guards y RBAC
│   │   ├── auth.guard.ts           # Control de acceso a rutas protegidas
│   │   ├── auth.interceptor.ts     # Inyección inteligente de cabecera Authorization
│   │   └── auth.service.ts         # Manejo de estado del socio
│   └── services/                   # Servicios globales (Storage, Theme, Notifier)
│
├── domain/                         # Modelos de datos TypeScript e Interfaces
│   ├── usuario.model.ts            # Entidad Usuario y roles permitidos
│   ├── membresia.model.ts          # Reglas de cálculo de vigencia
│   └── reserva.model.ts            # Entidad de agendamiento y turnos
│
├── data/                           # Capa de comunicación HTTP y repositorios
│   ├── ejercicio.service.ts        # Catálogo de ejercicios y manejo de errores
│   ├── reserva.service.ts          # Integración con endpoint de agendamiento
│   └── ai-coach.service.ts         # Llamadas reactivas a la API de IA
│
├── modules/                        # Módulos de funcionalidad y vistas UI
│   ├── agendamiento/ (f2)          # Interfaz de reserva, calendario y QR
│   ├── coach-ia/                   # Chat conversacional con el LLM
│   ├── membresias/                 # Consulta de estatus y renovación
│   └── metricas/                   # Gráficas de ocupación y asistencia
│
└── shared/                         # Componentes, pipes y utilidades reutilizables
    ├── qr-generator/               # Componente vectorial de código QR
    ├── alert-badge/                # Banners visuales de confirmación
    └── pipes/                      # Formateadores de fecha y moneda
```

### 6.2. Capacidades PWA (Progressive Web App) y Soporte Offline
* **Manifiesto de la Aplicación (`manifest.webmanifest`):** Configurado con modo `standalone`, iconos adaptativos de 192x192 y 512x512 píxeles, color de tema corporativo (`#0f172a`), permitiendo que el usuario instale la aplicación en su dispositivo móvil como si fuera una aplicación nativa desde la tienda.
* **Service Worker (`ngsw-worker.js`):** Implementa estrategias de almacenamiento en caché de activos estáticos (`CacheFirst` para CSS, fuentes e imágenes) y estrategia de red con respaldo en caché (`NetworkFirst`) para el catálogo de ejercicios, permitiendo a los atletas consultar rutinas dentro de las instalaciones del gimnasio incluso con baja cobertura de red móvil.

---

## 7. Opciones y Estrategia de Seguridad Implementadas (10%)

El diseño de seguridad del sistema implementa el modelo de **Defensa en Profundidad (Defense in Depth)** y mitiga activamente las vulnerabilidades del **OWASP Top 10**:

### 7.1. Seguridad en la Aplicación Web y Servidor Backend
1. **Defensa Perimetral y HTTPS Forzado:**
   - Todo el tráfico cliente-servidor está encriptado mediante **TLS 1.3** a través del proxy perimetral de Render y GitHub Pages.
   - Mitigación volumétrica contra ataques de denegación de servicio (**DDoS**) gestionada en capa perimetral.
   - Encabezados estrictos de seguridad HTTP (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`).
2. **Autenticación y Control de Acceso Basado en Roles (RBAC):**
   - Emisión de tokens **JWT** con firma criptográfica HMAC-SHA256 y vigencia de 24 horas.
   - Los endpoints administrativos (`/api/metricas`, `/api/usuarios`) validan el *claim* de rol contenido en el payload del token, rechazando peticiones no autorizadas con código HTTP 403 Forbidden.
3. **Seguridad en el Desarrollo (SAST y DevSecOps):**
   - **ESLint:** Análisis estático de código integrado en GitHub Actions que previene antipatrones de codificación e inyecciones de código.
   - **TruffleHog:** Escaneo criptográfico de commits para evitar que llaves de API o certificados caigan en repositorios públicos.
   - **npm audit:** Verificación periódica de vulnerabilidades en módulos de terceros.

### 7.2. Seguridad en la Aplicación Móvil PWA
1. **Minimización de Superficie de Ataque en Interceptores:**
   - Se configuró el `authInterceptor` para que el token de autorización Bearer **únicamente se adjunte a peticiones dirigidas al backend oficial** (`gymseminario.onrender.com` o `localhost:3000`). Se bloqueó expresamente el envío del token a CDNs externas o repositorios públicos de GitHub Pages (`arl150.github.io`), mitigando el riesgo de fuga de credenciales (*Credential Leaking*).
2. **Sanitización de Entradas y Prevención de XSS:**
   - Angular aplica sanitización automática del DOM en todas las directivas de interpolación (`{{ }}`) y enlace de propiedades (`[innerHTML]`).
3. **Sanitización en Backend contra Inyecciones SQL:**
   - Las consultas en SQLite utilizan exclusivamente sentencias preparadas con parámetros tipados (`db.prepare('SELECT ... WHERE id = ?')`), neutralizando completamente cualquier intento de inyección SQL.

---

## 8. Resultados Obtenidos y Evidencias de Operación

1. **Pipeline de GitHub Actions 100% Exitoso:**
   - Compilación AOT de producción: **Éxito**.
   - Linting de código: **0 errores**.
   - Pruebas unitarias ejecutadas: **156/156 pruebas exitosas** en Chrome Headless.
   - Pruebas de integración con HttpClientTestingModule: **39/39 pruebas exitosas**.
   - Empaquetado y publicación de imagen Docker: **Publicada en GHCR**.
   - Despliegue en GitHub Pages: **Completado automáticamente**.

2. **Mailing Transaccional Operativo:**
   - Confirmación de clase enviada y recibida satisfactoriamente con la API REST de Brevo (`messageId: <202611051605.63369858188@smtp-relay.mailin.fr>`).
   - La interfaz `/f2` refleja el estado: *"Aviso por correo confirmado por el servicio"*.

3. **Resiliencia de IA Demostrada:**
   - El endpoint `GET /api/ai/status` reporta activamente el estado del Circuit Breaker y la disponibilidad de los modelos Gemini y Mercury sin comprometer la estabilidad del backend.

---

## 9. Conclusiones y Trabajo Futuro (Tercera Entrega)

### Conclusiones
La Segunda Entrega de Avance de Tesina de **espacioGYM (GROM 21)** cumple holgadamente con los lineamientos y criterios de evaluación establecidos en la rúbrica de la asignatura:
* Se presentó un salto cuantitativo y cualitativo respecto al MVP original.
* Se implementó un pipeline automatizado de integración y entrega continua de nivel profesional.
* Se resolvieron desafíos reales de despliegue en la nube (como el bloqueo de puertos SMTP) mediante decisiones arquitectónicas fundadas.
* Se garantizó la seguridad de la información aplicando buenas prácticas de la industria.

### Plan de Trabajo para la Tercera Entrega (Cierre de Tesina)
1. Integración con hardware de validación física: lector de códigos QR conectado a un microcontrolador (ESP32 / Raspberry Pi) para accionamiento de torniquete.
2. Integración de pasarela de pagos en línea con Stripe para suscripciones recurrentes automáticas.
3. Almacenamiento local avanzado con IndexedDB para habilitar un flujo 100% desconectado con sincronización bidireccional en segundo plano.

---
**Universidad Autónoma de Aguascalientes — Departamento de Sistemas Computacionales**  
*Noviembre de 2026*
