import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1920, 1080

# Colores institucionales
COLOR_BG = (248, 250, 252)
COLOR_SURFACE = (255, 255, 255)
COLOR_SURFACE_SEC = (241, 245, 249)
COLOR_TEXT = (15, 23, 42)
COLOR_TEXT_MUTED = (100, 116, 139)
COLOR_PRIMARY = (15, 118, 110)
COLOR_PRIMARY_LIGHT = (204, 251, 241)
COLOR_ACCENT = (16, 185, 129)
COLOR_ACCENT_LIGHT = (209, 250, 229)
COLOR_BORDER = (226, 232, 240)
COLOR_DANGER = (239, 68, 68)
COLOR_DANGER_LIGHT = (254, 226, 226)

FONT_PATH_REG = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
FONT_PATH_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
FONT_PATH_MONO = "/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf"

def f_reg(sz):
    return ImageFont.truetype(FONT_PATH_REG, sz)

def f_bold(sz):
    return ImageFont.truetype(FONT_PATH_BOLD, sz)

def f_mono(sz):
    return ImageFont.truetype(FONT_PATH_MONO, sz)

def draw_header(draw, kicker, title, sub, slide_num, total_slides, is_anexo=False):
    # Top banner bar
    draw.rectangle([(0, 0), (W, 70)], fill=COLOR_SURFACE)
    draw.line([(0, 70), (W, 70)], fill=COLOR_BORDER, width=2)
    
    # Left logo/tag
    draw.rectangle([(60, 18), (220, 52)], fill=COLOR_SURFACE_SEC, outline=COLOR_BORDER, width=1)
    draw.text((140, 35), "UAA · CCB · 9° B", fill=COLOR_PRIMARY, font=f_bold(16), anchor="mm")
    
    draw.text((240, 35), "espacioGYM (GROM 21) — Sustentación Oficial al Comité", fill=COLOR_TEXT, font=f_bold(18), anchor="lm")
    
    # Right slide counter & tag
    tag_bg = (254, 243, 199) if is_anexo else COLOR_PRIMARY_LIGHT
    tag_color = (180, 83, 9) if is_anexo else COLOR_PRIMARY
    tag_text = "🛡️ RESPALDO TÉCNICO" if is_anexo else "PRESENTACIÓN"
    
    draw.rectangle([(W - 380, 18), (W - 170, 52)], fill=tag_bg, outline=tag_color, width=1)
    draw.text((W - 275, 35), tag_text, fill=tag_color, font=f_bold(15), anchor="mm")
    
    draw.rectangle([(W - 150, 18), (W - 60, 52)], fill=COLOR_SURFACE_SEC, outline=COLOR_BORDER, width=1)
    draw.text((W - 105, 35), f"{slide_num} / {total_slides}", fill=COLOR_TEXT, font=f_mono(16), anchor="mm")

    # Title area
    draw.text((60, 105), kicker.upper(), fill=COLOR_PRIMARY, font=f_bold(18))
    draw.text((60, 135), title, fill=COLOR_TEXT, font=f_bold(38))
    draw.text((60, 185), sub, fill=COLOR_TEXT_MUTED, font=f_reg(22))
    draw.line([(60, 225), (W - 60, 225)], fill=COLOR_BORDER, width=2)

def draw_wrapped_text(draw, x, y, max_w, text, font, fill=COLOR_TEXT, line_spacing=6):
    words = text.split(" ")
    curr_line = []
    cy = y
    for word in words:
        test_line = " ".join(curr_line + [word])
        bbox = draw.textbbox((x, cy), test_line, font=font)
        if bbox[2] - x > max_w:
            if curr_line:
                draw.text((x, cy), " ".join(curr_line), fill=fill, font=font)
                cy += (bbox[3] - bbox[1]) + line_spacing
                curr_line = [word]
            else:
                draw.text((x, cy), test_line, fill=fill, font=font)
                cy += (bbox[3] - bbox[1]) + line_spacing
                curr_line = []
        else:
            curr_line.append(word)
    if curr_line:
        draw.text((x, cy), " ".join(curr_line), fill=fill, font=font)
        bbox = draw.textbbox((x, cy), " ".join(curr_line), font=font)
        cy += (bbox[3] - bbox[1]) + line_spacing
    return cy

slides = []

# ==============================================================================
# SLIDE 1: PORTADA
# ==============================================================================
im1 = Image.new("RGB", (W, H), COLOR_BG)
d1 = ImageDraw.Draw(im1)
# Header logos
d1.rectangle([(0, 0), (W, 100)], fill=COLOR_SURFACE)
d1.line([(0, 100), (W, 100)], fill=COLOR_BORDER, width=2)
d1.text((80, 50), "UNIVERSIDAD AUTÓNOMA DE AGUASCALIENTES", fill=COLOR_PRIMARY, font=f_bold(24), anchor="lm")
d1.text((W - 80, 50), "CENTRO DE CIENCIAS BÁSICAS · 2026", fill=COLOR_TEXT_MUTED, font=f_bold(20), anchor="rm")

