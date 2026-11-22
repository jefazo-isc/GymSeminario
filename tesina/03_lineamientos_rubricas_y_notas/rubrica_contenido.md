# 📋 Contenido para la Exposición — espacioGYM
### Presentación 03 de Noviembre 2026

---

## 1. Avances MVP (20%) ⭐

> [!IMPORTANT]
> Mencionar explícitamente los **sprints posteriores al MVP** y mostrar la app corriendo.

### Sprint Post-MVP completados:

| Sprint | Historia de Usuario | Feature |
|--------|-------------------|---------|
| S3 | "Como socio, quiero recibir una rutina personalizada por IA" | **Coach IA con Gemini** — selección de coaches, voz al iniciar |
| S3 | "Como socio, quiero recibir notificaciones por correo/SMS" | **Nodemailer + Twilio** integrados en backend |
| S3 | "Como socio, quiero gestionar mi membresía" | **Módulo Billing** con PayPal SDK |
| S4 | "Como socio, quiero escanear mi QR de asistencia" | **QR de acceso** vía API externa |
| S4 | "Como socio, quiero ver mis estadísticas de entrenamiento" | **Gráficas de sesiones** con Charts |
| S4 | "Como socio, quiero acceder desde mi celular" | **PWA** instalable + audio coaches |

**Demo en vivo:** `https://jefazo-isc.github.io/GymSeminario/`

---

## 2. Pipeline GitHub Actions (15%) ⭐

> [!IMPORTANT]
> Abrir GitHub Actions en vivo: `https://github.com/jefazo-isc/GymSeminario/actions`

### Estructura del Pipeline (5 Jobs):

```
Push a main
    │
    ├─ 🏗️  Job 1: Build & Verificación
    │       ├─ npm ci
    │       ├─ ng build --configuration production
    │       ├─ ESLint (continue-on-error: true)
    │       └─ Upload artifact angular-dist
    │
    ├─ 🧪  Job 2: Pruebas Unitarias (depends: Job1)
    │       ├─ Chrome Headless + Karma
    │       ├─ 154+ specs — components, services
    │       └─ Upload reporte cobertura
    │
    ├─ 🔗  Job 3: Pruebas de Integración (depends: Job1)
    │       ├─ HttpClientTesting (Angular)
    │       ├─ RutinaService, RemoteAdapters
    │       └─ Upload reporte integración
    │
    ├─ 🛡️  Job 4: Seguridad (depends: Job1)
    │       ├─ npm audit --audit-level=moderate
    │       └─ Trufflehog (secrets scan)
    │
    └─ 🐳  Job 5: Docker + Deploy (depends: Jobs 2,3,4)
            ├─ Build imagen Angular → GHCR
            ├─ Build imagen Express → GHCR
            └─ Deploy GitHub Pages ✅
```

**Archivo YAML:** `.github/workflows/ci.yml` (419 líneas)

---

## 3. Servicios Web Empleados (10%) ⭐

### Frontend
| Servicio/Librería | Justificación |
|---|---|
| **Angular 19** | Framework SPA moderno, soporte PWA nativo, tipado fuerte |
| **Angular Material** | Componentes UI accesibles, tema oscuro, responsive |
| **AngularFire** | SDK oficial Firebase para Angular, integración reactiva |
| **PayPal SDK** (`ngx-paypal`) | Procesamiento de pagos PCI-compliant |
| **angularx-qrcode** | Generación de QR para control de acceso |
| **SweetAlert2** | Alertas UX modernas sin bloqueo de UI |

### Backend (Render — Express.js)
| Servicio/Librería | Justificación |
|---|---|
| **Node.js + Express** | Runtime JS en servidor, ecosistema npm, rapidez de desarrollo |
| **Mercury Inception Labs / Gemini** | IA generativa para rutinas personalizadas y chat de coaches |
| **Nodemailer** | Envío de emails SMTP (confirmaciones, notificaciones) |
| **Twilio SDK** | SMS/WhatsApp para autenticación y alertas |
| **express-rate-limit** | Protección contra abuso de la API de IA |
| **SQLite (better-sqlite3)** | Rate limiting local sin dependencia externa |

