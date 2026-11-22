import os

svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 180" width="500" height="180">
  <defs>
    <linearGradient id="gradText" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00E5FF"/>
      <stop offset="50%" stop-color="#00B0FF"/>
      <stop offset="100%" stop-color="#FF6D00"/>
    </linearGradient>
    <linearGradient id="gradGym" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF6D00"/>
      <stop offset="100%" stop-color="#FFA000"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="glow"/>
      <feComposite in="SourceGraphic" in2="glow" operator="over"/>
    </filter>
  </defs>

  <rect width="500" height="180" rx="20" fill="#07172b" stroke="#00E5FF" stroke-width="2.5" stroke-opacity="0.6"/>

  <!-- Icon: Modern stylized dumbbell + hexagon -->
  <g transform="translate(25, 25)">
    <!-- Hexagon border -->
    <polygon points="65,10 115,38 115,92 65,120 15,92 15,38" fill="none" stroke="#00E5FF" stroke-width="4" filter="url(#glow)"/>
    <!-- Dumbbell inside -->
    <rect x="35" y="60" width="60" height="10" rx="5" fill="#FFFFFF"/>
    <rect x="25" y="45" width="12" height="40" rx="3" fill="#FF6D00"/>
    <rect x="93" y="45" width="12" height="40" rx="3" fill="#FF6D00"/>
    <rect x="18" y="52" width="8" height="26" rx="2" fill="#00E5FF"/>
    <rect x="104" y="52" width="8" height="26" rx="2" fill="#00E5FF"/>
  </g>

  <!-- Typography -->
  <text x="165" y="85" font-family="'Montserrat', 'Arial Black', sans-serif" font-weight="900" font-size="52" fill="#FFFFFF" letter-spacing="-1">
    espacio<tspan fill="#FF6D00">GYM</tspan>
  </text>

  <!-- Subtitle pill -->
  <rect x="165" y="105" width="310" height="34" rx="8" fill="#0d2744" stroke="#00B0FF" stroke-width="1.2"/>
  <text x="175" y="128" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="14" fill="#00E5FF" letter-spacing="1.5">
    GROM 21 • FITNESS MANAGEMENT
  </text>
  <text x="175" y="155" font-family="'Segoe UI', Arial, sans-serif" font-weight="500" font-size="12" fill="#94A3B8">
    Angular 19 • Node.js • SQLite WAL • CI/CD
  </text>
</svg>'''

with open('/home/yahir/3SEMINARIO/cartel_presentacion/assets/logo_espaciogym.svg', 'w') as f:
    f.write(svg_content)
print("Logo SVG created at /home/yahir/3SEMINARIO/cartel_presentacion/assets/logo_espaciogym.svg")