# Hero Box
d1.rectangle([(80, 150), (380, 195)], fill=COLOR_PRIMARY_LIGHT, outline=COLOR_PRIMARY, width=1)
d1.text((230, 172), "PROYECTO DE TITULACIÓN / TESINA", fill=COLOR_PRIMARY, font=f_bold(18), anchor="mm")

d1.text((80, 240), "espacioGYM (GROM 21)", fill=COLOR_TEXT, font=f_bold(68))
p_lead = "Plataforma Web Progresiva y Microservicios Cloud con Inteligencia Artificial para la Gestión Integral, Control de Accesos y Retención de Socios en Centros Deportivos."
draw_wrapped_text(d1, 80, 330, 1700, p_lead, f_reg(28), fill=COLOR_TEXT_MUTED, line_spacing=12)

# 3 Pilares destacados
cx = 80
cw = (W - 160 - 40) // 3
pills = [
    ("📋 Control de Membresías", "Gestión contable, corte de vigencias exacto y alertas de cobranza sin hojas de cálculo."),
    ("📲 Check-in QR Dinámico", "Pase de acceso digital en el celular validado en < 120 ms sin filas en recepción."),
    ("🤖 Coach con Inteligencia Artificial", "Prescripción de rutinas adaptativas con Gemini API y contingencia heurística local.")
]
for idx, (p_title, p_desc) in enumerate(pills):
    px = cx + idx * (cw + 20)
    d1.rectangle([(px, 490), (px + cw, 750)], fill=COLOR_SURFACE, outline=COLOR_BORDER, width=2)
    d1.rectangle([(px, 490), (px + cw, 500)], fill=COLOR_PRIMARY)
    d1.text((px + 24, 540), p_title, fill=COLOR_TEXT, font=f_bold(24))
    draw_wrapped_text(d1, px + 24, 590, cw - 48, p_desc, f_reg(20), fill=COLOR_TEXT_MUTED, line_spacing=8)

# Footer metadata
d1.rectangle([(80, 790), (W - 80, 990)], fill=COLOR_SURFACE_SEC, outline=COLOR_BORDER, width=2)
d1.text((120, 830), "PROFESOR TITULAR:", fill=COLOR_TEXT_MUTED, font=f_bold(16))
d1.text((120, 860), "M. en C. Arturo Elías Ramírez", fill=COLOR_TEXT, font=f_bold(24))
d1.text((120, 910), "Seminario de Sistemas Computacionales II · 9° B", fill=COLOR_PRIMARY, font=f_bold(18))

d1.text((700, 830), "EQUIPO DE DESARROLLO GROM 21 (6 INTEGRANTES):", fill=COLOR_TEXT_MUTED, font=f_bold(16))
team_str_1 = "• Jose Alberto Vazquez Guerrero   • Luis Antonio García Gómez   • Yahir Guevara Cardona"
team_str_2 = "• Martin Alfonso Romo Martínez   • Ricardo Padilla Hernández   • Jesus Eduardo Tapia Avalos"
d1.text((700, 865), team_str_1, fill=COLOR_TEXT, font=f_bold(20))
d1.text((700, 905), team_str_2, fill=COLOR_TEXT, font=f_bold(20))

slides.append(im1)

# Helper para tarjetas en grid
def render_cards_slide(kicker, title, sub, cards, s_num, is_anexo=False):
    im = Image.new("RGB", (W, H), COLOR_BG)
    d = ImageDraw.Draw(im)
    draw_header(d, kicker, title, sub, s_num, 15, is_anexo=is_anexo)
    
    n = len(cards)
    pad = 60
    gap = 24
    cw = (W - 2 * pad - (n - 1) * gap) // n
    y0 = 260
    card_h = 720
    
    for i, c in enumerate(cards):
        cx = pad + i * (cw + gap)
        # Background
        bg = c.get("bg", COLOR_SURFACE)
        border = c.get("border", COLOR_BORDER)
        d.rectangle([(cx, y0), (cx + cw, y0 + card_h)], fill=bg, outline=border, width=2)
        
        # Color accent stripe
        if "stripe" in c:
            d.rectangle([(cx, y0), (cx + cw, y0 + 10)], fill=c["stripe"])
            
        # Icon / Badge
        if "badge" in c:
            d.text((cx + 28, y0 + 35), c["badge"], font=f_bold(32))
            
        # Title
        d.text((cx + 28, y0 + 95), c["title"], fill=COLOR_TEXT, font=f_bold(26))
        
        # Description
        draw_wrapped_text(d, cx + 28, y0 + 155, cw - 56, c["desc"], f_reg(21), fill=COLOR_TEXT_MUTED, line_spacing=10)
        
        # Metric callout
        if "metric" in c:
            my = y0 + card_h - 100
            d.line([(cx + 28, my), (cx + cw - 28, my)], fill=COLOR_BORDER, width=1)
            d.text((cx + 28, my + 15), c["metric"], fill=c.get("metric_color", COLOR_PRIMARY), font=f_mono(36))
            d.text((cx + 28, my + 60), c["metric_label"], fill=COLOR_TEXT_MUTED, font=f_bold(16))
            
    return im

