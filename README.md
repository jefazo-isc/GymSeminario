# GROM 21 · espacioGYM · GymSeminario

Plataforma web académica para un gimnasio: información pública, cursos, ejercicios, autenticación, reservas, asistencias, membresías, estado de cuenta, actividad y coach virtual con Gemini.

**Documentación actualizada: 27 de octubre de 2026, zona America/Mexico_City.** Describe el checkout y las fases 1 y 2 del rediseño frontend. Las secciones 14 y 15 detallan cambios, verificaciones y límites; no acreditan operaciones reales de los proveedores externos.

El nombre técnico del proyecto Angular es `libreria1`; el producto se presenta como GROM 21 y espacioGYM. Ese identificador determina los comandos de Angular y la carpeta de compilación.

## 1. Inicio rápido: ver la web

Abrir una terminal PowerShell en la raíz del repositorio:

```powershell
Set-Location 'C:\Users\mhuba\Documents\GitHub\GymSeminario'
npm ci
npm start
```

Abrir [http://localhost:4200](http://localhost:4200). La ruta inicial redirige a `/home`. Mantener la terminal abierta; Angular recompila al guardar cambios. Detener con `Ctrl+C`. Después de la primera instalación, normalmente basta con `npm start`.

**No es necesario iniciar Express para visualizar la interfaz pública.** Firebase, videos, mapas, imágenes y otras integraciones necesitan conexión y configuración externa. Las vistas locales de demostración pueden mostrar información sin un backend propio.

### Requisitos

- Node.js **22.x** y npm para desarrollo local. Angular 19.2 admite Node 22 según su [tabla oficial de compatibilidad](https://angular.dev/reference/versions).
- Git y un navegador actual.
- Conexión para descargar dependencias y acceder a proveedores.
- Acceso autorizado al proyecto Firebase para probar identidad y datos remotos.

Los Dockerfiles y el workflow actuales usan Node 20; no se han actualizado en esta revisión. La documentación oficial ya incluye Angular 19 entre las versiones sin soporte; una futura actualización del framework debe planearse por separado.

Comprobar el entorno con `node --version` y `npm --version`. No hace falta instalar Angular CLI globalmente: `npm start` usa la versión local.

Si `npm ci` falla, revisar el mensaje y la coincidencia entre `package.json` y el lock. No sustituirlo automáticamente por una instalación forzada ni eliminar archivos sin revisar la causa.

## 2. Iniciar el coach IA

El frontend llama directamente a `http://localhost:3000/api`. Para utilizar rutinas y chat se necesita un segundo proceso.

1. Instalar las dependencias de la raíz con `npm ci`.
2. Preparar un `.env` en la **raíz** con una clave Gemini autorizada. Si ya existe, conservar su contenido y agregar únicamente lo necesario; no sobrescribirlo.

```dotenv
GEMINI_API_KEY=TU_CLAVE_PRIVADA
# Opcional: usar un identificador habilitado para tu cuenta.
# GEMINI_MODEL=IDENTIFICADOR_DEL_MODELO
```

3. En otra terminal PowerShell, desde la raíz:

```powershell
Set-Location 'C:\Users\mhuba\Documents\GitHub\GymSeminario'
$env:PORT = '3000'
npm run server
```

4. Comprobar [http://localhost:3000/api/health](http://localhost:3000/api/health) y abrir [http://localhost:4200/coach-ia](http://localhost:4200/coach-ia).

`server/index.js` importa `dotenv/config`: cuando se ejecuta desde la raíz, carga el `.env` de esa carpeta. El SDK de Gemini se inicializa al importar los servicios; una clave ausente o inválida puede impedir el arranque o las consultas. El endpoint de salud indica que Express responde, no que una solicitud real a Gemini haya funcionado.

**Particularidad de la estructura actual:** `server/package.json` solo declara nombre, versión y módulos ES; las dependencias necesarias están en el `package.json` principal. En ejecución local, Node las resuelve desde `node_modules` de la raíz. Instalar solamente dentro de `server/` no prepara un backend independiente.

El modelo predeterminado escrito en ambos servicios es `gemini-3.5-flash-lite`. Esto describe el código, no confirma que Google lo tenga disponible para tu cuenta; puede sobrescribirse con `GEMINI_MODEL` y debe validarse con el proveedor.

## 3. Backend de notificaciones: opcional para inspección local

Existe un segundo servidor Express en `back/`, para correo y SMS. Se instala por separado:

```powershell
# Desde la raíz, en una terminal distinta a las anteriores:
npm --prefix back ci
$env:PORT = '3001'
npm --prefix back start
```

Comprobar [http://localhost:3001](http://localhost:3001). Ambos servidores Express usan **3000 por defecto**: es necesario cambiar `PORT` en notificaciones si el coach ocupa ese puerto.

**Arrancar `back/` localmente no cambia el destino del frontend.** `ApiService` y los formularios `/f2` y `/f3` envían las notificaciones a `https://gymseminario.onrender.com`. No hay proxy de desarrollo ni selector de entorno que redirija esas llamadas a `localhost:3001`. Para conectarlo localmente se requeriría una futura modificación del código/configuración, fuera de esta actualización documental.

`back/index.js` lee `process.env`, pero no carga `dotenv/config`. Para Twilio hay que definir `TWILIO_ACCOUNT_SID` y `TWILIO_AUTH_TOKEN` en el proceso que lo inicia. El número remitente y la configuración de Gmail están escritos directamente en ese archivo. No hay soporte actual de variables `SMTP_USER`, `SMTP_PASS` o `TWILIO_PHONE_NUMBER`.

El código contiene credenciales de correo incrustadas. No se reproducen aquí: si son reales, su propietario debe revocarlas/rotarlas y planear su retirada del código e historial. Iniciar el servidor no demuestra que Gmail o Twilio estén configurados correctamente.

## 4. Arquitectura

```mermaid
flowchart LR
    U[Navegador · Angular 19] --> F[Firebase Authentication]
    U --> D[Cloud Firestore]
    U --> L[localStorage · demostraciones]
    U --> I[localhost:3000 · Express IA]
    I --> G[Gemini API]
    U --> N[Render · notificaciones]
    N --> C[Correo / SMS]
    U --> E[API externa · QR y estadísticas]
    U --> X[Ejercicios JSON / PayPal / YouTube / Maps]
```

La API de notificaciones local es una alternativa de ejecución del código `back/`; la interfaz sigue usando la instancia remota hasta que se cambien sus URLs.

### Tecnologías declaradas

| Capa | Tecnologías |
| --- | --- |
| Interfaz | Angular 19.2, TypeScript 5.7, RxJS 7.8, componentes standalone |
| UI | Angular Material/CDK, Bootstrap, iconos, SweetAlert2 |
| Gráficas y QR | Chart.js, ng2-charts, angularx-qrcode |
| Identidad y datos | Firebase 11 y AngularFire 19 |
| API IA | Node.js, Express 5, Google Gen AI SDK, dotenv, CORS y express-rate-limit |
| Notificaciones | Express 5, body-parser, Nodemailer 7, Twilio 5 y CORS |
| Pruebas | Jasmine, Karma y Chrome launcher |
| Publicación | Angular build, Firebase Hosting, Nginx/Docker, GitHub Actions y GHCR |

Estas son las familias de versiones del manifiesto, no una recomendación de que todas estén actualizadas. El manifiesto raíz conserva también paquetes históricos como `angular` 1.x y `materials`; su presencia no cambia que el arranque principal sea Angular 19.

## 5. Estructura del repositorio

```text
GymSeminario/
├── .github/workflows/ci.yml       # Pipeline de build, lint, pruebas, auditoría y Docker
├── src/
│   ├── main.ts                   # Arranque standalone y registro de Chart.js
│   ├── index.html                # Documento HTML y recursos/SDK externos
│   ├── styles.css                # Estilos globales
│   ├── styles/                   # Tokens semánticos y tema Material de la fase 1
│   ├── types.d.ts                # Declaraciones manuales de Firebase
│   ├── app/
│   │   ├── app.component.*       # Shell: navegación, contenido de rutas y pie
│   │   ├── app.config.ts         # Router, HTTP, Firebase y service worker
│   │   ├── app.routes.ts         # Rutas principales
│   │   ├── auth/
│   │   │   ├── data-access/      # AuthService y acceso a usuarios/roles
│   │   │   ├── features/         # Login, registro, cambio y rutas hijas
│   │   │   └── utils/            # Validaciones auxiliares
│   │   ├── components/           # Páginas y componentes de negocio
│   │   ├── core/                 # Servicios centrales de tema y accesibilidad
│   │   ├── shared/ui/            # Marca, iconos, botones y paneles reutilizables
│   │   ├── services/             # APIs, perfil, planes, pagos, actividad y catálogos
│   │   ├── servicios/            # Servicio histórico de ejercicios Beeceptor
│   │   ├── models/               # Producto, rutina, membresía, pago y sesión
│   │   ├── pipes/                # Capitalización, categorías y URL de YouTube
│   │   └── common/               # Servicio de ventana para el flujo telefónico
│   ├── assets/                   # Recursos históricos; no es la entrada de assets del build actual
│   └── validators/               # Validación de contraseña y coincidencia
├── public/                       # Recursos copiados por Angular: imágenes, iconos y manifest
│   └── theme-init.js              # Preferencia visual antes del primer render
├── docs/design/                  # Referencias visuales de la fase 1
├── server/
│   ├── index.js                  # API del coach IA, módulos ES
│   ├── services/
│   │   ├── routineCoach.service.js
│   │   └── coachChat.service.js
│   ├── package.json              # No declara aún sus dependencias propias
│   └── Dockerfile
├── back/
│   ├── index.js                  # API correo/SMS, CommonJS
│   ├── find_fernanda.js           # Diagnóstico administrativo histórico
│   ├── package.json
│   ├── package-lock.json
│   └── Dockerfile
├── scripts/                      # Diagnósticos manuales de Firebase
├── angular.json                  # Build, serve, Karma y builder de GitHub Pages
├── package.json                  # Dependencias frontend e IA; scripts npm de la raíz
├── package-lock.json
├── tsconfig*.json                # Configuración TypeScript de app y pruebas
├── Dockerfile                    # Compila Angular y sirve con Nginx
├── docker-compose.yml            # Define frontend y ambos backends
├── firebase.json                 # Hosting y fallback SPA
├── .firebaserc                   # Proyecto de destino de Firebase CLI
├── ngsw-config.json              # Reglas de caché del service worker
├── public/manifest.webmanifest   # Metadatos de instalación
├── actividades_del_proyecto_espaciogym.md
├── r_brica_workflow_del_proyecto.md
└── README.md
```

El archivo PDF de la rúbrica y los documentos de actividades/workflow son material académico de apoyo. `3rdpartylicenses.txt` conserva avisos de terceros.

Hay servicios y componentes históricos que conviven con los actuales: `AuthServiceService` de estado local, `MicuentaService`, dos servicios de ventana, `usuario` y el servicio Beeceptor. Para entender el recorrido principal, empezar por `src/main.ts`, `app.config.ts`, `app.routes.ts` y los servicios que utiliza cada página.

## 6. Pantallas y rutas

| Ruta | Función |
| --- | --- |
| `/`, `/home` | Inicio editorial con hero, servicios, instalaciones, planes, horarios y accesos al catálogo/coach |
| `/nosotros`, `/servicio`, `/ubicacion` | Información y sucursal del gimnasio |
| `/carrusel`, `/responsables`, `/footer` | Vistas individuales de componentes públicos |
| `/redes/:id` | Redes sociales |
| `/buscar?q=texto` | Búsqueda en el catálogo local de cursos |
| `/detalle/:id` | Detalle de un curso por ID |
| `/ejercicios`, `/videos` | Catálogo remoto de ejercicios y videos YouTube |
| `/auth/sign-in`, `/auth/sign-up` | Login y registro con carga diferida |
| `/sesion` | Redirección compatible al acceso unificado `/auth/sign-in` |
| `/phone` | Inicio por teléfono, CAPTCHA y código OTP |
| `/change` | Cambio de contraseña con las credenciales actuales |
| `/micuenta` | Datos de sesión y perfil corporal para el coach |
| `/f2` | Agenda de entrenamiento con Firestore, notificación y QR |
| `/f3` | Registro de asistencia con Firestore, notificación y QR |
| `/editar1`, `/editar2` | Consulta, edición y eliminación de agendas/asistencias |
| `/graficos` | Gráfica de sesiones desde API externa |
| `/productos` | Catálogo, categorías, carrito y PayPal |
| `/membresias` | Planes, vigencia y renovación local |
| `/estado-cuenta` | Resumen, historial, anotaciones locales y documentos de ejemplo imprimibles |
| `/actividad` | Historial local de sesiones, ocupación y alertas |
| `/coach-ia` | Generación de rutinas y conversación con coaches |
| `/form` | Formulario histórico con su propia lógica de usuario/agenda local |

`app.routes.ts` no tiene guardas `canActivate` ni ruta comodín de páginas desconocidas. La visibilidad de opciones según usuario/rol no equivale a una autorización de datos. Las restricciones reales de Firestore dependen de las reglas del proyecto remoto; no se incluye un archivo de reglas en el checkout actual.

## 7. Funcionamiento por módulo

### Autenticación y perfil

`auth/data-access/AuthService` utiliza Firebase Authentication para correo/contraseña y Google. El flujo telefónico usa Firebase Phone Auth y reCAPTCHA. Los nombres y roles se consultan en Firestore, principalmente en `usuarios`, con búsquedas por ID, UID o email; también hay lógica heredada para números telefónicos.

Para probarlos hay que habilitar cada proveedor en Firebase y autorizar el dominio de desarrollo. El servicio implementa un contador de intentos en Firestore y bloquea el login al alcanzar tres; su funcionamiento depende del documento y de los permisos remotos. Esto no debe confundirse con una protección de servidor propia.

`Mi Cuenta` guarda el perfil corporal en `PerfilSocioService`. El coach reutiliza nombre, edad, peso, altura, género, objetivo, nivel, días disponibles y restricciones médicas. Estos datos de perfil se almacenan en el navegador, no en un historial clínico remoto.

### Agendas y asistencias

- `/f2` escribe en `formularioEntrenamiento`, obtiene los datos de contacto del usuario e intenta enviar confirmación por correo o SMS.
- `/f3` escribe en `asistencias` e intenta la notificación correspondiente.
- `QrViewComponent` solicita una cadena a la API externa de QR y la combina con clase y fecha.
- `/editar1` y `/editar2` leen colecciones de Firestore y permiten modificar/eliminar registros.

Las escrituras de Firestore y los envíos de notificación son operaciones distintas. Una de ellas puede funcionar aunque falle la otra. La fase 2 conserva el registro confirmado aunque falle el aviso y permite reintentar solamente la notificación; elimina la redirección automática de diez segundos. El cliente QR propaga los errores reales de la API: se retiró la cadena ficticia de respaldo. Un QR mostrado no demuestra por sí solo que sea un boleto validado. No se implementa aquí un lector, firma criptográfica o autorización física de acceso.

### Membresías

`MembresiaService` define Básico ($350, mensual), Pro Fitness ($550, mensual) y Black Elite ($1200, trimestral). Son los valores declarados, no tarifas comerciales verificadas.

La vista permite seleccionar periodos mensual, trimestral o anual. Aplica las fórmulas originales `precio × 3 × 0.9` y `precio × 12 × 0.8` para trimestre/año. El periodo trimestral de Black Elite contradice esa base mensual implícita. La fase 2 conserva los valores y cálculos, muestra la contradicción en la tarjeta y exige reconocerla antes de guardar la simulación. Su importe no se presenta como una cotización ni como tarifa validada.

Adquirir o renovar actualiza un objeto local con folio, precio, periodo, fechas, beneficios y estado. La primera visita muestra un plan Pro Fitness de demostración con 18 días restantes. Los estados son `Activa`, `Por vencer` y `Vencida`. No hay cobro automático ni persistencia de membresías en Firestore en este servicio.

### Estado de cuenta y pagos

`PagoService` administra un historial local con ejemplos iniciales. Calcula total pagado/pendiente y último pago; permite registrar pagos, liquidar pendientes o cancelarlos. `EstadoCuentaComponent` ofrece filtros, formularios y un recibo imprimible.

Registrar un método como tarjeta, transferencia o QR es una anotación de demostración: no cobra, verifica un depósito ni consulta una entidad bancaria. El estado de cuenta no está enlazado automáticamente al checkout PayPal de productos ni a un libro contable remoto.

### Actividad, ocupación y alertas

`SesionService` proporciona historial y alertas con datos iniciales de demostración. Permite cambiar el estado de sesiones y marcar alertas como leídas. La ocupación por horario se calcula a partir de capacidades e inscritos estáticos.

Las cancelaciones de `/actividad` modifican ese historial local; no eliminan automáticamente documentos de `formularioEntrenamiento`. Las alertas no son notificaciones push, correos programados ni lecturas de ocupación en tiempo real.

### Productos y PayPal

El catálogo está definido en `ProductosComponent`; conserva sus 40 artículos, incluidos el precio de prueba de $1 MXN del primer producto y las categorías originales. Permite búsqueda, filtros, ordenación y cantidades del carrito en memoria. Los fragmentos `#proteinas`, `#creatinas`, `#preentrenos`, `#accesorios` y `#ropa` siguen seleccionando su categoría.

El SDK PayPal se carga en `src/index.html`; el componente conserva la creación/captura desde el navegador y los importes `purchase_units[].amount.value`. El usuario revisa el total antes de montar el botón; un SDK ausente muestra reintento. La interfaz solo vacía el carrito si PayPal comunica `status: COMPLETED`; un resultado pendiente o incierto conserva los artículos y pide verificar el proveedor. No se efectuaron cobros durante la revisión.

El repositorio no implementa validación propia del importe en servidor, webhooks, inventario, pedidos persistentes o conciliación con `PagoService`. La disponibilidad del SDK o de sus botones no acredita una compra real. Usar cuentas sandbox para una futura prueba de pagos.

### Coach IA

`RutinaService` envía el perfil a Express. `routineCoach.service.js` pide JSON estructurado con título, objetivo, nivel, días, ejercicios y recomendaciones. Cada ejercicio incluye nombre, series, repeticiones y descanso; las notas del coach son opcionales.

La caché vive en memoria durante hasta 12 horas y se pierde al reiniciar. La clave actual no incorpora todos los datos del perfil: por ejemplo, edad y género no forman parte de ella. Si Gemini falla, el servicio devuelve `exito: false` y una plantilla general de respaldo. La fase 2 no presenta esa plantilla como una rutina personalizada: exige éxito explícito y una estructura válida. Muestra si una respuesta válida procede de caché o de Gemini.

El chat utiliza cuatro personajes (`patricio`, `temach`, `arnold`, `chavo`) e incorpora perfil, rutina y los últimos seis mensajes del historial enviado. Las rutinas y mensajes requieren conexión con Gemini y cuota disponible. El contenido generado necesita revisión humana antes de aplicarse al entrenamiento.

## 8. Datos y persistencia

| Almacén | Datos | Alcance |
| --- | --- | --- |
| Firebase Authentication | Identidad, email, teléfono y métodos de acceso | Proyecto remoto |
| Firestore: `usuarios` | Nombre, email, UID, teléfono, rol e intentos | Depende de configuración y reglas remotas |
| Firestore: `formularioEntrenamiento` | Entrenamiento, fecha, turno, usuario y contacto | Reservas remotas |
| Firestore: `asistencias` | Clase, fecha, hora y alumno | Registros remotos |
| `gym_perfil_socio` | Perfil corporal | `localStorage` |
| `espacio_gym_membresia` | Plan y vigencia | `localStorage` |
| `espacio_gym_pagos` | Historial de pagos de demostración | `localStorage` |
| `espacio_gym_historial_sesiones` | Historial de sesiones de demostración | `localStorage` |
| `espacio_gym_alertas` | Alertas y estados de lectura | `localStorage` |
| Memoria del frontend | Carrito, conversación y rutina mostrada | No garantiza persistencia al recargar |
| Memoria del backend IA | Caché de rutinas | Por proceso; se pierde al reiniciar |

Las claves locales anteriores no llevan sufijo de UID: los datos son del navegador/origen y pueden verse al cambiar de cuenta en ese mismo entorno. No constituyen separación segura de usuarios. Borrar los datos del sitio elimina las modificaciones locales; en varias vistas reaparecen datos de demostración.

La configuración web de `app.config.ts` apunta a **`dbgroom-4eba4`**, mientras `.firebaserc` selecciona **`gina1-838c7`** para Firebase CLI. No asumir que autenticación y despliegue utilizan el mismo proyecto. Comprobar esa diferencia antes de cualquier publicación.

## 9. APIs y dependencias externas

### API IA local, puerto 3000

| Método / ruta | Contrato principal |
| --- | --- |
| `GET /api/health` | Devuelve `status` y `timestamp` |
| `GET /api/coaches` | Lista de coaches con ID, nombre, título, emoji y frase |
| `POST /api/rutina` | Recibe `PerfilSocio`; devuelve `exito`, `origen` y/o `data`/`error` |
| `POST /api/coach/chat` | Recibe coach, mensaje, historial, contexto de rutina y perfil |

El perfil incluye `nombre`, `edad`, `peso`, `altura`, `genero`, `objetivo`, `diasDisponibles`, `nivel` y `restriccionesMedicas`. El chat responde con `exito`, `coach` y `respuesta`.

El servidor aplica 60 solicitudes por minuto/IP en general y ocho por minuto/IP a las operaciones IA, compartidas entre rutina y chat. Son límites del código, no cuotas garantizadas de Google. CORS está abierto; estos endpoints no verifican un ID token de Firebase. La pantalla puede pedir sesión, pero esa condición visual no protege la API directamente.

### API de notificaciones

| Método / ruta | Campos requeridos |
| --- | --- |
| `GET /` | Comprobación de estado |
| `POST /enviar-correo` | `correo`, `nombre`, `entrenamiento`, `fecha`, `turno` |
| `POST /enviar-asistencia` | `correo`, `nombre`, `clase`, `fecha`, `hora` |
| `POST /enviar-sms` | `telefono`, `mensaje` |

La instancia local usa el puerto indicado por `PORT`; los formularios actuales llaman a Render. Twilio sin configuración devuelve `503`. El servidor no implementa autenticación Firebase, cola de envíos, reintentos persistentes ni un planificador de vencimientos.

### Servicios utilizados por el navegador

| Servicio | Dirección / configuración |
| --- | --- |
| Notificaciones | `https://gymseminario.onrender.com` |
| QR | `https://api-j6b4.onrender.com/api/user-qr/{uid}` |
| Estadísticas | `https://api-j6b4.onrender.com/api/sessions/stats` |
| Ejercicios | `https://arl150.github.io/ejercicios-api/ejercicios.json` |
| Firebase | Configuración en `src/app/app.config.ts` |
| PayPal, YouTube, Maps, redes y CDN | SDK, iframes, URLs e imágenes en HTML/componentes |

El código de la API externa de QR/estadísticas no forma parte de este repositorio. No se verificó hoy su disponibilidad. La vista de gráficas consulta esa API periódicamente; es independiente de la ocupación estática de `/actividad`.

## 10. Comandos disponibles y verificación

| Comando desde la raíz | Finalidad |
| --- | --- |
| `npm start` | `ng serve`, frontend en desarrollo |
| `npm run server` | Ejecuta la API IA desde la raíz |
| `npm run build` | Compila Angular; producción es la configuración predeterminada |
| `npm run watch` | Compila desarrollo y observa cambios |
| `npm test` | Ejecuta Karma/Jasmine |
| `npm run test:design` | Pruebas aisladas del sistema visual, tema, búsqueda y shell |
| `npm run test:frontend` | Sistema visual y pruebas de recorridos de la fase 2; proveedores remotos simulados en los tests |
| `npm run check:design` | Contraste de tokens y aplicación del tema antes de pintar |
| `npm run ng -- <argumentos>` | Pasa argumentos al Angular CLI local |

No existen scripts raíz `test:ci`, `test:backend`, `check` o `notifications` en este checkout.

Para una futura ejecución de pruebas sin observación, con Chrome instalado:

```powershell
npm test -- --watch=false --browsers=ChromeHeadless
```

Karma necesita un navegador compatible; puede ser necesario definir `CHROME_BIN`. `back/package.json` conserva un script `test` de ejemplo que termina con error; `server/package.json` no define pruebas. No hay un framework e2e configurado: `ng e2e` no es una comprobación lista para usar.

La revisión documental inicial del 27/10/2026 no ejecutó verificaciones. La implementación posterior de la fase visual sí compiló el frontend y ejecutó pruebas: ver la sección 14 para resultados y alcance. No se ejecutó una auditoría npm ni se validaron operaciones reales de backend, cobros o autenticación.

### Pipeline GitHub Actions

`.github/workflows/ci.yml` declara:

1. Compilación de producción y análisis ESLint, instalando y configurando herramientas de lint en el runner.
2. Pruebas unitarias con Karma/Chrome headless y un artefacto de cobertura.
3. Un trabajo denominado integración que selecciona specs de servicios y autenticación; no equivale a pruebas e2e reales con todos los proveedores.
4. Auditoría npm y detección de secretos. Algunas etapas toleran fallos: la auditoría utiliza `|| true` y la detección de secretos permite continuar con errores.
5. Publicación de imágenes frontend y `server/` en GHCR únicamente en push a `main`, después de los trabajos anteriores. No publica una imagen propia de `back/`.

El workflow se dispara por push/pull request hacia `main` y `develop` y utiliza Node 20. Su declaración no certifica ausencia de vulnerabilidades ni valida los proveedores de producción.

## 11. Compilación, Docker y publicación

### Compilar el frontend

```powershell
npm run build
```

El directorio publicable es **`dist/libreria1/browser/`**, según `angular.json`, `Dockerfile` y `firebase.json`. Compilar no inicia Express ni convierte los datos locales de demostración en servicios remotos.

### Docker Compose existente

El repositorio declara frontend en Nginx, IA y notificaciones. Con Docker y Compose instalados, los comandos de referencia son:

```powershell
docker compose config --quiet
docker compose up --build
```

| Servicio Compose | Puerto en el contenedor | Puerto en el equipo |
| --- | --- | --- |
| `frontend` | 80 | 4200 |
| `backend-ia` | 3000 | 3000 |
| `backend-notif` | 3000 | 3001 |

**Limitaciones actuales:** la imagen de `server/` instala dependencias solamente de ese directorio, pero su manifiesto no las declara; el inicio aislado de la imagen puede fallar. Nginx usa su configuración predeterminada, sin un archivo propio de fallback SPA o proxy en este checkout; recargar rutas internas puede devolver 404. Los destinos HTTP del frontend siguen siendo los escritos en el código, incluidos Render y `localhost:3000`.

La configuración Docker solamente se leyó: no se construyeron ni iniciaron contenedores. Para ver el proyecto ahora, usar preferentemente el flujo local de las secciones 1 y 2.

### Firebase Hosting

`firebase.json` publica la carpeta compilada y redirige las rutas a `index.html`. No aloja los dos procesos Express. Antes de publicar hay que alinear el proyecto de `.firebaserc`, comprobar los dominios de Authentication y preparar URLs HTTPS para los backends.

`localhost:3000` accede al equipo de quien abre la página, no a un servidor de producción. Publicar el frontend no habilita automáticamente el coach para otras personas. También hay que revisar el contenido mixto cuando una página HTTPS intenta llamar a HTTP.

El builder `angular-cli-ghpages` está declarado para GitHub Pages, pero no se validó en esta revisión. No se ejecutó ningún comando de publicación.

### Manifest y PWA

Existen `public/manifest.webmanifest`, iconos y `ngsw-config.json`; la compilación de producción configura un service worker. Sin embargo, `app.config.ts` establece `enabled: false` y `src/index.html` incluye lógica para eliminar registros. La existencia de esos archivos no significa que el modo sin conexión esté activo. Autenticación, IA, pagos y APIs dinámicas necesitan red.

## 12. Problemas frecuentes al iniciar

| Síntoma | Qué comprobar |
| --- | --- |
| No se encuentra `npm`/`node` | Instalación y PATH de Node.js; abrir otra terminal después de instalar |
| `ng` no se reconoce | Ejecutar `npm ci` desde la raíz y usar `npm start` |
| `npm ci` falla | Versión de Node, acceso al registro npm y coincidencia entre lock y manifiesto |
| La web abre, pero el coach falla | Segunda terminal con `npm run server`, clave Gemini y puerto 3000 |
| `Cannot find package` en IA | Dependencias instaladas en la raíz y ejecución desde esa carpeta |
| Falla la creación del cliente Gemini | Definir `GEMINI_API_KEY` antes de iniciar; revisar modelo y permisos de la cuenta |
| `EADDRINUSE` | Dos procesos usan el mismo puerto; reservar 3000 para IA y 3001 para notificaciones |
| Falla login, popup o CAPTCHA | Conexión, proveedor habilitado, dominio autorizado y configuración Firebase |
| Login bloqueado tras varios intentos | Contador `intentos` y documento del usuario; existe un bloqueo cliente/Firestore |
| Firestore devuelve `permission-denied` | Sesión, proyecto y reglas remotas; no deshabilitar reglas indiscriminadamente |
| Iniciar `back/` no cambia los envíos | El frontend sigue apuntando a Render |
| Gráfica o QR no disponibles | Disponibilidad y contrato de la API externa |
| Pagos/actividad muestran ejemplos | Son datos locales de demostración, no lecturas de un sistema financiero real |
| Los cambios no aparecen en otro dispositivo | `localStorage` no se sincroniza y está separado por origen del sitio |
| PayPal o imágenes no cargan | SDK, client ID, red, CDN y bloqueadores |
| Recargar una ruta en Docker da 404 | Nginx no tiene un fallback SPA configurado |

## 13. Mantenimiento y documentos de apoyo

- Los locks de la raíz y `back/` están versionados. La regla `package-lock.json` de `.gitignore` puede ocultar locks nuevos, pero no deja de rastrear los ya versionados. Actualmente no hay un lock propio en `server/`.
- `.env`, dependencias, logs, compilación y caché Angular se excluyen según `.gitignore`. No copiar secretos a este README, scripts o commits.
- Los archivos de `scripts/` y `back/find_fernanda.js` son diagnósticos históricos. No forman parte del inicio y no deben ejecutarse automáticamente contra cuentas reales; algunos contienen datos fijos o referencias a credenciales administrativas.
- `src/types.d.ts` define manualmente varios exports de Firebase como `any`. Puede ocultar incompatibilidades: la ausencia de errores de tipos no acredita una integración correcta.
- [Actividades del proyecto](actividades_del_proyecto_espaciogym.md) y [documentación del workflow](r_brica_workflow_del_proyecto.md) acompañan el desarrollo académico. Sus estados deben contrastarse con el código y las ejecuciones verificadas.
- Hay recursos y dependencias de terceros. Sus avisos y `3rdpartylicenses.txt` no sustituyen una licencia general para el código propio; no existe `LICENSE` en la raíz.

### Prioridades para una futura revisión de código

Separar dependencias del backend IA; parametrizar URLs y secretos; alinear proyectos Firebase; aplicar autorización real en rutas, APIs y datos; revisar el aislamiento local por usuario; conectar pagos, membresías y actividad con datos persistentes; validar fechas y precios; configurar SPA/proxy en Docker; revisar PWA, tipos, pruebas y dependencias.

Estas prioridades de integración siguen pendientes. Para visualizar el proyecto, el recorrido principal sigue siendo **`npm ci` → `npm start` → http://localhost:4200**. Iniciar `npm run server` en paralelo solamente cuando se necesite el coach IA.

## 14. Rediseño frontend — fase 1 · 27/10/2026

Esta fase establece la identidad visual y la estructura compartida de GROM 21. Conserva Angular standalone, las rutas, los datos de demostración y los contratos existentes. La reorganización detallada de las páginas y la futura arquitectura de backend corresponden a fases posteriores.

### Inicio y recorrido visual

```powershell
npm ci
npm start
```

Abrir **http://localhost:4200/home**. La cabecera agrupa Inicio, El gimnasio, Membresías y Entrenar. El menú de cuenta utiliza los observables existentes de autenticación y muestra administración únicamente con el rol explícito `admin`; esto no sustituye autorización de servidor ni guards.

El botón de monitor, sol o luna abre **Apariencia y accesibilidad**. Desde ahí se puede elegir **Claro, Oscuro o Sistema**, aumentar el texto hasta 125 %, reforzar contraste, reducir movimiento y escuchar Nosotros/Servicios cuando el navegador dispone de síntesis de voz. Restablecer accesibilidad conserva el tema elegido. El pie ofrece el mismo acceso mediante **Tu experiencia**.

La búsqueda se abre con la lupa o **Ctrl+K / Cmd+K** y conserva la ruta `/buscar?q=...`. Los diálogos admiten Escape, contienen el foco y lo devuelven al control que los abrió. Al navegar, el contenido principal recibe el foco; el enlace **Saltar al contenido** permite omitir la cabecera. Se restaura la posición al volver en el historial.

### Sistema visual y organización

| Elemento | Implementación / propósito |
| --- | --- |
| Tokens | `src/styles/tokens.css`: superficies, texto, acciones, estados, tipografía, espaciado de 4 px, radios, sombras, capas y movimiento |
| Tema Material | `src/styles/material.scss`: API `mat.theme` / `mat.theme-overrides` de Material 19; reemplaza el tema predefinido azure-blue |
| Compatibilidad | `src/styles.css`: bases, botones, overlays, Bootstrap, SweetAlert2, formularios y adaptadores semánticos para páginas existentes |
| Tema inicial | `public/theme-init.js`, cargado en `src/index.html` antes de las hojas de estilo |
| Tema en Angular | `src/app/core/theme/theme.service.ts`: preferencia y tema efectivo separados, persistencia y escucha del sistema |
| Accesibilidad | `src/app/core/accessibility/accessibility.service.ts`: lectura, escala, contraste y movimiento independientes del tema |
| Base reutilizable | `src/app/shared/ui/`: `app-icon`, `app-brand`, directiva `appButton`, paneles de preferencias y búsqueda |
| Shell | `app.component.*`, `components/navbar/` y `components/footer/`: navegación, contenido, cuenta, móvil y enlaces útiles |
| Gráficas | `components/graficos/`: colores y tooltips de Chart.js actualizados al cambiar tema; consultas y datos conservados |
| Pruebas | `tsconfig.design.spec.json`, configuración Karma `design` y `scripts/check-design.cjs` |

Se utiliza Roboto con alternativas locales Segoe UI / sistema. La paleta clara combina blanco cálido `#F7F7F5`, texto `#1F2937`, petróleo `#375D67` y salvia `#557363`. La oscura combina grafito `#101214`, superficies `#181C20`, texto `#F1F3F5`, petróleo `#93BAC4` y salvia `#A3B7A8`. Los colores de texto sobre acciones se definen por separado. Éxito, advertencia y error tienen tonos semánticos apagados.

Se añadió `@angular/animations` 19.2.14, alineado con el Angular instalado, y se registró `provideAnimationsAsync`. No se añadió otra biblioteca de componentes.

La cabecera cambia a menú móvil por debajo de 1024 px; el botón hamburguesa se oculta en escritorio. Se retiraron los controles flotantes anteriores y el modo que desplazaba el contenido a la derecha. No se invierten imágenes. La marca mantiene sus recursos originales; QR e impresión conservan sus necesidades propias de legibilidad. Los iframes de terceros controlan su propio diseño.

Los estilos activos de las páginas se adaptaron a tokens, se suavizaron bordes/sombras y se quitaron degradados decorativos. Los nombres históricos como `btn-naranja` se mantienen temporalmente como adaptadores para conservar los bindings. Los formularios usan contenedores válidos en lugar de elementos `body` anidados y se ajustaron mínimos de ancho que desbordaban en móvil. La estructura de negocio y las acciones permanecen en sus componentes actuales.

### Persistencia y comportamiento

La clave **`grom.theme`** de `localStorage` almacena `light`, `dark` o `system`. En ausencia de un valor válido se utiliza Sistema. El elemento raíz expone `data-theme`, `data-theme-preference` y `color-scheme`. El script inicial aplica la preferencia antes de pintar; Angular mantiene el estado y actualiza `theme-color`.

Los cambios de `prefers-color-scheme` modifican la interfaz únicamente en Sistema. El listener se elimina al destruir el servicio. Si el almacenamiento falla, el tema funciona durante la visita. Las APIs del navegador se consultan únicamente cuando corresponde; se comprobó la construcción del servicio con plataforma servidor, sin afirmar que toda la aplicación tenga SSR habilitado.

Las preferencias de lectura son de la sesión. `prefers-reduced-motion` se respeta mediante CSS y puede reforzarse manualmente. La lectura usa el contenido de Nosotros/Servicios, cancela al navegar y depende de las voces del navegador. No se cambian anchos, alineación ni filtros de imagen al activar contraste.

### Validación y límites

```powershell
npm run build
npm run check:design
npm run test:design
```

Karma necesita Chrome o un ejecutable Chromium compatible. En el equipo de esta revisión se utilizó Edge:

```powershell
$env:CHROME_BIN = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
npm run test:design
```

- Compilación de desarrollo y producción completadas; producción conserva avisos CommonJS de SweetAlert2 y `qrcode`. Verificaciones realizadas con Node 24.16.0, npm 11.13.0 y Edge 156 del equipo; para preparar un entorno nuevo se mantiene la recomendación Node 22 de la sección 1.
- 20 pruebas del sistema visual aprobadas: preferencias, cambios del sistema, almacenamiento bloqueado, limpieza de listeners, plataforma servidor, accesibilidad independiente, búsqueda y shell.
- `check:design` comprueba 25 pares de color por tema y 7 escenarios del script inicial. Contraste texto/superficie: **14,68:1 claro / 15,40:1 oscuro**; texto secundario: **6,00:1 / 7,80:1**; texto sobre botón: **7,18:1 / 8,39:1**. Los pares normales evaluados superan 4,5:1; foco y series de gráfica evaluados superan 3:1.
- Revisión manual en navegador de temas, persistencia tras recarga, menús, Escape/foco, búsqueda, tabla de ejercicios y tamaños de pantalla móviles y de escritorio. Referencias en [docs/design](docs/design/).
- **La suite general `npm test -- --watch=false --browsers=ChromeHeadless` no pasa**: los specs previos de sign-in/sign-up importan exports nombrados que sus componentes no ofrecen; `safe-url.pipe.spec.ts` construye el pipe sin `DomSanitizer`. La batería `design` tiene alcance explícito y no reemplaza esa suite.
- No se declara conformidad integral de accesibilidad ni validación de todas las páginas/estados, lectores de pantalla, voces, servicios externos o transacciones. La entrega inicial se limitó a la fase 1; su continuación se documenta en la sección 15.

Para continuar, conservar los tokens y componentes de esta fase como base. Evitar colores literales nuevos para la interfaz; usar `--color-action` y `--color-on-action` juntos, mantener estados semánticos y comprobar ambas apariencias antes de añadir una pantalla.

![Referencia de escritorio, tema claro](docs/design/fase1-claro-escritorio.png)

![Referencia de escritorio, tema oscuro](docs/design/fase1-oscuro-escritorio.png)
