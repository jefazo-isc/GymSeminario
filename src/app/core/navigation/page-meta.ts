export interface PageMeta {
  title: string;
  section: string;
  description: string;
  parent?: { label: string; url: string };
  hidden?: boolean;
}
const gym = { label: "El gimnasio", url: "/servicio" };
const member = { label: "Mi espacio", url: "/micuenta" };
const admin = { label: "Administración", url: "/graficos" };
export const PAGE_META: Record<string, PageMeta> = {
  home: {
    title: "Encuentra tu ritmo",
    section: "Inicio",
    description: "",
    hidden: true,
  },
  nosotros: {
    title: "Un gimnasio cerca de ti.",
    section: "Nuestra historia",
    description: "Entrenar, compartir y avanzar. Así entendemos el movimiento.",
    parent: gym,
  },
  servicio: {
    title: "Distintas formas de moverte.",
    section: "Servicios",
    description:
      "Encuentra una actividad que encaje con tu ritmo y tus objetivos.",
  },
  carrusel: {
    title: "Conoce tu próximo espacio.",
    section: "Instalaciones",
    description: "Un recorrido por las fotografías disponibles de GROM 21.",
    parent: gym,
  },
  ubicacion: {
    title: "Nos vemos en el gimnasio.",
    section: "Ubicación y horarios",
    description: "Encuentra GROM 21 en Jesús María, Aguascalientes.",
    parent: gym,
  },
  responsables: {
    title: "Las personas detrás del proyecto.",
    section: "Equipo",
    description: "Desarrollo y diseño del proyecto académico GymSeminario.",
    parent: gym,
  },
  redes: {
    title: "También nos movemos aquí.",
    section: "Comunidad",
    description: "Conecta con los canales oficiales del gimnasio.",
    parent: gym,
  },
  buscar: {
    title: "Encuentra tu próxima clase.",
    section: "Cursos",
    description: "Explora el catálogo informativo y conoce cada actividad.",
  },
  detalle: {
    title: "Conoce la actividad.",
    section: "Detalle del curso",
    description: "Información del catálogo de clases.",
    parent: { label: "Cursos", url: "/buscar" },
  },
  ejercicios: {
    title: "Entrena con intención.",
    section: "Biblioteca de ejercicios",
    description:
      "Busca movimientos por grupo muscular y equipo. Una guía para acompañar tu entrenamiento.",
  },
  videos: {
    title: "Mira. Aprende. Muévete.",
    section: "Guías en video",
    description:
      "Selecciona una guía para cargar su reproductor. Tú decides cuándo empezar.",
    parent: { label: "Ejercicios", url: "/ejercicios" },
  },
  membresias: {
    title: "Elige cómo quieres entrenar.",
    section: "Membresías",
    description: "Consulta tu vigencia y compara las opciones del catálogo.",
  },
  micuenta: {
    title: "Tu espacio, a tu medida.",
    section: "Mi cuenta",
    description:
      "Identidad, preferencias y datos para acompañar tu entrenamiento.",
  },
  f2: {
    title: "Haz espacio para entrenar.",
    section: "Agendar entrenamiento",
    description:
      "Elige actividad, fecha y turno. Revisa tu selección antes de registrarla.",
    parent: member,
  },
  f3: {
    title: "Cada visita cuenta.",
    section: "Registrar asistencia",
    description: "Registra clase, fecha y hora en el sistema de asistencias.",
    parent: member,
  },
  actividad: {
    title: "Tu movimiento, en perspectiva.",
    section: "Mi actividad",
    description: "Sesiones, horarios y alertas en un mismo lugar.",
    parent: member,
  },
  "estado-cuenta": {
    title: "Tus movimientos, claros.",
    section: "Estado de cuenta",
    description: "Consulta saldos, anotaciones e historial de la demostración.",
    parent: member,
  },
  "coach-ia": {
    title: "Un poco de guía para avanzar.",
    section: "Coach virtual",
    description:
      "Configura tu perfil, solicita una rutina o conversa con un coach.",
    parent: member,
  },
  productos: {
    title: "Completa tu entrenamiento.",
    section: "Productos",
    description:
      "Explora el catálogo y revisa tu carrito antes de continuar a PayPal.",
  },
  "sign-in": {
    title: "Qué bueno tenerte de vuelta.",
    section: "Ingresar",
    description: "Accede a tu cuenta para continuar con tu entrenamiento.",
  },
  "sign-up": {
    title: "Tu siguiente paso empieza aquí.",
    section: "Crear cuenta",
    description: "Completa tus datos para registrar una cuenta en Firebase.",
  },
  change: {
    title: "Renueva tu acceso.",
    section: "Cambiar contraseña",
    description:
      "Verifica tus credenciales actuales antes de elegir una nueva contraseña.",
    parent: member,
  },
  phone: {
    title: "Tu acceso, por teléfono.",
    section: "Ingresar con SMS",
    description:
      "Verifica tu número para acceder mediante un código de un solo uso.",
  },
  sesion: {
    title: "Entra a tu espacio.",
    section: "Acceso alternativo",
    description:
      "Inicia sesión o crea una cuenta con los mismos servicios de identidad.",
  },
  form: {
    title: "Agenda local histórica.",
    section: "Demostración heredada",
    description:
      "Este recorrido utiliza almacenamiento del navegador; es independiente de Firebase.",
  },
  editar1: {
    title: "Agenda bajo control.",
    section: "Gestionar entrenamientos",
    description: "Consulta, filtra y edita registros de Firestore.",
    parent: admin,
  },
  editar2: {
    title: "Asistencias en orden.",
    section: "Gestionar asistencias",
    description: "Consulta y actualiza el registro de clases.",
    parent: admin,
  },
  graficos: {
    title: "Una mirada a las sesiones.",
    section: "Estadísticas",
    description:
      "Información de la API externa de estadísticas. Su disponibilidad depende del servicio remoto.",
  },
  footer: {
    title: "Sigamos en contacto.",
    section: "Enlaces y contacto",
    description: "Dirección, horarios y enlaces útiles del proyecto.",
  },
};
export function pageMetaFor(url: string): PageMeta | undefined {
  const parts = url.split(/[?#]/)[0].split("/").filter(Boolean);
  return PAGE_META[parts[0] === "auth" ? parts[1] : parts[0] || "home"];
}