# SLIDE 2: EL PROBLEMA
cards_s2 = [
    {"badge": "📉", "title": "Fuga de Cobros", "desc": "El 80% de gimnasios locales usa libretas o Excel. La falta de cálculo exacto de días y cortes provoca pérdidas mensuales de cuotas.", "metric": "18 - 25%", "metric_label": "INGRESOS PERDIDOS / MES", "border": COLOR_DANGER, "stripe": COLOR_DANGER},
    {"badge": "⏱️", "title": "Cuellos de Botella", "desc": "Búsqueda manual en listas de asistencia en recepción. Genera filas de hasta 10 min en hora pico y permite accesos con pagos vencidos.", "metric": "> 8 min", "metric_label": "ESPERA EN RECEPCIÓN", "border": COLOR_DANGER, "stripe": COLOR_DANGER},
    {"badge": "🏃", "title": "Alta Deserción", "desc": "Rutinas impresas genéricas y desatención de entrenadores. El socio se desmotiva al no tener guía adaptada a su capacidad.", "metric": "42%", "metric_label": "DESERCIÓN EN 90 DÍAS", "border": COLOR_DANGER, "stripe": COLOR_DANGER},
    {"badge": "💸", "title": "Software Costoso", "desc": "Sistemas privativos comerciales imponen rentas en dólares, comisiones por socio y hardware cerrado inaccesible para PyMEs.", "metric": "$350+ USD", "metric_label": "RENTA MENSUAL TÍPICA", "border": COLOR_DANGER, "stripe": COLOR_DANGER}
]
slides.append(render_cards_slide("01 · Diagnóstico de Mercado", "La Realidad Operativa de los Gimnasios PyME", "Cuatro problemas estructurales que ahogan la rentabilidad y experiencia en centros deportivos locales.", cards_s2, 2))

# SLIDE 3: LA SOLUCIÓN
im3 = Image.new("RGB", (W, H), COLOR_BG)
d3 = ImageDraw.Draw(im3)
draw_header(d3, "02 · Propuesta de Valor", "La Solución: espacioGYM (GROM 21)", "Un ecosistema integral multidispositivo sin costo de licenciamiento que democratiza la tecnología fitness.", 3, 15)
cards_s3_col = [
    ("📱 Plataforma Web Progresiva (PWA)", "Acceso inmediato desde cualquier smartphone o laptop sin pasar por tiendas de aplicaciones. Instalable, veloz y con soporte offline."),
    ("⚡ Microservicios Cloud y Persistencia Local", "Backend desacoplado en Node.js 22 LTS y SQLite 3 en modo WAL. Latencias < 120 ms con costo de servidor prácticamente nulo."),
    ("🧠 Inteligencia Artificial Adaptativa", "Asistente conectado con Gemini API que prescribe entrenamientos personalizados según metas, tiempo y condición física.")
]
for idx, (t, d) in enumerate(cards_s3_col):
    cy = 260 + idx * 240
    d3.rectangle([(60, cy), (1000, cy + 210)], fill=COLOR_SURFACE, outline=COLOR_BORDER, width=2)
    d3.rectangle([(60, cy), (1000, cy + 8)], fill=COLOR_PRIMARY)
    d3.text((90, cy + 35), t, fill=COLOR_TEXT, font=f_bold(26))
    draw_wrapped_text(d3, 90, cy + 85, 870, d, f_reg(21), fill=COLOR_TEXT_MUTED, line_spacing=8)

# Mockup right
try:
    img_mock = Image.open("/home/yahir/3SEMINARIO/cartel_presentacion/assets/shot_large_02_planes.png")
    img_mock.thumbnail((800, 700))
    im3.paste(img_mock, (1050, 260))
except Exception as e:
    d3.rectangle([(1050, 260), (W - 60, 950)], fill=COLOR_SURFACE_SEC, outline=COLOR_BORDER, width=2)
slides.append(im3)

