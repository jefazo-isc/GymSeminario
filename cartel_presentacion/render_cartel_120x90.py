import os
import math
from PIL import Image, ImageDraw, ImageFont

# =====================================================================
# CONFIGURACIÓN DEL LIENZO: 120cm x 90cm (1200mm x 900mm) - 4:3
# =====================================================================
# Medidas físicas: 120.0 cm x 90.0 cm (1200 mm x 900 mm)
# Resolución: 4 px/mm = 40 px/cm -> W = 4800 px, H = 3600 px (exacto 4:3)
# Margen perimetral de seguridad: 25 mm = 100 px libres en los 4 costados
# 1 pt = 1.4111 px (a 101.6 DPI)
# Conversión física: altura en cm = píxeles / 40.0
W = 4800
H = 3600

# Tipografías oficiales (Liberation Sans = sustituto métrico idéntico a Arial)
font_bold_path = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
font_reg_path = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
font_mono_path = "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf"

def pt_to_px(pt):
    return int(round(pt * 1.4111))

def f_bold(pt):
    return ImageFont.truetype(font_bold_path, pt_to_px(pt))

def f_reg(pt):
    return ImageFont.truetype(font_reg_path, pt_to_px(pt))

def f_mono(pt):
    return ImageFont.truetype(font_mono_path, pt_to_px(pt))

# =====================================================================
# PALETA OFICIAL TEMA CLARO (Tokens de src/styles/tokens.css)
# =====================================================================
COLOR_BG = "#f7f7f5"               # Fondo de lienzo (papel cálido de imprenta)
COLOR_SURFACE = "#ffffff"          # Contenedores blancos
COLOR_SURFACE_SEC = "#eff2f3"      # Superficies secundarias y alternancia de tablas
COLOR_BORDER = "#e1e4e8"           # Bordes suaves
COLOR_BORDER_STRONG = "#bac4cb"    # Bordes destacados
COLOR_TEXT = "#1f2937"             # Texto principal de alto contraste
COLOR_TEXT_SEC = "#5b6470"         # Texto secundario y leyendas
COLOR_ACCENT = "#375d67"           # Slate Teal distintivo de espacioGYM
COLOR_ACCENT_HOVER = "#294b54"     # Deep Slate Teal para cabeceras
COLOR_ACCENT_SOFT = "#eaf0f2"      # Tintes de pastillas
COLOR_UAA_GOLD = "#c89b27"         # Dorado Institucional UAA
COLOR_SUCCESS = "#35634c"          # Verde de aprobación y éxito CI/CD
COLOR_SUCCESS_SOFT = "#edf4ee"     # Fondo de validación
COLOR_CARD_HEADER = "#375d67"      # Encabezados de módulo

im = Image.new("RGB", (W, H), color=COLOR_BG)
draw = ImageDraw.Draw(im)

# =====================================================================
# FUNCIONES AUXILIARES DE DIBUJO
# =====================================================================
def draw_wrapped_text(draw, x, y, max_w, text, font, fill=COLOR_TEXT, line_spacing=12):
    words = text.split()
    lines = []
    curr = []
    for w in words:
        test_line = " ".join(curr + [w])
        if draw.textlength(test_line, font=font) <= max_w:
            curr.append(w)
        else:
            if curr:
                lines.append(" ".join(curr))
            curr = [w]
    if curr:
        lines.append(" ".join(curr))
    
    curr_y = y
    for line in lines:
        draw.text((x, curr_y), line, fill=fill, font=font)
        curr_y += font.size + line_spacing
    return curr_y

def draw_vector_arrow(draw, cx, cy, length=34, fill=COLOR_UAA_GOLD):
    hw = length // 2
    draw.rectangle([(cx - hw, cy - 3), (cx + hw - 10, cy + 3)], fill=fill)
    draw.polygon([(cx + hw - 10, cy - 10), (cx + hw, cy), (cx + hw - 10, cy + 10)], fill=fill)

