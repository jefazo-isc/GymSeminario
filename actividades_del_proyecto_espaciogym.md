# Resumen de Actividades - espacioGYM

A continuación se presenta la lista centralizada de historias de usuario y tareas de Jira, consolidando su clave, rol, descripción (historia de usuario), prioridad y estado real de implementación según el código fuente del proyecto.

### Convención de Estados
- **Terminada**: Totalmente implementada y funcional en componentes y servicios.
- **En curso**: Parcialmente desarrollada o con lógica preliminar funcional.
- **Pendiente**: Sin implementación en el frontend/backend actual.

---

### Sprint 1: Sitio Público y Usuarios
| Clave | Título / HU | Prioridad | Historia de Usuario | Estado Real |
| :--- | :--- | :--- | :--- | :--- |
| **SCRUM-16** | HU-01 Visualizar información general | Baja | Como visitante, quiero visualizar información general del gimnasio para conocer los servicios ofrecidos. | **Terminada** |
| **SCRUM-17** | HU-02 Consultar ubicación | Media | Como visitante, quiero ver la ubicación del gimnasio para saber cómo llegar (Google Maps integrado). | **Terminada** |
| **SCRUM-18** | HU-03 Consultar horarios | Media | Como visitante, quiero consultar los horarios de atención para planear mis visitas. | **Terminada** |
| **SCRUM-19** | HU-04 Consultar redes sociales | Media | Como visitante, quiero acceder a las redes sociales (Instagram, TikTok) para conocer novedades del gimnasio. | **Terminada** |
| **SCRUM-20** | HU-05 Registro de clientes | Media | Como visitante, quiero registrarme en la plataforma para acceder a los servicios del gimnasio. | **Terminada** |
| **SCRUM-21** | HU-06 Inicio de sesión | Media | Como cliente, quiero iniciar sesión para acceder a mi información. | **Terminada** |
| **SCRUM-40** | HU-07 Inicio de sesión con Google | Baja | Como cliente, quiero autenticarme con Google para ingresar rápidamente vía Firebase Auth. | **Terminada** |
| **SCRUM-22** | HU-08 Editar perfil | Media | Como cliente, quiero actualizar mis datos para mantener mi información actualizada. | **Terminada** |

---

### Sprint 2: Membresías y Pagos
| Clave | Título / HU | Prioridad | Historia de Usuario | Estado Real |
| :--- | :--- | :--- | :--- | :--- |
| **SCRUM-24** | HU-10 Registrar membresía | Media | Como administrador, quiero crear membresías para habilitar servicios a clientes. | **Terminada** |
| **SCRUM-26** | HU-11 Renovar membresía | Media | Como administrador, quiero renovar membresías para extender su vigencia. | **Terminada** |
| **SCRUM-25** | HU-12 Consultar vigencia | Alta | Como cliente, quiero consultar mi membresía para saber si está activa. | **Terminada** |
| **SCRUM-38** | HU-13 Consultar historial de membresías | Alta | Como administrador, quiero consultar renovaciones anteriores para llevar seguimiento. | **Pendiente** |
| **SCRUM-27** | HU-15 Registrar pago | Alta | Como administrador, quiero registrar pagos para actualizar el estado financiero. | **Pendiente** |
| **SCRUM-29** | HU-16 Consultar historial de pagos | Baja | Como administrador, quiero revisar pagos realizados para llevar control financiero. | **Pendiente** |
| **SCRUM-28** | HU-17 Consultar estado de cuenta | Media | Como cliente, quiero ver mis pagos para conocer mi situación financiera. | **Pendiente** |

---

### Sprint 3: Sesiones, Rutinas y Métricas
| Clave | Título / HU | Prioridad | Historia de Usuario | Estado Real |
| :--- | :--- | :--- | :--- | :--- |
| **SCRUM-34** | HU-18 Crear rutina | Baja | Como entrenador/socio, quiero crear rutinas personalizadas asistidas por Coach Virtual IA (Gemini). | **Terminada** |
| **SCRUM-36** | HU-20 Consultar rutina | Media | Como cliente, quiero visualizar mi rutina para seguir mi plan de entrenamiento. | **Terminada** |
| **SCRUM-35** | HU-21 Asignar rutina | Media | Como entrenador, quiero asignar rutinas para personalizar el entrenamiento de clientes. | **En curso** |
| **SCRUM-30** | HU-22 Consultar sesiones disponibles | Media | Como cliente, quiero consultar sesiones disponibles para seleccionar una. | **En curso** |
| **SCRUM-31** | HU-23 Registrar sesión | Media | Como cliente, quiero reservar una sesión para asistir al entrenamiento (QR y correo). | **Terminada** |
| **SCRUM-32** | HU-24 Cancelar sesión | Baja | Como cliente, quiero cancelar una reserva para liberar mi lugar. | **Terminada** |
| **SCRUM-33** | HU-25 Consultar historial de sesiones | Baja | Como cliente, quiero revisar mis sesiones anteriores para llevar seguimiento de mi actividad. | **En curso** |
| **SCRUM-41** | HU-27 Ver estadísticas de asistencia | Media | Como administrador, quiero visualizar gráficas para analizar el comportamiento de clientes. | **Terminada** |
| **SCRUM-42** | HU-28 Ver ocupación por horario | Media | Como administrador, quiero conocer horarios más demandados para optimizar entrenadores. | **En curso** |
| **SCRUM-43** | HU-29 Consultar métricas generales | Alta | Como administrador, quiero visualizar indicadores clave para apoyar la toma de decisiones. | **En curso** |

---

### Backlog General (Sin Sprint asignado)
| Clave | Título / HU | Prioridad | Historia de Usuario | Estado Real |
| :--- | :--- | :--- | :--- | :--- |
| **SCRUM-23** | HU-09 Administración de usuarios | Muy Baja | Como administrador, quiero gestionar usuarios para controlar el acceso al sistema. | **En curso** |
| **SCRUM-39** | HU-14 Notificar vencimientos | Alta | Como administrador, quiero recibir alertas de vencimiento para contactar a los clientes (correo/SMS). | **En curso** |
| **SCRUM-37** | HU-19 Modificar rutina | Baja | Como entrenador, quiero actualizar rutinas para adaptarlas al progreso del cliente. | **En curso** |
| **SCRUM-44** | HU-26 Visualizar sesiones en tiempo real | Baja | Como administrador, quiero monitorear sesiones activas para gestionar recursos humanos. | **Pendiente** |
| **SCRUM-49** | Tarea de prueba | Media | Tarea de prueba inicial de Jira. | **Pendiente** |