# SLIDE 4: 3 PILARES
cards_s4 = [
    {"badge": "📋", "title": "Pilar 1: Membresías y Cobros", "desc": "Automatización del catálogo de planes, corte en días naturales, estados de cuenta y recibos transaccionales por correo.", "metric": "100%", "metric_label": "CÁLCULO AUTOMÁTICO", "stripe": COLOR_PRIMARY},
    {"badge": "📲", "title": "Pilar 2: Check-in QR Dinámico", "desc": "Generación de pase de acceso digital en el teléfono del socio. Validación instantánea y aforo en tiempo real.", "metric": "< 120 ms", "metric_label": "TIEMPO DE VALIDACIÓN", "stripe": COLOR_ACCENT},
    {"badge": "🤖", "title": "Pilar 3: Coach Virtual IA", "desc": "Rutinas generadas con Gemini API según nivel y objetivos, con contingencia heurística local ante caídas de internet.", "metric": "1.8 s", "metric_label": "GENERACIÓN RUTINA IA", "stripe": (139, 92, 246)}
]
slides.append(render_cards_slide("03 · Módulos Centrales", "Los 3 Pilares del Ecosistema espacioGYM", "Resolviendo las tres áreas críticas del negocio deportivo con software de clase mundial.", cards_s4, 4))

# SLIDE 5: EXPERIENCIA DUAL
im5 = Image.new("RGB", (W, H), COLOR_BG)
d5 = ImageDraw.Draw(im5)
draw_header(d5, "04 · Interfaces de Usuario", "Experiencia Dual: El Socio y el Administrador", "Diseñado tanto para la comodidad del socio móvil como para la productividad del dueño del negocio.", 5, 15)
# Socio side
d5.rectangle([(60, 260), (930, 970)], fill=COLOR_SURFACE, outline=COLOR_BORDER, width=2)
d5.rectangle([(60, 260), (930, 268)], fill=COLOR_PRIMARY)
d5.text((90, 290), "📱 VISTA DEL SOCIO (MÓVIL PWA)", fill=COLOR_PRIMARY, font=f_bold(24))
try:
    img_qr = Image.open("/home/yahir/3SEMINARIO/cartel_presentacion/assets/shot_large_04_qr.png")
    img_qr.thumbnail((800, 420))
    im5.paste(img_qr, (90, 340))
except Exception:
    pass
draw_wrapped_text(d5, 90, 780, 780, "• Pase de acceso con Código QR dinámico en pantalla.\n• Consulta de vigencia de membresía y días restantes.\n• Chat con el Coach IA para prescribir su rutina del día.", f_reg(21), fill=COLOR_TEXT, line_spacing=8)

# Admin side
d5.rectangle([(990, 260), (W - 60, 970)], fill=COLOR_SURFACE, outline=COLOR_BORDER, width=2)
d5.rectangle([(990, 260), (W - 60, 268)], fill=COLOR_ACCENT)
d5.text((1020, 290), "🖥️ VISTA DEL ADMINISTRADOR (DASHBOARD)", fill=COLOR_ACCENT, font=f_bold(24))
try:
    img_admin = Image.open("/home/yahir/3SEMINARIO/cartel_presentacion/assets/shot_large_06_analitica.png")
    img_admin.thumbnail((800, 420))
    im5.paste(img_admin, (1020, 340))
except Exception:
    pass
draw_wrapped_text(d5, 1020, 780, 780, "• Monitoreo de aforo y asistencias en tiempo real.\n• Alertas de socios por vencer para cobranza oportuna.\n• Analítica de horas pico para optimizar entrenadores.", f_reg(21), fill=COLOR_TEXT, line_spacing=8)

slides.append(im5)

# SLIDE 6: DEMO EN VIVO
im6 = Image.new("RGB", (W, H), COLOR_BG)
d6 = ImageDraw.Draw(im6)
draw_header(d6, "05 · Demostración Práctica", "Demostración Funcional del Sistema en Vivo", "El software se encuentra desplegado y 100% operativo en producción en la nube.", 6, 15)
# Left box
d6.rectangle([(60, 260), (920, 970)], fill=(4, 47, 46), outline=COLOR_BORDER, width=2)
d6.text((100, 300), "🌐 DESPLIEGUE EN SERVIDORES CLOUD", fill=(94, 234, 212), font=f_bold(20))
d6.text((100, 340), "PWA Operativa en Tiempo Real", fill=(255, 255, 255), font=f_bold(38))
draw_wrapped_text(d6, 100, 410, 760, "Invitamos al comité a observar el flujo completo en vivo: inicio de sesión, escaneo de pase de acceso, consulta de planes y consulta interactiva con el Coach IA generativo.", f_reg(24), fill=(148, 163, 184), line_spacing=12)

d6.rectangle([(100, 560), (860, 640)], fill=(15, 23, 42), outline=(94, 234, 212), width=2)
d6.text((120, 585), "🔗 https://jefazo-isc.github.io/GymSeminario/", fill=(94, 234, 212), font=f_mono(24))

d6.rectangle([(100, 680), (860, 880)], fill=(15, 23, 42), outline=COLOR_BORDER, width=1)
d6.text((120, 710), "FLUJO A DEMOSTRAR:", fill=(94, 234, 212), font=f_bold(18))
flow_txt = "1. Registro de socio con cálculo de membresía.\n2. Generación instantánea de pase QR.\n3. Prescripción de rutina hiper-personalizada con IA en 1.8 s.\n4. Reflejo de asistencia en panel del administrador."
draw_wrapped_text(d6, 120, 745, 710, flow_txt, f_reg(20), fill=(226, 232, 240), line_spacing=8)