def draw_card_header(draw, x, y, w, h, title, badge=None, accent=False):
    header_bg = COLOR_ACCENT_HOVER if accent else COLOR_CARD_HEADER
    draw.rectangle([(x, y), (x + w, y + h)], fill=header_bg)
    draw.rectangle([(x, y + h - 6), (x + w, y + h)], fill=COLOR_UAA_GOLD)
    # Título de sección: 40 pt (56 px = 1.4 cm de altura real en la lona)
    draw.text((x + 30, y + h // 2), title.upper(), fill="#ffffff", font=f_bold(40), anchor="lm")
    if badge:
        font_b = f_bold(22)
        tw = draw.textlength(badge, font=font_b)
        bw = tw + 36
        bx = x + w - bw - 25
        by = y + 16
        bh = h - 32
        draw.rounded_rectangle([(bx, by), (bx + bw, by + bh)], radius=10, fill=COLOR_SURFACE, outline=COLOR_UAA_GOLD, width=2)
        draw.text((bx + bw // 2, by + bh // 2), badge, fill=COLOR_ACCENT_HOVER, font=font_b, anchor="mm")

# =====================================================================
# 1. CABECERA INSTITUCIONAL (y: 100 -> 790, altura: 690)
# =====================================================================
hdr_x, hdr_y, hdr_w, hdr_h = 100, 100, 4600, 690
draw.rounded_rectangle([(hdr_x, hdr_y), (hdr_x + hdr_w, hdr_y + hdr_h)], radius=20, fill=COLOR_SURFACE, outline=COLOR_BORDER, width=3)
draw.rectangle([(hdr_x + 20, hdr_y), (hdr_x + hdr_w - 20, hdr_y + 12)], fill=COLOR_ACCENT)
draw.rectangle([(hdr_x + 20, hdr_y + 12), (hdr_x + hdr_w - 20, hdr_y + 16)], fill=COLOR_UAA_GOLD)

# Logotipo Institucional Superior Izquierdo: UAA (Transparente PNG)
uaa_box_x, uaa_box_y, uaa_box_w, uaa_box_h = 135, 125, 480, 635
uaa_path = "/home/yahir/3SEMINARIO/cartel_presentacion/assets/logo_uaa.png"
if os.path.exists(uaa_path):
    uaa_img = Image.open(uaa_path).convert("RGBA")
    uaa_img.thumbnail((460, 520), Image.Resampling.LANCZOS)
    ox = uaa_box_x + (uaa_box_w - uaa_img.width) // 2
    oy = uaa_box_y + (uaa_box_h - uaa_img.height) // 2
    im.paste(uaa_img, (ox, oy), uaa_img)

# Logotipo Institucional Superior Derecho: GROM 21 Fitness (Entidad Vinculada)
grom_box_x, grom_box_y, grom_box_w, grom_box_h = hdr_x + hdr_w - 530, 125, 500, 635
draw.rounded_rectangle([(grom_box_x, grom_box_y + 100), (grom_box_x + grom_box_w, grom_box_y + 530)], radius=18, fill="#101214", outline=COLOR_ACCENT, width=4)
grom_path = "/home/yahir/3SEMINARIO/cartel_presentacion/assets/logo_grom21.jpg"
if os.path.exists(grom_path):
    grom_img = Image.open(grom_path).convert("RGB")
    grom_img.thumbnail((460, 390), Image.Resampling.LANCZOS)
    ox = grom_box_x + (grom_box_w - grom_img.width) // 2
    oy = (grom_box_y + 100) + (430 - grom_img.height) // 2
    im.paste(grom_img, (ox, oy))

# Contenido Tipográfico Central de Cabecera
cx = W // 2
# Adscripción institucional superior
draw.text((cx, 145), "UNIVERSIDAD AUTÓNOMA DE AGUASCALIENTES  •  CENTRO DE CIENCIAS BÁSICAS", fill=COLOR_UAA_GOLD, font=f_bold(32), anchor="mm")
draw.text((cx, 190), "DEPARTAMENTO DE SISTEMAS DE INFORMACIÓN  •  SEMINARIO DE SISTEMAS COMPUTACIONALES II (9° B)", fill=COLOR_TEXT_SEC, font=f_bold(26), anchor="mm")

# TÍTULO PRINCIPAL: Exactamente 14 palabras (<= 15 palabras exigidas por lineamientos UAA)
# Totalmente en MAYÚSCULAS, tipo Arial / Liberation Sans a 76 pt (2.68 cm de altura real por renglón)
# "PLATAFORMA WEB CON INTELIGENCIA ARTIFICIAL PARA LA GESTIÓN DE UN GIMNASIO: SCRUM Y DEVOPS" = 14 palabras exactas.
title_l1 = "PLATAFORMA WEB CON INTELIGENCIA ARTIFICIAL"
title_l2 = "PARA LA GESTIÓN DE UN GIMNASIO: SCRUM Y DEVOPS"
draw.text((cx, 275), title_l1, fill=COLOR_TEXT, font=f_bold(76), anchor="mm")
draw.text((cx, 375), title_l2, fill=COLOR_TEXT, font=f_bold(76), anchor="mm")

# Subtítulo y Caso de Estudio
sub_text = "PROYECTO INTEGRADOR: ESPACIOGYM (GROM 21)  •  ARTICULACIÓN DE NIVELES MESO Y MICRO"
draw.text((cx, 455), sub_text, fill=COLOR_ACCENT_HOVER, font=f_bold(28), anchor="mm")

# AUTORES Y FILIACIÓN (Regla Lineamientos: Nombres completos sin abreviaturas ni títulos + Adscripción + Tutor)
auth_bar_w, auth_bar_h = 3450, 215
auth_bar_x = (W - auth_bar_w) // 2
auth_bar_y = 515
draw.rounded_rectangle([(auth_bar_x, auth_bar_y), (auth_bar_x + auth_bar_w, auth_bar_y + auth_bar_h)], radius=16, fill=COLOR_SURFACE_SEC, outline=COLOR_BORDER_STRONG, width=2)

# Fila 1 Autores (Nombres completos oficiales sin abreviaturas ni títulos)
auth_row1 = "Autores:  Jose Alberto Vazquez Guerrero   •   Luis Antonio García Gómez   •   Yahir Guevara Cardona"
draw.text((cx, auth_bar_y + 45), auth_row1, fill=COLOR_TEXT, font=f_bold(25), anchor="mm")

# Fila 2 Autores
auth_row2 = "Martin Alfonso Romo Martínez   •   Ricardo Padilla Hernández   •   Jesús Eduardo Tapia Avalos"
draw.text((cx, auth_bar_y + 105), auth_row2, fill=COLOR_TEXT, font=f_bold(25), anchor="mm")

# Fila 3 Adscripción y Tutor
auth_row3 = "Departamento de Sistemas de Información  •  Universidad Autónoma de Aguascalientes  •  Tutor: M. en C. Arturo Elías Ramírez"
draw.text((cx, auth_bar_y + 168), auth_row3, fill=COLOR_UAA_GOLD, font=f_bold(24), anchor="mm")


# =====================================================================
# 2. CUERPO MODULAR EN 3 COLUMNAS (y: 815 -> 3080, altura: 2265)
# =====================================================================
col1_x, col1_w = 100, 1400
col2_x, col2_w = 1550, 1700
col3_x, col3_w = 3300, 1400

body_y = 815
card_top_h = 1025
card_bot_y = body_y + card_top_h + 25
card_bot_h = 1215


# =====================================================================
# 3. COLUMNA 1: INTRODUCCIÓN Y OBJETIVOS (Secciones 1 y 2 de Lineamientos)
# =====================================================================

# ----------------- SECCIÓN 1: INTRODUCCIÓN -----------------
draw.rounded_rectangle([(col1_x, body_y), (col1_x + col1_w, body_y + card_top_h)], radius=16, fill=COLOR_SURFACE, outline=COLOR_BORDER, width=3)
draw_card_header(draw, col1_x, body_y, col1_w, 80, "1. Introducción", "Diagnóstico y Contexto")

cy = body_y + 105
# Subencabezado: 30 pt (1.05 cm de alto en lona)
draw.rectangle([(col1_x + 30, cy), (col1_x + 40, cy + 36)], fill=COLOR_ACCENT)
draw.text((col1_x + 50, cy + 18), "PROBLEMÁTICA EN GIMNASIOS INDEPENDIENTES", fill=COLOR_ACCENT_HOVER, font=f_bold(30), anchor="lm")
cy += 54

# Viñetas concisas (26 pt = 0.93 cm de alto, lectura ágil sin muro de texto)
p_intro_1 = "• Fugas de ingresos (25%): La administración manual mediante libretas y hojas de cálculo sin sincronizar provoca pérdidas financieras por cobros extemporáneos y suplantación en accesos."
cy = draw_wrapped_text(draw, col1_x + 35, cy, col1_w - 70, p_intro_1, f_reg(26), fill=COLOR_TEXT, line_spacing=10) + 16

p_intro_2 = "• Deserción temprana (35%): La falta de planes de entrenamiento individualizados y seguimiento continuo ocasiona el abandono de usuarios durante los primeros 90 días."
cy = draw_wrapped_text(draw, col1_x + 35, cy, col1_w - 70, p_intro_2, f_reg(26), fill=COLOR_TEXT, line_spacing=10) + 24

# Subencabezado 2
draw.rectangle([(col1_x + 30, cy), (col1_x + 40, cy + 36)], fill=COLOR_ACCENT)
draw.text((col1_x + 50, cy + 18), "PROPUESTA DE SOLUCIÓN: ESPACIOGYM (GROM 21)", fill=COLOR_ACCENT_HOVER, font=f_bold(30), anchor="lm")
cy += 54

p_intro_3 = "• PWA reactiva con IA: Plataforma web en Angular 19.2 con persistencia ligera en SQLite 3 (WAL) y motor dual de Inteligencia Artificial (Gemini API + contingencia heurística local)."
cy = draw_wrapped_text(draw, col1_x + 35, cy, col1_w - 70, p_intro_3, f_reg(26), fill=COLOR_TEXT, line_spacing=10) + 26

# Diagrama de los 3 Niveles Arquitectónicos
diag_y = cy
diag_h = 130
draw.rounded_rectangle([(col1_x + 30, diag_y), (col1_x + col1_w - 30, diag_y + diag_h)], radius=14, fill=COLOR_SURFACE_SEC, outline=COLOR_BORDER_STRONG, width=2)
pills_data = [
    ("NIVEL MACRO (1-2)", "Marco Teórico e Industria", COLOR_ACCENT, col1_x + 50),
    ("NIVEL MESO (3)", "Scrum 8 Sprints y DevOps", COLOR_UAA_GOLD, col1_x + 490),
    ("NIVEL MICRO (4)", "Angular 19, SQLite y CI/CD", COLOR_SUCCESS, col1_x + 930)
]
pill_w = 420
for p_tag, p_desc, p_col, px in pills_data:
    draw.rounded_rectangle([(px, diag_y + 14), (px + pill_w, diag_y + diag_h - 14)], radius=10, fill=COLOR_SURFACE, outline=p_col, width=3)
    draw.text((px + pill_w // 2, diag_y + 44), p_tag, fill=p_col, font=f_bold(24), anchor="mm")
    draw.text((px + pill_w // 2, diag_y + 84), p_desc, fill=COLOR_TEXT, font=f_reg(22), anchor="mm")

draw_vector_arrow(draw, col1_x + 480, diag_y + diag_h // 2, length=24, fill=COLOR_ACCENT)
draw_vector_arrow(draw, col1_x + 920, diag_y + diag_h // 2, length=24, fill=COLOR_UAA_GOLD)

cy = diag_y + diag_h + 18

# Caja destacada de articulación
draw.rounded_rectangle([(col1_x + 30, cy), (col1_x + col1_w - 30, cy + 115)], radius=12, fill=COLOR_ACCENT_SOFT, outline=COLOR_ACCENT, width=2)
draw.rectangle([(col1_x + 30, cy), (col1_x + 40, cy + 115)], fill=COLOR_ACCENT)
hl_intro = "Articulación Metodológica: El Nivel Meso institucionaliza los acuerdos de trabajo y compuertas DoD, garantizando que el Nivel Micro despliegue software libre de errores y probado al 100%."
draw_wrapped_text(draw, col1_x + 55, cy + 18, col1_w - 105, hl_intro, f_bold(24), fill=COLOR_ACCENT_HOVER, line_spacing=8)


# ----------------- SECCIÓN 2: OBJETIVOS -----------------
draw.rounded_rectangle([(col1_x, card_bot_y), (col1_x + col1_w, card_bot_y + card_bot_h)], radius=16, fill=COLOR_SURFACE, outline=COLOR_BORDER, width=3)
draw_card_header(draw, col1_x, card_bot_y, col1_w, 80, "2. Objetivos", "Metas e Incrementos")

cy = card_bot_y + 105
# Objetivo General
draw.rectangle([(col1_x + 30, cy), (col1_x + 40, cy + 36)], fill=COLOR_ACCENT)
draw.text((col1_x + 50, cy + 18), "OBJETIVO GENERAL", fill=COLOR_ACCENT_HOVER, font=f_bold(30), anchor="lm")
cy += 50

p_obj_gen = "Diseñar, implementar y validar en producción la PWA espacioGYM articulada con Scrum y DevOps, optimizando membresías, accesos QR dinámicos y rutinas con IA sin costos fijos de hosting."
cy = draw_wrapped_text(draw, col1_x + 35, cy, col1_w - 70, p_obj_gen, f_reg(26), fill=COLOR_TEXT, line_spacing=9) + 20

# Objetivos Específicos
draw.rectangle([(col1_x + 30, cy), (col1_x + 40, cy + 36)], fill=COLOR_ACCENT)
draw.text((col1_x + 50, cy + 18), "OBJETIVOS ESPECÍFICOS", fill=COLOR_ACCENT_HOVER, font=f_bold(30), anchor="lm")
cy += 48

objs = [
    ("1", "Framework Ágil (Meso): Adaptar Scrum a 8 Sprints de dos semanas vinculando la DoD a la aprobación estricta de pruebas automatizadas."),
    ("2", "Pipeline CI/CD (Micro): Configurar GitHub Actions y Docker multi-etapa con cobertura > 80% y despliegue continuo en < 4 min."),
    ("3", "Persistencia Ligera: Integrar SQLite 3 en modo WAL y transacciones ACID atómicas, logrando latencias < 150 ms sin costo de hosting."),
    ("4", "Terminales QR y Motor IA: Validar check-in en tiempo real con QR seguro y prescripción de rutinas adaptativas con Gemini API.")
]
for num, text in objs:
    draw.ellipse([(col1_x + 35, cy + 2), (col1_x + 84, cy + 51)], fill=COLOR_ACCENT)
    draw.text((col1_x + 60, cy + 27), num, fill="#ffffff", font=f_bold(26), anchor="mm")
    cy = draw_wrapped_text(draw, col1_x + 100, cy, col1_w - 135, text, f_reg(25), fill=COLOR_TEXT, line_spacing=7) + 12

cy += 8
# Tabla de Sprints
draw.rectangle([(col1_x + 30, cy), (col1_x + 40, cy + 36)], fill=COLOR_ACCENT)
draw.text((col1_x + 50, cy + 18), "PLANIFICACIÓN ITERATIVA DE SPRINTS", fill=COLOR_ACCENT_HOVER, font=f_bold(30), anchor="lm")
cy += 48

tbl_y = cy
th_h, tr_h = 48, 46
draw.rectangle([(col1_x + 30, tbl_y), (col1_x + col1_w - 30, tbl_y + th_h)], fill=COLOR_ACCENT_HOVER)
draw.text((col1_x + 45, tbl_y + th_h // 2), "SPRINT", fill="#ffffff", font=f_bold(23), anchor="lm")
draw.text((col1_x + 230, tbl_y + th_h // 2), "ENFOQUE FUNCIONAL", fill="#ffffff", font=f_bold(23), anchor="lm")
draw.text((col1_x + 620, tbl_y + th_h // 2), "INCREMENTO ENTREGABLE VERIFICADO", fill="#ffffff", font=f_bold(23), anchor="lm")

sprints_data = [
    ("Sprint 1 - 2", "Arquitectura y Seguridad", "Auth JWT, Standalone Components y PWA"),
    ("Sprint 3 - 4", "Socios y Membresías", "CRUD socios, control pagos y catálogo planes"),
    ("Sprint 5 - 6", "Terminal QR y DB WAL", "Check-in por QR dinámico y SQLite 3 en WAL"),
    ("Sprint 7 - 8", "Motor IA y DevOps", "Asistente Gemini, Pipeline CI/CD y despliegue")
]
for idx, (sp, enf, inc) in enumerate(sprints_data):
    ry = tbl_y + th_h + idx * tr_h
    rbg = COLOR_SURFACE_SEC if idx % 2 == 0 else COLOR_SURFACE
    draw.rectangle([(col1_x + 30, ry), (col1_x + col1_w - 30, ry + tr_h)], fill=rbg, outline=COLOR_BORDER, width=1)
    draw.text((col1_x + 45, ry + tr_h // 2), sp, fill=COLOR_TEXT, font=f_bold(22), anchor="lm")
    draw.text((col1_x + 230, ry + tr_h // 2), enf, fill=COLOR_TEXT_SEC, font=f_reg(22), anchor="lm")
    draw.text((col1_x + 620, ry + tr_h // 2), inc, fill=COLOR_TEXT, font=f_reg(22), anchor="lm")

cy = tbl_y + th_h + len(sprints_data) * tr_h + 18
# Nota DoD
draw.rounded_rectangle([(col1_x + 30, cy), (col1_x + col1_w - 30, cy + 80)], radius=10, fill=COLOR_SURFACE_SEC, outline=COLOR_BORDER_STRONG, width=1)
draw.rectangle([(col1_x + 30, cy), (col1_x + 38, cy + 80)], fill=COLOR_ACCENT)
dod_note = "Criterio de Aceptación (DoD): Cada incremento de Sprint requirió 100% de compuertas aprobadas en CI/CD antes de la validación del Product Owner."
draw_wrapped_text(draw, col1_x + 55, cy + 15, col1_w - 105, dod_note, f_reg(24), fill=COLOR_TEXT, line_spacing=6)


# =====================================================================
# 4. COLUMNA 2 (CENTRAL): SECCIÓN 4 - ANÁLISIS DE RESULTADOS
# =====================================================================
col2_h = card_top_h + card_bot_h + 25
draw.rounded_rectangle([(col2_x, body_y), (col2_x + col2_w, body_y + col2_h)], radius=16, fill=COLOR_SURFACE, outline=COLOR_BORDER, width=3)
draw_card_header(draw, col2_x, body_y, col2_w, 80, "4. Análisis de Resultados", "Validación Empírica en Producción", accent=True)

c2y = body_y + 105

# 4 Tarjetas KPI Cuantitativas
kpi_w = (col2_w - 90) // 4
kpis = [
    ("100%", "CI/CD PASS RATE", COLOR_SUCCESS),
    ("84.3%", "COBERTURA TESTS", COLOR_ACCENT),
    ("118 ms", "LATENCIA API", COLOR_UAA_GOLD),   # Latencia unificada
    ("198 MB", "DOCKER SLIM", "#557363")
]
for idx, (val, lbl, col) in enumerate(kpis):
    kx = col2_x + 30 + idx * (kpi_w + 10)
    draw.rounded_rectangle([(kx, c2y), (kx + kpi_w, c2y + 130)], radius=14, fill=COLOR_SURFACE_SEC, outline=col, width=3)
    draw.text((kx + kpi_w // 2, c2y + 50), val, fill=col, font=f_bold(54), anchor="mm")
    draw.text((kx + kpi_w // 2, c2y + 100), lbl, fill=COLOR_TEXT, font=f_bold(24), anchor="mm")

c2y += 155

# Pipeline Arquitectónico de CI/CD (Flujo de Software)
draw.rectangle([(col2_x + 30, c2y), (col2_x + 40, c2y + 36)], fill=COLOR_ACCENT)
draw.text((col2_x + 50, c2y + 18), "ARQUITECTURA DEL PIPELINE DEVOPS (GITHUB ACTIONS)", fill=COLOR_ACCENT_HOVER, font=f_bold(30), anchor="lm")
c2y += 50

flow_w, flow_h = col2_w - 60, 105
draw.rounded_rectangle([(col2_x + 30, c2y), (col2_x + 30 + flow_w, c2y + flow_h)], radius=12, fill=COLOR_SURFACE_SEC, outline=COLOR_BORDER_STRONG, width=2)
pipeline_steps = [
    ("1. PUSH / PR", "Node 22 / Ubuntu", col2_x + 50),
    ("2. BUILD & LINT", "Angular 19 AOT", col2_x + 375),
    ("3. UNIT TESTS", "156 Karma Specs", col2_x + 710),
    ("4. SECURITY", "TruffleHog & Audit", col2_x + 1045),
    ("5. DOCKER & DEPLOY", "GHCR / Render / Pages", col2_x + 1385)
]
for title, desc, sx in pipeline_steps:
    draw.text((sx + 125, c2y + 38), title, fill=COLOR_ACCENT, font=f_bold(25), anchor="mm")
    draw.text((sx + 125, c2y + 74), desc, fill=COLOR_TEXT_SEC, font=f_reg(22), anchor="mm")
    if sx < col2_x + 1300:
        draw_vector_arrow(draw, sx + 290, c2y + 52, length=32, fill=COLOR_UAA_GOLD)

c2y += 130

# Gráficas y Evidencias Funcionales en Producción (2 Capturas Grandes de Alta Definición)
draw.rectangle([(col2_x + 30, c2y), (col2_x + 40, c2y + 36)], fill=COLOR_ACCENT)
draw.text((col2_x + 50, c2y + 18), "EVIDENCIAS FUNCIONALES EN PRODUCCIÓN (APARTADO 4.7.2)", fill=COLOR_ACCENT_HOVER, font=f_bold(30), anchor="lm")
c2y += 48

grid_item_w = (col2_w - 75) // 2
grid_item_h = 680

large_shots = [
    ("/home/yahir/3SEMINARIO/cartel_presentacion/assets/shot_large_06_analitica.png", "Dashboard de Analítica y Sesiones", "SQLite 3 en modo WAL • KPIs Financieros y Asistencia"),
    ("/home/yahir/3SEMINARIO/cartel_presentacion/assets/shot_large_04_qr.png", "Terminal de Validación por Código QR", "Validación Local en < 0.5 s • Criptografía QR Dinámico")
]

for idx, (path, cap, tag) in enumerate(large_shots):
    gx = col2_x + 30 + idx * (grid_item_w + 15)
    gy = c2y
    draw.rounded_rectangle([(gx, gy), (gx + grid_item_w, gy + grid_item_h)], radius=14, fill=COLOR_SURFACE, outline=COLOR_BORDER, width=2)
    
    caption_box_h = 100
    img_h = grid_item_h - caption_box_h - 4
    if os.path.exists(path):
        s_img = Image.open(path).convert("RGB")
        s_img = s_img.resize((grid_item_w - 4, img_h), Image.Resampling.LANCZOS)
        im.paste(s_img, (gx + 2, gy + 2))
    
    # Pie de foto en 2 renglones independientes (cero empalme garantizado)
    draw.rectangle([(gx, gy + grid_item_h - caption_box_h), (gx + grid_item_w, gy + grid_item_h)], fill=COLOR_SURFACE_SEC, outline=COLOR_BORDER, width=1)
    draw.rectangle([(gx, gy + grid_item_h - caption_box_h), (gx + grid_item_w, gy + grid_item_h - caption_box_h + 4)], fill=COLOR_ACCENT)
    draw.text((gx + 20, gy + grid_item_h - 62), cap, fill=COLOR_TEXT, font=f_bold(24), anchor="lm")
    draw.text((gx + 20, gy + grid_item_h - 24), tag, fill=COLOR_ACCENT_HOVER, font=f_bold(21), anchor="lm")

c2y += grid_item_h + 40

# Matriz de Rendimiento y Calidad de Software
draw.rectangle([(col2_x + 30, c2y), (col2_x + 40, c2y + 36)], fill=COLOR_ACCENT)
draw.text((col2_x + 50, c2y + 18), "MATRIZ DE RENDIMIENTO Y CALIDAD DE SOFTWARE", fill=COLOR_ACCENT_HOVER, font=f_bold(30), anchor="lm")
c2y += 48

th_h, tr_h = 54, 50
table_y = c2y
draw.rectangle([(col2_x + 30, table_y), (col2_x + col2_w - 30, table_y + th_h)], fill=COLOR_ACCENT_HOVER)
draw.text((col2_x + 45, table_y + th_h // 2), "INDICADOR / REQUISITO", fill="#ffffff", font=f_bold(23), anchor="lm")
draw.text((col2_x + 510, table_y + th_h // 2), "META DOD", fill="#ffffff", font=f_bold(23), anchor="lm")
draw.text((col2_x + 790, table_y + th_h // 2), "RESULTADO REAL", fill="#ffffff", font=f_bold(23), anchor="lm")
draw.text((col2_x + 1440, table_y + th_h // 2), "ESTADO", fill="#ffffff", font=f_bold(23), anchor="lm")

metrics_data = [
    ("Pipeline CI/CD", "100% compuertas", "Workflow #43121973 (5 Jobs Verde)", "APROBADO"),
    ("Cobertura Unit Tests", "≥ 80.0%", "84.3% (156 specs en Karma)", "APROBADO"),
    ("Quality Gate SonarQube", "0 vulnerabilidades", "0 críticas, Confiabilidad Grado A", "APROBADO"),
    ("Tiempo Despliegue CD", "< 5.0 min", "3 min 12 s (Render & GH Pages)", "APROBADO"),
    ("Concurrencia SQLite WAL", "Cero bloqueos", "100 tx/min (118 ms latencia p95)", "APROBADO"),
    ("Generación Rutinas IA", "< 3.0 s", "1.8 s (Gemini) / 0.2 s (Local)", "APROBADO"),
    ("Optimización Docker", "< 250 MB", "198 MB (Multi-stage Node + Nginx)", "APROBADO"),
    ("Seguridad SAST / Secrets", "0 credenciales", "0 secretos detectados (TruffleHog)", "APROBADO")
]
for idx, (ind, meta, res, est) in enumerate(metrics_data):
    row_y = table_y + th_h + idx * tr_h
    row_bg = COLOR_SURFACE_SEC if idx % 2 == 0 else COLOR_SURFACE
    draw.rectangle([(col2_x + 30, row_y), (col2_x + col2_w - 30, row_y + tr_h)], fill=row_bg, outline=COLOR_BORDER, width=1)
    draw.text((col2_x + 45, row_y + tr_h // 2), ind, fill=COLOR_TEXT, font=f_bold(22), anchor="lm")
    draw.text((col2_x + 510, row_y + tr_h // 2), meta, fill=COLOR_TEXT_SEC, font=f_reg(22), anchor="lm")
    draw.text((col2_x + 790, row_y + tr_h // 2), res, fill=COLOR_TEXT, font=f_reg(22), anchor="lm")
    draw.text((col2_x + 1440, row_y + tr_h // 2), est, fill=COLOR_SUCCESS, font=f_bold(22), anchor="lm")

c2y = table_y + th_h + len(metrics_data) * tr_h + 24

# Badges Duales de Calidad SonarQube y Karma
badge_card_w = (col2_w - 75) // 2
badge_h = 135
draw.rounded_rectangle([(col2_x + 30, c2y), (col2_x + 30 + badge_card_w, c2y + badge_h)], radius=12, fill=COLOR_SURFACE_SEC, outline=COLOR_BORDER_STRONG, width=2)
draw.text((col2_x + 50, c2y + 40), "QUALITY GATE SONARQUBE: PASS", fill=COLOR_SUCCESS, font=f_bold(24))
draw.text((col2_x + 50, c2y + 85), "0 Vulnerabilidades • 0 Hotspots • Confiabilidad Grado A", fill=COLOR_TEXT_SEC, font=f_reg(22))

bx2 = col2_x + 30 + badge_card_w + 15
draw.rounded_rectangle([(bx2, c2y), (bx2 + badge_card_w, c2y + badge_h)], radius=12, fill=COLOR_SURFACE_SEC, outline=COLOR_BORDER_STRONG, width=2)
draw.text((bx2 + 30, c2y + 40), "SUITE DE PRUEBAS UNITARIAS: 84.3%", fill=COLOR_ACCENT, font=f_bold(24))
draw.text((bx2 + 30, c2y + 85), "156 specs ejecutadas en Karma / Jasmine • 0 fallos", fill=COLOR_TEXT_SEC, font=f_reg(22))

c2y += badge_h + 24

# Franja de Validación DoD 4.7.2 con Salto de Línea
dod_h = 130
draw.rounded_rectangle([(col2_x + 30, c2y), (col2_x + col2_w - 30, c2y + dod_h)], radius=12, fill=COLOR_SUCCESS_SOFT, outline=COLOR_SUCCESS, width=2)
draw.rectangle([(col2_x + 30, c2y), (col2_x + 42, c2y + dod_h)], fill=COLOR_SUCCESS)
txt_dod = "Validación de Calidad DoD (Apartado 4.7.2): Compuertas de aseguramiento y evidencias funcionales verificadas al 100% sobre commit 3f08bb1 (0 fallos y 0 vulnerabilidades en SonarQube)."
draw_wrapped_text(draw, col2_x + 60, c2y + 26, col2_w - 120, txt_dod, f_bold(23), fill=COLOR_SUCCESS, line_spacing=8)


# =====================================================================
# 5. COLUMNA 3: SECCIÓN 3 - MÉTODO Y SECCIÓN 5 - DISCUSIÓN Y CONCLUSIONES
# =====================================================================

# ----------------- SECCIÓN 3: MÉTODO (METODOLOGÍA) -----------------
draw.rounded_rectangle([(col3_x, body_y), (col3_x + col3_w, body_y + card_top_h)], radius=16, fill=COLOR_SURFACE, outline=COLOR_BORDER, width=3)
draw_card_header(draw, col3_x, body_y, col3_w, 80, "3. Método", "Marco Metodológico y Stack")

c3y = body_y + 105
# Subencabezado: 30 pt
draw.rectangle([(col3_x + 30, c3y), (col3_x + 40, c3y + 36)], fill=COLOR_ACCENT)
draw.text((col3_x + 50, c3y + 18), "MARCO METODOLÓGICO HÍBRIDO (NIVEL MESO)", fill=COLOR_ACCENT_HOVER, font=f_bold(30), anchor="lm")
c3y += 54

p_m1 = "• Scrum en 8 Sprints: Gobernanza integral de equipo (Tapia: PO, Padilla: SM, Guevara: Lead Dev, García: Frontend/PWA, Romo: QA/Tests, Vazquez: DevOps/DB) y priorización MoSCoW (14 Must Have, 8 Should Have)."
c3y = draw_wrapped_text(draw, col3_x + 35, c3y, col3_w - 70, p_m1, f_reg(26), fill=COLOR_TEXT, line_spacing=10) + 16

p_m2 = "• DoD vinculada a CI/CD: Prohibición de integración a la rama main sin pruebas unitarias aprobadas (> 80%), análisis de vulnerabilidades en cero y build Docker exitoso."
c3y = draw_wrapped_text(draw, col3_x + 35, c3y, col3_w - 70, p_m2, f_reg(26), fill=COLOR_TEXT, line_spacing=10) + 24

# Subencabezado 2
draw.rectangle([(col3_x + 30, c3y), (col3_x + 40, c3y + 36)], fill=COLOR_ACCENT)
draw.text((col3_x + 50, c3y + 18), "STACK TECNOLÓGICO MICRO E INFRAESTRUCTURA", fill=COLOR_ACCENT_HOVER, font=f_bold(30), anchor="lm")
c3y += 54

# Pastillas Tecnológicas (24 pt)
pills_tech = ["Angular 19.2", "TypeScript 5.6", "Tailwind CSS", "Node.js 22 LTS", "Express REST", "SQLite 3 (WAL)", "Docker Multi-Stage", "GitHub Actions", "Karma / Jasmine", "Gemini Dual IA"]
curr_px, curr_py = col3_x + 35, c3y
for tp in pills_tech:
    tw = draw.textlength(tp, font=f_bold(24))
    if curr_px + tw + 28 > col3_x + col3_w - 35:
        curr_px = col3_x + 35
        curr_py += 50
    draw.rounded_rectangle([(curr_px, curr_py), (curr_px + tw + 28, curr_py + 42)], radius=8, fill=COLOR_ACCENT_SOFT, outline=COLOR_ACCENT, width=2)
    draw.text((curr_px + (tw + 28) // 2, curr_py + 21), tp, fill=COLOR_ACCENT_HOVER, font=f_bold(24), anchor="mm")
    curr_px += tw + 34

c3y = curr_py + 52

# Subencabezado 3: Persistencia Ligera y Despliegue en Contenedores
draw.rectangle([(col3_x + 30, c3y), (col3_x + 40, c3y + 36)], fill=COLOR_ACCENT)
draw.text((col3_x + 50, c3y + 18), "ARQUITECTURA DE PERSISTENCIA Y CONTENEDORES", fill=COLOR_ACCENT_HOVER, font=f_bold(30), anchor="lm")
c3y += 50

# Tarjeta Resumen Técnico de Arquitectura (Sustitución de bloques de código en lona)
arch_box_h = 220
draw.rounded_rectangle([(col3_x + 30, c3y), (col3_x + col3_w - 30, c3y + arch_box_h)], radius=12, fill=COLOR_SURFACE_SEC, outline=COLOR_BORDER_STRONG, width=2)
draw.rectangle([(col3_x + 30, c3y), (col3_x + 42, c3y + arch_box_h)], fill=COLOR_ACCENT)

p_wal = "• Persistencia SQLite 3 (WAL): Concurrencia optimizada mediante journal_mode=WAL y busy_timeout=5000ms. Soporta 100 tx/min concurrentes sin bloqueos ni costos fijos de servidores externos."
draw_wrapped_text(draw, col3_x + 60, c3y + 20, col3_w - 110, p_wal, f_reg(25), fill=COLOR_TEXT, line_spacing=7)

p_dkr = "• Contenedor Docker Slim (198 MB): Multi-stage build con Node 20 y Nginx Alpine. Reduce la imagen un 65% y habilita despliegues continuos automatizados en producción en solo 3 min 12 s."
draw_wrapped_text(draw, col3_x + 60, c3y + 115, col3_w - 110, p_dkr, f_reg(25), fill=COLOR_TEXT, line_spacing=7)
c3y += arch_box_h + 20


# ----------------- SECCIÓN 5: DISCUSIÓN Y CONCLUSIONES -----------------
draw.rounded_rectangle([(col3_x, card_bot_y), (col3_x + col3_w, card_bot_y + card_bot_h)], radius=16, fill=COLOR_SURFACE, outline=COLOR_BORDER, width=3)
draw_card_header(draw, col3_x, card_bot_y, col3_w, 80, "5. Discusión y Conclusiones", "Análisis y Cierre")

c3y = card_bot_y + 105
# Discusión Técnica (Según Guía de Cartel Científico en Cómputo)
draw.rectangle([(col3_x + 30, c3y), (col3_x + 40, c3y + 36)], fill=COLOR_ACCENT)
draw.text((col3_x + 50, c3y + 18), "DISCUSIÓN DE RENDIMIENTO Y ARQUITECTURA", fill=COLOR_ACCENT_HOVER, font=f_bold(30), anchor="lm")
c3y += 50

p_disc1 = "• Eficiencia computacional: La arquitectura SQLite WAL alcanzó latencias medias de 118 ms, reduciendo un 42% el tiempo de respuesta frente a SGDB cliente-servidor para gimnasios medianos."
c3y = draw_wrapped_text(draw, col3_x + 35, c3y, col3_w - 70, p_disc1, f_reg(26), fill=COLOR_TEXT, line_spacing=8) + 12

p_disc2 = "• Resiliencia y Coste Cero: El contenedor de 198 MB y la contingencia heurística local garantizan continuidad operativa total ante caídas de red externa sin costos de infraestructura."
c3y = draw_wrapped_text(draw, col3_x + 35, c3y, col3_w - 70, p_disc2, f_reg(26), fill=COLOR_TEXT, line_spacing=8) + 16

# Conclusiones
draw.rectangle([(col3_x + 30, c3y), (col3_x + 40, c3y + 36)], fill=COLOR_ACCENT)
draw.text((col3_x + 50, c3y + 18), "CONCLUSIONES PRINCIPALES", fill=COLOR_ACCENT_HOVER, font=f_bold(30), anchor="lm")
c3y += 44

ap1 = "• 1. Trazabilidad Meso-Micro: La sincronización entre acuerdos Scrum y compuertas CI/CD automatizadas erradicó regresiones en producción."
ap2 = "• 2. Viabilidad Tecnológica: Demostración empírica de SQLite WAL para aplicaciones comerciales concurrentes (100 tx/min)."
ap3 = "• 3. Validación de Objetivos: Plataforma desplegada y verificada al 100% de conformidad funcional bajo DoD (Apartado 4.7.2)."

c3y = draw_wrapped_text(draw, col3_x + 35, c3y, col3_w - 70, ap1, f_reg(26), fill=COLOR_TEXT, line_spacing=6) + 10
c3y = draw_wrapped_text(draw, col3_x + 35, c3y, col3_w - 70, ap2, f_reg(26), fill=COLOR_TEXT, line_spacing=6) + 10
c3y = draw_wrapped_text(draw, col3_x + 35, c3y, col3_w - 70, ap3, f_reg(26), fill=COLOR_TEXT, line_spacing=6) + 16

# Trabajo Futuro
draw.rectangle([(col3_x + 30, c3y), (col3_x + 40, c3y + 36)], fill=COLOR_ACCENT)
draw.text((col3_x + 50, c3y + 18), "LÍNEAS DE TRABAJO FUTURO", fill=COLOR_ACCENT_HOVER, font=f_bold(30), anchor="lm")
c3y += 42

fut1 = "• Integración con hardware IoT (torniquetes RFID / ESP32) mediante protocolo MQTT y sincronización biométrica."
fut2 = "• Escalabilidad horizontal nativa con clúster PostgreSQL para cadenas multi-sucursal manteniendo frontend Angular."
c3y = draw_wrapped_text(draw, col3_x + 35, c3y, col3_w - 70, fut1, f_reg(25), fill=COLOR_TEXT_SEC, line_spacing=5) + 8
c3y = draw_wrapped_text(draw, col3_x + 35, c3y, col3_w - 70, fut2, f_reg(25), fill=COLOR_TEXT_SEC, line_spacing=5) + 14

# Aprobación Institucional
draw.rounded_rectangle([(col3_x + 30, c3y), (col3_x + col3_w - 30, c3y + 115)], radius=12, fill=COLOR_ACCENT_SOFT, outline=COLOR_ACCENT, width=2)
draw.rectangle([(col3_x + 30, c3y), (col3_x + 42, c3y + 115)], fill=COLOR_UAA_GOLD)
ap_text = "Aprobación Institucional: Proyecto validado para sustentación pública y entrega final ante el comité evaluador del Centro de Ciencias Básicas de la Universidad Autónoma de Aguascalientes."
draw_wrapped_text(draw, col3_x + 60, c3y + 20, col3_w - 110, ap_text, f_bold(24), fill=COLOR_ACCENT_HOVER, line_spacing=7)


# =====================================================================
# 6. PIE DE PÁGINA: SECCIONES 6 Y 7 DE LINEAMIENTOS UAA (y: 3105 -> 3500)
# =====================================================================
foot_x, foot_y, foot_w, foot_h = 100, 3105, 4600, 395
draw.rounded_rectangle([(foot_x, foot_y), (foot_x + foot_w, foot_y + foot_h)], radius=20, fill=COLOR_SURFACE, outline=COLOR_BORDER, width=3)
draw.rectangle([(foot_x + 20, foot_y), (foot_x + foot_w - 20, foot_y + 8)], fill=COLOR_ACCENT)
draw.rectangle([(foot_x + 20, foot_y + 8), (foot_x + foot_w - 20, foot_y + 12)], fill=COLOR_UAA_GOLD)

# ---------------------------------------------------------------------
# COLUMNA IZQUIERDA DEL PIE: SECCIÓN 6 - REFERENCIAS PRINCIPALES (APA)
# ---------------------------------------------------------------------
fc1_x = foot_x + 35
fc1_w = 1450
draw.text((fc1_x, foot_y + 36), "6. REFERENCIAS PRINCIPALES (NORMAS APA)", fill=COLOR_ACCENT, font=f_bold(26))
draw.line([(fc1_x, foot_y + 70), (fc1_x + fc1_w, foot_y + 70)], fill=COLOR_BORDER_STRONG, width=2)

refs = [
    "Beck, K., Beedle, M., van Bennekum, A., et al. (2001). Manifesto for Agile Software Development. Agile Alliance.",
    "Forsgren, N., Humble, J., & Kim, G. (2018). Accelerate: Science of Lean Software & DevOps. IT Revolution.",
    "Schwaber, K., & Sutherland, J. (2020). The Scrum Guide: The Definitive Guide. Scrum.org.",
    "Sommerville, I. (2016). Software Engineering (10th ed.). Boston: Pearson Education."
]
ry = foot_y + 90
for r in refs:
    draw.text((fc1_x, ry), "•", fill=COLOR_UAA_GOLD, font=f_bold(22))
    draw_wrapped_text(draw, fc1_x + 22, ry, fc1_w - 30, r, f_reg(18), fill=COLOR_TEXT, line_spacing=5)
    ry += 58


# ---------------------------------------------------------------------
# COLUMNA CENTRAL DEL PIE: SECCIÓN 7 - CONTACTO Y CORRESPONDENCIA
# (Cumplimiento literal: "En la parte inferior central del cartel...")
# ---------------------------------------------------------------------
fc2_x = foot_x + 1530
fc2_w = 2300
draw.text((fc2_x, foot_y + 36), "7. CONTACTO Y CORRESPONDENCIA INSTITUCIONAL", fill=COLOR_ACCENT, font=f_bold(26))
draw.line([(fc2_x, foot_y + 70), (fc2_x + fc2_w, foot_y + 70)], fill=COLOR_BORDER_STRONG, width=2)

# Banner destacado con Correo Electrónico Institucional Central
draw.rounded_rectangle([(fc2_x, foot_y + 86), (fc2_x + fc2_w, foot_y + 148)], radius=10, fill=COLOR_ACCENT_SOFT, outline=COLOR_ACCENT, width=2)
draw.text((fc2_x + 25, foot_y + 117), "✉ Correspondencia: al349804@alumnos.uaa.mx", fill=COLOR_ACCENT_HOVER, font=f_bold(22), anchor="lm")
draw.text((fc2_x + 1180, foot_y + 117), "•  Tutor: arturo.elias@edu.uaa.mx", fill=COLOR_TEXT, font=f_bold(22), anchor="mm")
draw.text((fc2_x + fc2_w - 25, foot_y + 117), "Centro de Ciencias Básicas (CCB - UAA)", fill=COLOR_UAA_GOLD, font=f_bold(21), anchor="rm")

# Autores con ID institucional de seminario
draw.text((fc2_x, foot_y + 172), "• Jose Alberto Vazquez G. (al216795)  •  Luis Antonio García G. (al336979)  •  Yahir Guevara C. (al349804)", fill=COLOR_TEXT, font=f_bold(22))
draw.text((fc2_x, foot_y + 208), "• Martin Alfonso Romo M. (al281268)  •  Ricardo Padilla H. (al352300)  •  Jesús Eduardo Tapia A. (al243746)", fill=COLOR_TEXT, font=f_bold(22))

# Botones de Enlace (Repositorio & Demo en Vivo)
draw.rounded_rectangle([(fc2_x, foot_y + 255), (fc2_x + 1080, foot_y + 325)], radius=10, fill=COLOR_SURFACE_SEC, outline=COLOR_ACCENT, width=2)
draw.text((fc2_x + 540, foot_y + 290), "• Repositorio Oficial: github.com/jefazo-isc/GymSeminario", fill=COLOR_ACCENT_HOVER, font=f_bold(22), anchor="mm")

draw.rounded_rectangle([(fc2_x + 1120, foot_y + 255), (fc2_x + fc2_w, foot_y + 325)], radius=10, fill=COLOR_SURFACE_SEC, outline=COLOR_ACCENT, width=2)
draw.text((fc2_x + 1120 + (fc2_w - 1120) // 2, foot_y + 290), "• Plataforma en Vivo: jefazo-isc.github.io/GymSeminario", fill=COLOR_ACCENT_HOVER, font=f_bold(22), anchor="mm")


# ---------------------------------------------------------------------
# COLUMNA DERECHA DEL PIE: VALIDACIÓN EN VIVO (CÓDIGOS QR)
# ---------------------------------------------------------------------
fc3_x = foot_x + 3880
fc3_w = 680
qr1_path = "/home/yahir/3SEMINARIO/cartel_presentacion/assets/qr_demo.png"
qr2_path = "/home/yahir/3SEMINARIO/cartel_presentacion/assets/qr_repo.png"

# QR 1: Demo
q1_x = fc3_x
draw.rounded_rectangle([(q1_x, foot_y + 35), (q1_x + 320, foot_y + 355)], radius=12, fill=COLOR_SURFACE_SEC, outline=COLOR_BORDER_STRONG, width=2)
if os.path.exists(qr1_path):
    q1_img = Image.open(qr1_path).convert("RGB").resize((185, 185), Image.Resampling.LANCZOS)
    im.paste(q1_img, (q1_x + (320 - 185) // 2, foot_y + 50))
draw.text((q1_x + 160, foot_y + 265), "PLATAFORMA WEB", fill=COLOR_TEXT, font=f_bold(20), anchor="mm")
draw.text((q1_x + 160, foot_y + 305), "Demo en Vivo (PWA)", fill=COLOR_ACCENT_HOVER, font=f_bold(18), anchor="mm")

# QR 2: Repo
q2_x = fc3_x + 350
draw.rounded_rectangle([(q2_x, foot_y + 35), (q2_x + 320, foot_y + 355)], radius=12, fill=COLOR_SURFACE_SEC, outline=COLOR_BORDER_STRONG, width=2)
if os.path.exists(qr2_path):
    q2_img = Image.open(qr2_path).convert("RGB").resize((185, 185), Image.Resampling.LANCZOS)
    im.paste(q2_img, (q2_x + (320 - 185) // 2, foot_y + 50))
draw.text((q2_x + 160, foot_y + 265), "CÓDIGO FUENTE", fill=COLOR_TEXT, font=f_bold(20), anchor="mm")
draw.text((q2_x + 160, foot_y + 305), "Pipeline CI/CD GitHub", fill=COLOR_ACCENT_HOVER, font=f_bold(18), anchor="mm")


# =====================================================================
# 7. EXPORTACIÓN: PDF Y PNG EN ESCALA FÍSICA EXACTA 120cm x 90cm
# =====================================================================
png_out = "/home/yahir/3SEMINARIO/cartel_presentacion/cartel_presentacion_120x90_4x3.png"
pdf_out = "/home/yahir/3SEMINARIO/cartel_presentacion/cartel_presentacion_120x90_4x3.pdf"

print("Exportando PNG de Ultra Alta Resolución (4800 x 3600 px @ 101.6 DPI -> 120cm x 90cm)...")
im.save(png_out, "PNG", dpi=(101.6, 101.6))
print("PNG guardado:", png_out)

print("Exportando PDF de Imprenta (1200mm x 900mm -> 120cm x 90cm)...")
im.save(pdf_out, "PDF", resolution=101.6)
print("PDF guardado:", pdf_out)

# Miniatura web para vista previa
prev_out = "/tmp/cartel_120x90_light_preview.png"
im.resize((1200, 900), Image.Resampling.LANCZOS).save(prev_out)
print("Miniatura guardada:", prev_out)