### Infraestructura
| Servicio | Justificación |
|---|---|
| **Firebase Auth** | Autenticación con Google OAuth, email/contraseña, teléfono |
| **Cloud Firestore** | NoSQL escalable para perfiles de usuarios y roles |
| **GitHub Pages** | Hosting gratuito SPA Angular con HTTPS automático |
| **Render** | Backend Node.js con auto-deploy en push, HTTPS incluido |
| **GitHub Actions** | CI/CD integrado al repositorio, sin costo para públicos |
| **GHCR** | Registro de imágenes Docker ligado al repo |

---

## 4. Estructura de Bases de Datos (10%) ⭐

### Firestore (NoSQL) — Perfiles y Roles

```
📁 usuarios/
   └─ {uid}
       ├─ uid: string
       ├─ email: string
       ├─ nombre: string
       ├─ role: "admin" | "user"
       ├─ telefono: string
       └─ fechaRegistro: Timestamp

📁 numeros/
   └─ {phoneNumber}
       ├─ nombre: string
       └─ role: string
```

**Justificación Firestore:** Modelo flexible para usuarios con distintos campos según rol; escalabilidad automática; integración nativa con Firebase Auth; consultas en tiempo real.

### SQLite — Rate Limiting Backend

```sql
CREATE TABLE user_quotas (
  uid           TEXT PRIMARY KEY,
  email         TEXT,
  consultas_hoy INTEGER DEFAULT 0,
  ultimo_acceso TEXT
);

CREATE TABLE asistencias_edge (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  uid           TEXT,
  codigo_qr     TEXT,
  timestamp     TEXT,
  sincronizado  INTEGER DEFAULT 0
);

CREATE TABLE ia_cache (
  prompt_hash TEXT PRIMARY KEY,
  respuesta   TEXT,
  creado_en   TEXT
);
```

**Justificación SQLite:** Transaccional, sin servidor externo, perfecto para rate limiting y caché local en el backend de Render. No requiere configuración adicional.

---

## 5. Módulos de la Aplicación Móvil (PWA) (10%) ⭐

> [!NOTE]
> espacioGYM es una **PWA (Progressive Web App)** — instalable en Android/iOS desde el navegador, con soporte offline via Service Worker.

### Arquitectura Modular Angular 19

```
🅰️ espacioGYM (Angular PWA)
│
├── 🚀 Punto de Entrada
│   ├── main.ts              — Bootstrap de la app
│   └── app.config.ts        — Providers: Firebase, Router, HTTP, Animations
│
├── 🎨 Interfaz de Usuario (Layouts)
│   ├── PublicLayoutComponent  — Navbar + Footer para visitantes
│   └── AuthLayoutComponent    — Layout autenticado
│
├── 🧩 Módulos de Funcionalidad (Features)
│   ├── auth/         — Login, Registro, Cambio contraseña, Teléfono
│   ├── coach/        — IA Coach (Gemini), Rutinas personalizadas, Voz
│   ├── memberships/  — Catálogo de membresías y planes
│   ├── billing/      — Pagos PayPal, historial de transacciones
│   ├── training/     — Ejercicios, QR de asistencia, Estadísticas
│   ├── profile/      — Perfil biométrico del socio
│   ├── admin/        — Panel administrativo, gestión de usuarios
│   ├── courses/      — Cursos y clases grupales
│   └── public/       — Landing, Ubicación, Información pública
│
├── 💾 Capa de Datos
│   ├── *.repository.ts   — Repositorios con inyección de dependencias
│   ├── *.service.ts      — Servicios HTTP y lógica de negocio
│   └── *.model.ts        — Tipos e interfaces TypeScript
│
├── 🔧 Core (Infraestructura)
│   ├── core/auth/         — Guards de autenticación y roles
│   ├── core/config/       — APP_ENDPOINTS (InjectionToken)
│   └── core/storage/      — LocalStorage abstraction
│
└── 🛠️ Shared (Reutilizable)
    ├── shared/ui/         — Componentes genéricos (botones, cards)
    └── shared/directives/ — Directivas personalizadas
```