# Right image
try:
    img_ai = Image.open("/home/yahir/3SEMINARIO/cartel_presentacion/assets/05_asistente_coach_ia.png")
    img_ai.thumbnail((880, 650))
    im6.paste(img_ai, (980, 260))
except Exception:
    pass
slides.append(im6)

# SLIDE 7: IA GENERATIVA
cards_s7 = [
    {"badge": "🧠", "title": "Prescripción Adaptativa", "desc": "Analiza nivel, objetivo (hipertrofia, definición, fuerza) y tiempo disponible para armar series, repeticiones y descansos.", "metric": "Personalizada", "metric_label": "SEGÚN PERFIL FÍSICO", "stripe": (67, 56, 202)},
    {"badge": "🛡️", "title": "Arquitectura Dual", "desc": "Si la API de Gemini agota tokens o hay falla de red, un Circuit Breaker activa el motor heurístico local sin interrumpir al socio.", "metric": "Alta Disp.", "metric_label": "CIRCUIT BREAKER", "stripe": COLOR_ACCENT},
    {"badge": "📈", "title": "Mayor Retención", "desc": "El socio ya no entrena a ciegas ni se frustra. El seguimiento continuo aumenta la adherencia al ejercicio.", "metric": "> 30%", "metric_label": "REDUCCIÓN DE ABANDONO", "stripe": COLOR_PRIMARY}
]
slides.append(render_cards_slide("06 · Innovación Tecnológica", "Inteligencia Artificial Aplicada al Acondicionamiento", "Transformando una rutina genérica en un plan personalizado sin costo de contratación extra.", cards_s7, 7))

# SLIDE 8: RESULTADOS Y LOGROS
cards_s8 = [
    {"badge": "⚡", "title": "Latencia p95", "desc": "Tiempo de respuesta bajo concurrencia de 100 tx/min gracias a SQLite en modo WAL.", "metric": "118 ms", "metric_label": "LATENCIA P95", "stripe": COLOR_ACCENT},
    {"badge": "🧪", "title": "Pruebas Karma", "desc": "156 especificaciones unitarias automatizadas ejecutadas sin fallas en Chrome Headless.", "metric": "84.3%", "metric_label": "156 SPECS VERDES", "stripe": COLOR_PRIMARY},
    {"badge": "🐳", "title": "Docker Ligero", "desc": "Compilación multi-stage sobre Alpine Linux y Nginx lista para orquestación en la nube.", "metric": "198 MB", "metric_label": "PESO DEL CONTENEDOR", "stripe": (37, 99, 235)},
    {"badge": "🔒", "title": "Seguridad SAST", "desc": "Cero secretos filtrados detectados por TruffleHog y Confiabilidad Grado A en SonarQube.", "metric": "0 Bugs", "metric_label": "GRADO A CONFIABILIDAD", "stripe": (16, 185, 129)}
]
slides.append(render_cards_slide("07 · Validación de Resultados", "Resultados Tangibles y Logros de Ingeniería", "Métricas cuantitativas que avalan la calidad, estabilidad y eficiencia del software terminado.", cards_s8, 8))

# SLIDE 9: CONCLUSIONES Y FUTURO
im9 = Image.new("RGB", (W, H), COLOR_BG)
d9 = ImageDraw.Draw(im9)
draw_header(d9, "08 · Cierre Académico", "Conclusiones y Viabilidad de Negocio", "El impacto de la ingeniería de software moderna en la competitividad de las pequeñas empresas.", 9, 15)
# Left
d9.rectangle([(60, 260), (930, 580)], fill=COLOR_SURFACE, outline=COLOR_PRIMARY, width=2)
d9.rectangle([(60, 260), (930, 268)], fill=COLOR_PRIMARY)
d9.text((90, 290), "Cumplimiento al 100% de los Objetivos", fill=COLOR_PRIMARY, font=f_bold(26))
draw_wrapped_text(d9, 90, 340, 800, "Se logró transicionar de una gestión manual a un ecosistema automatizado con persistencia ACID, control de aforo por QR y prescripción mediante IA, sin generar dependencia de proveedores extranjeros ni costos recurrentes de licenciamiento.", f_reg(23), fill=COLOR_TEXT, line_spacing=10)

d9.rectangle([(60, 620), (930, 950)], fill=COLOR_SURFACE, outline=COLOR_ACCENT, width=2)
d9.rectangle([(60, 620), (930, 628)], fill=COLOR_ACCENT)
d9.text((90, 650), "Viabilidad Económica para PyMEs", fill=COLOR_ACCENT, font=f_bold(26))
draw_wrapped_text(d9, 90, 700, 800, "Al basarse en herramientas de código abierto (Angular, SQLite, Docker, Node.js), el costo de mantenimiento del sistema es inferior al 5% del costo de cualquier solución comercial privativa, haciendo factible su adopción real en gimnasios de barrio.", f_reg(23), fill=COLOR_TEXT, line_spacing=10)

# Right
d9.rectangle([(990, 260), (W - 60, 950)], fill=COLOR_SURFACE_SEC, outline=COLOR_BORDER, width=2)
d9.text((1030, 300), "🚀 TRABAJO FUTURO (PRÓXIMOS PASOS)", fill=COLOR_PRIMARY, font=f_bold(26))
future_txt = "• Hardware IoT para Torniquetes Físicos:\n  Integración con microcontroladores ESP32 para apertura física de torniquetes y molinetes al validar el QR en recepción.\n\n• Publicación en Google Play Store:\n  Generación de paquetes AAB nativos mediante Capacitor Android para aumentar el alcance comercial.\n\n• Análisis Biométrico de Postura:\n  Uso de visión computacional para supervisar técnica de levantamiento de pesas en tiempo real."
draw_wrapped_text(d9, 1030, 360, 800, future_txt, f_reg(23), fill=COLOR_TEXT, line_spacing=10)
slides.append(im9)

# SLIDE 10: CIERRE Y QR
im10 = Image.new("RGB", (W, H), COLOR_BG)
d10 = ImageDraw.Draw(im10)
draw_header(d10, "09 · Cierre y Preguntas", "Agradecimientos y Sesión de Preguntas", "Agradecemos al Comité Evaluador por su atención y retroalimentación.", 10, 15)

d10.rectangle([(60, 260), (1050, 950)], fill=COLOR_SURFACE, outline=COLOR_BORDER, width=2)
d10.text((100, 310), "Estamos listos para sus preguntas.", fill=COLOR_TEXT, font=f_bold(38))
draw_wrapped_text(d10, 100, 380, 900, "El equipo cuenta con un banco de diapositivas de respaldo técnico que abarcan arquitectura de base de datos, pipeline de integración continua, seguridad y pruebas de carga.", f_reg(24), fill=COLOR_TEXT_MUTED, line_spacing=12)

d10.rectangle([(100, 520), (1000, 750)], fill=COLOR_SURFACE_SEC, outline=COLOR_BORDER, width=1)
d10.text((130, 550), "EQUIPO DE SUSTENTACIÓN GROM 21:", fill=COLOR_PRIMARY, font=f_bold(18))
d10.text((130, 595), "• Jose Alberto Vazquez Guerrero   • Luis Antonio García Gómez", fill=COLOR_TEXT, font=f_bold(22))
d10.text((130, 640), "• Yahir Guevara Cardona            • Martin Alfonso Romo Martínez", fill=COLOR_TEXT, font=f_bold(22))
d10.text((130, 685), "• Ricardo Padilla Hernández        • Jesus Eduardo Tapia Avalos", fill=COLOR_TEXT, font=f_bold(22))

d10.rectangle([(100, 800), (600, 870)], fill=COLOR_PRIMARY_LIGHT, outline=COLOR_PRIMARY, width=2)
d10.text((350, 835), "🛡️ ANEXO TÉCNICO LISTO (TECLA T)", fill=COLOR_PRIMARY, font=f_bold(20), anchor="mm")

# Right QR box
d10.rectangle([(1120, 260), (W - 60, 950)], fill=COLOR_SURFACE, outline=COLOR_PRIMARY, width=2)
d10.text((1490, 320), "¡Escanee y Pruebe la App Ahora!", fill=COLOR_TEXT, font=f_bold(28), anchor="mm")
d10.text((1490, 365), "Apunte la cámara de su celular al código QR:", fill=COLOR_TEXT_MUTED, font=f_reg(20), anchor="mm")
try:
    img_qr_big = Image.open("/home/yahir/3SEMINARIO/cartel_presentacion/assets/qr_demo.png")
    img_qr_big = img_qr_big.resize((360, 360))
    im10.paste(img_qr_big, (1310, 420))
except Exception:
    pass
d10.text((1490, 830), "jefazo-isc.github.io/GymSeminario", fill=COLOR_PRIMARY, font=f_mono(24), anchor="mm")

slides.append(im10)

# SLIDE 11: ANEXO - ARQUITECTURA
cards_s11 = [
    {"badge": "🅰️", "title": "Capa 1: Frontend PWA", "desc": "Angular 19.2 + TypeScript 5.6 con Standalone Components. Service Worker para caché offline y contenedor móvil con Capacitor.", "metric": "PWA Móvil", "metric_label": "ANGULAR 19", "stripe": COLOR_PRIMARY},
    {"badge": "⚙️", "title": "Capa 2: Backend REST & IA", "desc": "Node.js 22 LTS + Express sobre Render. Autenticación JWT con RBAC, rate-limiting perimetral y orquestador dual de IA.", "metric": "Node 22", "metric_label": "EXPRESS REST", "stripe": COLOR_ACCENT},
    {"badge": "💾", "title": "Capa 3: Persistencia Híbrida", "desc": "SQLite 3 en modo WAL para transacciones contables atómicas (ACID) + Firestore NoSQL para perfiles de usuario.", "metric": "WAL + NoSQL", "metric_label": "ARQUITECTURA HÍBRIDA", "stripe": (139, 92, 246)}
]
slides.append(render_cards_slide("🛡️ Respaldo Técnico · B1", "Arquitectura de Software de 3 Niveles", "Desacoplamiento limpio entre presentación PWA, lógica de negocio REST y persistencia políglota.", cards_s11, 11, is_anexo=True))