**Soporte móvil:** `manifest.webmanifest` + `ngsw-worker.js` (Service Worker Angular) — instalable como app nativa en Android e iOS.

---

## 6. Opciones de Seguridad (10%) ⭐

### 🌐 Seguridad Web

| Categoría | Mecanismo | Implementación |
|---|---|---|
| **Defensa perimetral** | HTTPS | GitHub Pages + Render — certificados TLS automáticos |
| **Defensa perimetral** | Mitigación DDoS | `express-rate-limit`: 60 req/min global, 15 req/min IA |
| **Defensa perimetral** | WAF | Cloudflare proxy en Render (nivel infraestructura) |
| **Auth & Acceso** | MFA | Firebase: email + SMS (Twilio) + Google OAuth |
| **Auth & Acceso** | IdP/SSO | Google OAuth 2.0 vía Firebase Auth |
| **Auth & Acceso** | Mínimo privilegio | RBAC: roles `admin`/`user` en Firestore, Guards en Angular |
| **Auth & Acceso** | Sesiones seguras | Firebase JWT tokens, expiración automática |
| **Seguridad en Desarrollo** | SAST | ESLint + TypeScript strict (`no-any`, `no-unused-vars`) |
| **Seguridad en Desarrollo** | Análisis vulnerabilidades | `npm audit` en CI — Job 4 del pipeline |
| **Seguridad en Desarrollo** | Secrets scan | Trufflehog en CI — detecta credenciales expuestas |
| **Seguridad en Desarrollo** | Validación backend | Middleware JWT en Express — verifica token antes de IA |
| **Seguridad en Desarrollo** | ReCAPTCHA | Google reCAPTCHA en autenticación por teléfono |

### 📱 Seguridad Móvil (PWA)

| Categoría | Mecanismo | Implementación |
|---|---|---|
| **Auth & Control acceso** | MFA | Firebase multi-factor (email + phone) |
| **Auth & Control acceso** | Gestión de sesiones | Firebase SDK — tokens JWT con refresh automático |
| **Cifrado y datos** | Cifrado en tránsito | HTTPS/TLS en todas las comunicaciones |
| **Cifrado y datos** | Minimización de datos | Solo UID y email se almacenan localmente |
| **Código y desarrollo** | Security by Design | Angular Guards protegen rutas privadas desde el build |
| **Código y desarrollo** | Validación de entradas | TypeScript strict + interfaces tipadas en todos los modelos |
| **Código y desarrollo** | SAST continuo | ESLint + `npm audit` automatizados en GitHub Actions |
| **Cumplimiento** | Protección de datos | No se almacenan datos de pago — PayPal maneja PCI DSS |

---

## 7. Documentación (10%)

- **Tesina:** `Tesina_gimnasio_revisada.docx` — documento técnico del proyecto
- **README:** Documentación técnica del repo con instrucciones de setup
- **Pipeline:** `.github/workflows/ci.yml` — documentado con criterios de evaluación
- **Arquitectura:** Verificada con `npm run check:architecture` (29 páginas, estructura limpia)

---

## 🎯 Checklist Demo en Vivo

- [ ] Abrir app: `https://jefazo-isc.github.io/GymSeminario/`
- [ ] Mostrar GitHub Actions con corrida verde: `https://github.com/jefazo-isc/GymSeminario/actions`
- [ ] Demo Coach IA — seleccionar coach → escuchar voz → generar rutina
- [ ] Demo Admin — mostrar panel con gestión de usuarios
- [ ] Demo PWA — mostrar botón "Instalar app" en Chrome móvil
- [ ] Mostrar Firebase Console — colección `usuarios` con docs reales
- [ ] Mostrar `back/index.js` — endpoints fusionados (email + SMS + IA)
- [ ] Mostrar `ci.yml` — 5 jobs bien definidos