# SLIDE 12: ANEXO - SQLITE WAL
im12 = Image.new("RGB", (W, H), COLOR_BG)
d12 = ImageDraw.Draw(im12)
draw_header(d12, "🛡️ Respaldo Técnico · B2", "Persistencia Ligera y Concurrencia SQLite WAL", "Por qué SQLite 3 en modo Write-Ahead Logging es la elección de ingeniería óptima para PyMEs.", 12, 15, is_anexo=True)
d12.rectangle([(60, 260), (950, 580)], fill=COLOR_SURFACE, outline=COLOR_BORDER, width=2)
d12.text((90, 290), "Lectores y Escritores No Bloqueantes", fill=COLOR_TEXT, font=f_bold(26))
draw_wrapped_text(d12, 90, 340, 820, "En modo estándar, SQLite bloquea toda la base durante una escritura. Activando PRAGMA journal_mode = WAL, los lectores operan sin detenerse mientras las transacciones de pago se asientan secuencialmente en el log WAL.", f_reg(22), fill=COLOR_TEXT_MUTED, line_spacing=10)

d12.rectangle([(60, 620), (950, 950)], fill=COLOR_SURFACE, outline=COLOR_BORDER, width=2)
d12.text((90, 650), "Cero Latencia y Cero Costo de Infraestructura", fill=COLOR_TEXT, font=f_bold(26))
draw_wrapped_text(d12, 90, 700, 820, "Una base externa en la nube (ej. AWS RDS / PostgreSQL) impone un costo mínimo de $25 USD/mes y suma 50 a 100 ms de latencia por petición de red. SQLite embebido corre con latencias < 2 ms sin factura mensual.", f_reg(22), fill=COLOR_TEXT_MUTED, line_spacing=10)

# Right code
d12.rectangle([(1010, 260), (W - 60, 950)], fill=(15, 23, 42), outline=COLOR_BORDER, width=2)
d12.text((1050, 300), "PRAGMAS DE CONFIGURACIÓN Y TABLA ACID:", fill=(94, 234, 212), font=f_bold(20))
code_sql = """PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
PRAGMA foreign_keys = ON;

-- Tabla Transaccional de Cobros (ACID)
CREATE TABLE membresias_transacciones (
  folio TEXT PRIMARY KEY,
  socio_id TEXT NOT NULL,
  monto REAL NOT NULL,
  fecha_pago TEXT NOT NULL,
  corte_vigencia TEXT NOT NULL,
  estado TEXT CHECK(estado IN ('ACTIVO','VENCIDO'))
);

-- Índices B-Tree para consultas inmediatas (< 2 ms)
CREATE INDEX idx_socio_vigencia 
  ON membresias_transacciones(socio_id, corte_vigencia);"""
draw_wrapped_text(d12, 1050, 350, 800, code_sql, f_mono(21), fill=(94, 234, 212), line_spacing=12)
slides.append(im12)

# SLIDE 13: ANEXO - CI/CD
im13 = Image.new("RGB", (W, H), COLOR_BG)
d13 = ImageDraw.Draw(im13)
draw_header(d13, "🛡️ Respaldo Técnico · B3", "Pipeline CI/CD Automatizado en GitHub Actions", "5 Compuertas de calidad y despliegue continuo ejecutadas en menos de 3.5 minutos.", 13, 15, is_anexo=True)
jobs_txt = [
    ("1. Build & Lint (Angular AOT)", "Compilación anticipada sin errores de tipado + ESLint estricto."),
    ("2. Pruebas Unitarias Karma (84.3%)", "156 specs ejecutadas en Chrome Headless sobre Linux con cero fallas."),
    ("3. Pruebas de Integración HTTP", "Mocking riguroso de servicios HTTP para validar contratos de datos."),
    ("4. Seguridad SAST & TruffleHog", "Auditoría de dependencias npm audit y escaneo de credenciales en git."),
    ("5. Empaquetado Docker y Despliegue", "Construcción de imagen OCI a GHCR y publicación en GitHub Pages.")
]
for idx, (jt, jd) in enumerate(jobs_txt):
    cy = 260 + idx * 140
    d13.rectangle([(60, cy), (920, cy + 120)], fill=COLOR_SURFACE, outline=COLOR_BORDER, width=2)
    d13.rectangle([(60, cy), (920, cy + 6)], fill=COLOR_PRIMARY)
    d13.text((90, cy + 25), jt, fill=COLOR_TEXT, font=f_bold(24))
    d13.text((90, cy + 65), jd, fill=COLOR_TEXT_MUTED, font=f_reg(19))

try:
    img_gh = Image.open("/home/yahir/3SEMINARIO/cartel_presentacion/assets/real_github_actions.png")
    img_gh.thumbnail((900, 700))
    im13.paste(img_gh, (970, 260))
except Exception:
    pass
slides.append(im13)

# SLIDE 14: ANEXO - SEGURIDAD
cards_s14 = [
    {"badge": "🔐", "title": "Autenticación y Cifrado", "desc": "Cifrado TLS 1.3 forzado en tránsito (HTTPS). Contraseñas con bcrypt a 12 rondas. Tokens JWT con HMAC-SHA256 y expiración de 24h.", "metric": "TLS 1.3", "metric_label": "HTTPS FORZADO", "stripe": COLOR_PRIMARY},
    {"badge": "🛡️", "title": "Defensa Perimetral", "desc": "express-rate-limit contra ataques de fuerza bruta en login. Encabezados HTTP de seguridad (CSP, HSTS) y sanitización contra SQLi y XSS.", "metric": "Anti-DDoS", "metric_label": "RATE LIMITING", "stripe": COLOR_ACCENT},
    {"badge": "🔍", "title": "DevSecOps Continuo", "desc": "TruffleHog escaneando cada commit para impedir fuga de secretos. Cero vulnerabilidades críticas o altas detectadas por npm audit.", "metric": "0 Secretos", "metric_label": "TRUFFLEHOG VERDE", "stripe": (16, 185, 129)}
]
slides.append(render_cards_slide("🛡️ Respaldo Técnico · B4", "Estrategia de Seguridad y Protección de Datos", "Defensa en profundidad y mitigación del OWASP Top 10 aplicada al entorno fitness.", cards_s14, 14, is_anexo=True))

# SLIDE 15: ANEXO - MOVIL & DOCKER
im15 = Image.new("RGB", (W, H), COLOR_BG)
d15 = ImageDraw.Draw(im15)
draw_header(d15, "🛡️ Respaldo Técnico · B5", "Empaquetado Nativo Capacitor y Docker Multi-Stage", "Distribución ligera y reproducible tanto en dispositivos móviles Android como en servidores de nube.", 15, 15, is_anexo=True)

# Left Capacitor
d15.rectangle([(60, 260), (930, 950)], fill=COLOR_SURFACE, outline=COLOR_PRIMARY, width=2)
d15.rectangle([(60, 260), (930, 268)], fill=COLOR_PRIMARY)
d15.text((100, 300), "📱 EMPAQUETADO NATIVO CAPACITOR 7", fill=COLOR_PRIMARY, font=f_bold(26))
cap_txt = "• Identificador de paquete: mx.uaa.espaciogym.grom21\n• Target SDK: 35 (Android 15) | Min SDK: 23 (Android 6.0)\n• Acceso nativo al hardware:\n   - Cámara para escaneo de códigos QR.\n   - Splash screen nativo y barra de estado con tema dinámico.\n• Compilación automatizada en pipeline:\n   .github/workflows/android-apk.yml"
draw_wrapped_text(d15, 100, 360, 800, cap_txt, f_reg(24), fill=COLOR_TEXT, line_spacing=14)

# Right Docker
d15.rectangle([(990, 260), (W - 60, 950)], fill=COLOR_SURFACE, outline=(37, 99, 235), width=2)
d15.rectangle([(990, 260), (W - 60, 268)], fill=(37, 99, 235))
d15.text((1030, 300), "🐳 CONTENEDOR DOCKER MULTI-STAGE", fill=(37, 99, 235), font=f_bold(26))
dock_txt = "• Optimización de imagen en 2 fases:\n   - Stage 1 (Build): Node.js 22 Alpine compila Angular AOT.\n   - Stage 2 (Runtime): Nginx Alpine ultra-ligero aloja los bundles.\n• Reducción de tamaño del 82%:\n   De 1.1 GB en build convencional a solo 198 MB finales.\n• Calidad y reproducibilidad garantizada en cualquier nube."
draw_wrapped_text(d15, 1030, 360, 800, dock_txt, f_reg(24), fill=COLOR_TEXT, line_spacing=14)

slides.append(im15)

# Guardar todas las diapositivas en un único PDF 16:9 de alta resolución
pdf_path = "/home/yahir/3SEMINARIO/presentacion_comite_16x9.pdf"
slides[0].save(pdf_path, "PDF", resolution=100.0, save_all=True, append_images=slides[1:])
print(f"Generado exitosamente: {pdf_path} ({len(slides)} diapositivas)")
