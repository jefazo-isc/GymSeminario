import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'edge_gym.db');
const db = new Database(dbPath);

// Modo WAL para concurrencia segura y alto rendimiento en SQLite
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

export const ADMIN_EMAILS = new Set([
  'guevara.cardona.yahir@gmail.com',
  'admin@gymseminario.com',
]);

export const GYM_EQUIPMENT_CATALOG = [
  'Zona de Fuerza: 4 racks olímpicos, barras de 20 kg, discos calibrados, mancuernas de 2 a 50 kg, prensas 45°, máquinas Hammer Strength.',
  'Zona Funcional / Crossfit: cajones pliométricos, kettlebells (8-32 kg), cuerdas de batalla, trineo de empuje, anillas.',
  'Zona Cardio & Spinning: 25 bicicletas de spinning indoor, 10 caminadoras, 6 elípticas, 4 remadoras Concept2.',
  'Zona Boxeo: 8 costales pesados, peras de velocidad, ring de entrenamiento y guantes de préstamo.',
  'Horarios: Lunes a Viernes 06:00 - 22:00 hrs · Sábados 07:00 - 16:00 hrs · Vestidores, regaderas y casilleros incluidos.',
];

export const PRODUCTS_SEED = [
  { id: 1, nombre: 'Gymshark Whey Protein', descripcion: 'Proteína de suero premium Gymshark', precio: 1350, imagen: 'https://m.media-amazon.com/images/I/51+1dK5TL6L._AC_SX679_.jpg', categoria: 'proteina', stock: 30 },
  { id: 2, nombre: 'YoungLA Protein Blend', descripcion: 'Mezcla de proteínas YoungLA sabor chocolate', precio: 1400, imagen: 'https://suplementosmty.com/cdn/shop/files/IMG-4793.jpg?v=1702078683', categoria: 'proteina', stock: 25 },
  { id: 3, nombre: 'Optimum Nutrition Gold Standard 100% Whey', descripcion: 'Proteína clásica con gran reputación', precio: 1600, imagen: 'https://m.media-amazon.com/images/I/71wWgr-umZL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'proteina', stock: 25 },
  { id: 4, nombre: 'Myprotein Impact Whey Protein', descripcion: 'Alta calidad y sabor', precio: 1300, imagen: 'https://m.media-amazon.com/images/I/71QtLjCJEoL.__AC_SY300_SX300_QL70_ML2_.jpg', categoria: 'proteina', stock: 25 },
  { id: 5, nombre: 'Gymshark Vegan Protein', descripcion: 'Proteína vegetal premium Gymshark', precio: 1550, imagen: 'https://m.media-amazon.com/images/I/81JTsLHeabL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'proteina', stock: 20 },
  { id: 6, nombre: 'Dymatize ISO100 Hydrolyzed', descripcion: 'Proteína hidrolizada ultra pura', precio: 1800, imagen: 'https://m.media-amazon.com/images/I/71jfRGW8UKL._AC_SX679_.jpg', categoria: 'proteina', stock: 20 },
  { id: 7, nombre: 'YoungLA Classic Protein', descripcion: 'Proteína sabor vainilla', precio: 1400, imagen: 'https://m.media-amazon.com/images/I/71BbxhrEYTL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'proteina', stock: 25 },
  { id: 8, nombre: 'BSN Syntha-6 Protein', descripcion: 'Mezcla de proteínas con sabor', precio: 1500, imagen: 'https://m.media-amazon.com/images/I/81LCzECwIzL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'proteina', stock: 25 },
  { id: 9, nombre: 'Optimum Nutrition Micronized Creatine', descripcion: 'Creatina monohidrato micronizada', precio: 550, imagen: 'https://m.media-amazon.com/images/I/61maAQ6fA1L._AC_SX679_.jpg', categoria: 'creatina', stock: 35 },
  { id: 10, nombre: 'MuscleTech Platinum Creatine', descripcion: 'Creatina pura para potencia', precio: 600, imagen: 'https://m.media-amazon.com/images/I/71O3oYyFxBL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'creatina', stock: 30 },
  { id: 11, nombre: 'Myprotein Creatina Monohidrato', descripcion: 'Creatina de alta calidad', precio: 520, imagen: 'https://m.media-amazon.com/images/I/71B7W90YtTL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'creatina', stock: 30 },
  { id: 12, nombre: 'Cellucor Cor-Performance Creatine', descripcion: 'Apoya fuerza y recuperación', precio: 580, imagen: 'https://m.media-amazon.com/images/I/61fS4Lp+CdL._AC_SY300_SX300_.jpg', categoria: 'creatina', stock: 25 },
  { id: 13, nombre: 'Creatina Creapure', descripcion: 'Alta pureza alemana', precio: 650, imagen: 'https://m.media-amazon.com/images/I/61D1tjM+bVL._AC_SY300_SX300_.jpg', categoria: 'creatina', stock: 25 },
  { id: 14, nombre: 'Universal Nutrition Creatine', descripcion: 'Fuerza y resistencia', precio: 560, imagen: 'https://m.media-amazon.com/images/I/414iFZbgx2L.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'creatina', stock: 25 },
  { id: 15, nombre: 'Kaged Muscle Creatine HCl', descripcion: 'Creatina HCl de alta absorción', precio: 700, imagen: 'https://m.media-amazon.com/images/I/61mBp28SgvL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'creatina', stock: 20 },
  { id: 16, nombre: 'Optimum Nutrition Creatine Capsules', descripcion: 'Creatina en cápsulas', precio: 750, imagen: 'https://m.media-amazon.com/images/I/41XGzzp1xnL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'creatina', stock: 20 },
  { id: 17, nombre: 'Cellucor C4 Original', descripcion: 'Pre-entreno popular y efectivo', precio: 800, imagen: 'https://m.media-amazon.com/images/I/71toMEyF4jL._AC_SX679_.jpg', categoria: 'preentreno', stock: 25 },
  { id: 18, nombre: 'Legion Pulse', descripcion: 'Pre-entreno con ingredientes naturales', precio: 950, imagen: 'https://m.media-amazon.com/images/I/71IdSCqb1xL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'preentreno', stock: 25 },
  { id: 19, nombre: 'Optimum Nutrition Gold Pre-Workout', descripcion: 'Foco y energía', precio: 900, imagen: 'https://m.media-amazon.com/images/I/71C6xWuT2oL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'preentreno', stock: 25 },
  { id: 20, nombre: 'Ghost Legend', descripcion: 'Pre-entreno con sabor', precio: 1000, imagen: 'https://m.media-amazon.com/images/I/71nJKcwyysL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'preentreno', stock: 20 },
  { id: 21, nombre: 'BSN N.O.-Xplode', descripcion: 'Explosivo y duradero', precio: 850, imagen: 'https://m.media-amazon.com/images/I/51SCA8HklRL._AC_SX679_.jpg', categoria: 'preentreno', stock: 25 },
  { id: 22, nombre: 'Kaged Muscle Pre-Kaged', descripcion: 'Foco y resistencia', precio: 920, imagen: 'https://m.media-amazon.com/images/I/81dE-FJT66L.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'preentreno', stock: 20 },
  { id: 23, nombre: 'MuscleTech VaporX5', descripcion: 'Pre-entreno clásico', precio: 870, imagen: 'https://m.media-amazon.com/images/I/71nrqrrxwwL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'preentreno', stock: 25 },
  { id: 24, nombre: 'Redcon1 Total War', descripcion: 'Pre-entreno potente', precio: 980, imagen: 'https://m.media-amazon.com/images/I/71TvvW8L7VL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'preentreno', stock: 20 },
  { id: 25, nombre: 'Gymshark Straps', descripcion: 'Straps para levantamiento', precio: 300, imagen: 'https://m.media-amazon.com/images/I/71uR-wVYS4L.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'accesorio', stock: 40 },
  { id: 26, nombre: 'YoungLA Guantes de Entrenamiento', descripcion: 'Guantes para pesas', precio: 350, imagen: 'https://site-product.innovasport.com/img-test/1369826-001/1369826-001_1-1200_x_1200.jpg', categoria: 'accesorio', stock: 35 },
  { id: 27, nombre: 'Cinturón de levantamiento', descripcion: 'Soporte lumbar', precio: 400, imagen: 'https://m.media-amazon.com/images/I/81XOlJpgjiL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'accesorio', stock: 25 },
  { id: 28, nombre: 'Rodilleras deportivas', descripcion: 'Protección para rodillas', precio: 280, imagen: 'https://m.media-amazon.com/images/I/511C5UmC4-L.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'accesorio', stock: 30 },
  { id: 29, nombre: 'Cuerda para saltar', descripcion: 'Ideal para cardio', precio: 150, imagen: 'https://m.media-amazon.com/images/I/41VPkyVIDrL.__AC_SY300_SX300_QL70_ML2_.jpg', categoria: 'accesorio', stock: 45 },
  { id: 30, nombre: 'Toalla deportiva Gymshark', descripcion: 'Absorbe sudor', precio: 200, imagen: 'https://m.media-amazon.com/images/I/71iyTznE3KL.__AC_SY300_SX300_QL70_ML2_.jpg', categoria: 'accesorio', stock: 50 },
  { id: 31, nombre: 'Camiseta Gymshark Training', descripcion: 'Camiseta técnica', precio: 900, imagen: 'https://cdn.shopify.com/s/files/1/0156/6146/files/GFXRestDay3RDEBoxyT-ShirtGSBlackA2B8H-BB2J-0968-0090_4a9deb70-4b68-4bca-a923-205089f6e612_3840x.jpg?v=1742894740', categoria: 'ropa', stock: 30 },
  { id: 32, nombre: 'Shorts YoungLA', descripcion: 'Shorts deportivos cómodos', precio: 850, imagen: 'https://ae-pic-a1.aliexpress-media.com/kf/Sfe8e2866a7974020abdcc25391d4072am.jpg_960x960q75.jpg_.avif', categoria: 'ropa', stock: 30 },
  { id: 33, nombre: 'Sudadera Nike Dri-FIT', descripcion: 'Sudadera ligera', precio: 1200, imagen: 'https://m.media-amazon.com/images/I/51+LeklyN5L._AC_SY300_SX300_.jpg', categoria: 'ropa', stock: 20 },
  { id: 34, nombre: 'Pantalón Adidas Training', descripcion: 'Pantalón para entrenamiento', precio: 1100, imagen: 'https://m.media-amazon.com/images/I/61Lo3u356gL._AC_SX679_.jpg', categoria: 'ropa', stock: 25 },
  { id: 35, nombre: 'Tank Top Gymshark', descripcion: 'Sin mangas para entrenar', precio: 750, imagen: 'https://cdn.shopify.com/s/files/1/1367/5207/files/PowerOriginalsCutOffTankGSBlackA2C9M-BB2J_1004_d757e053-32cf-4273-977b-476e66407bde_3840x.jpg?v=1741104503', categoria: 'ropa', stock: 30 },
  { id: 36, nombre: 'Joggers YoungLA', descripcion: 'Joggers cómodos y estilizados', precio: 1000, imagen: 'https://http2.mlstatic.com/D_NQ_NP_606361-MLM84544006589_052025-O-youngla-pants-revenge-joggers-original-.webp', categoria: 'ropa', stock: 25 },
  { id: 37, nombre: 'Sudadera con capucha Nike', descripcion: 'Para días fríos', precio: 1300, imagen: 'https://m.media-amazon.com/images/I/51cB8iGPJZL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'ropa', stock: 20 },
  { id: 38, nombre: 'Camiseta Adidas Climalite', descripcion: 'Tecnología para mantenerte fresco', precio: 900, imagen: 'https://m.media-amazon.com/images/I/71RbhHjzPQL.__AC_SX300_SY300_QL70_ML2_.jpg', categoria: 'ropa', stock: 30 },
  { id: 39, nombre: 'Pantalones cortos Under Armour', descripcion: 'Comodidad y rendimiento', precio: 850, imagen: 'https://m.media-amazon.com/images/I/618TPqKNYyL._AC_SX679_.jpg', categoria: 'ropa', stock: 30 },
  { id: 40, nombre: 'Chaqueta deportiva YoungLA', descripcion: 'Estilo y confort', precio: 1400, imagen: 'https://http2.mlstatic.com/D_NQ_NP_622245-MLM81897706022_012025-O-youngla-anarchy-hoodie-sudadera-original-.webp', categoria: 'ropa', stock: 20 },
];

export function todayIso() {
  return new Date().toISOString().split('T')[0];
}

export function nowTimeHHMM() {
  return new Date().toISOString().slice(11, 16);
}

function runSafeAlter(sql) {
  try {
    db.exec(sql);
  } catch {
    /* columna ya existe */
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT '',
    nombre TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    provider TEXT NOT NULL DEFAULT 'email',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS memberships (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    plan_nombre TEXT NOT NULL,
    precio REAL NOT NULL,
    periodo TEXT NOT NULL,
    fecha_inicio TEXT NOT NULL,
    fecha_fin TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'Activa',
    auto_renew INTEGER NOT NULL DEFAULT 0,
    beneficios TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS membership_history (
    id TEXT PRIMARY KEY,
    membership_id TEXT,
    user_email TEXT NOT NULL,
    plan_nombre TEXT NOT NULL,
    precio REAL NOT NULL,
    periodo TEXT NOT NULL,
    fecha_inicio TEXT NOT NULL,
    fecha_fin TEXT NOT NULL,
    accion TEXT NOT NULL DEFAULT 'ACTIVACION',
    folio TEXT,
    cupon TEXT,
    actor_email TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stripe_transactions (
    id TEXT PRIMARY KEY,
    folio TEXT,
    payment_intent_id TEXT,
    tipo TEXT NOT NULL DEFAULT 'membership',
    user_email TEXT NOT NULL,
    plan_nombre TEXT NOT NULL,
    monto REAL NOT NULL,
    descuento REAL DEFAULT 0,
    cupon TEXT,
    moneda TEXT NOT NULL DEFAULT 'MXN',
    estado TEXT NOT NULL DEFAULT 'COMPLETED',
    payer_name TEXT,
    payer_email TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    usuario TEXT,
    email TEXT,
    nombre TEXT,
    entrenamiento TEXT NOT NULL,
    fecha TEXT NOT NULL,
    turno TEXT NOT NULL,
    telefono TEXT,
    estado TEXT NOT NULL DEFAULT 'Confirmada',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS attendances (
    id TEXT PRIMARY KEY,
    usuario TEXT,
    email TEXT,
    nombre TEXT,
    clase TEXT NOT NULL,
    fecha TEXT NOT NULL,
    hora TEXT NOT NULL,
    qr_token TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS qr_tokens (
    token TEXT PRIMARY KEY,
    token_type TEXT NOT NULL DEFAULT 'member',
    user_email TEXT NOT NULL,
    booking_id TEXT,
    clase TEXT NOT NULL DEFAULT 'Acceso General',
    fecha TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_profiles (
    user_email TEXT PRIMARY KEY,
    nombre TEXT,
    telefono TEXT,
    edad INTEGER,
    genero TEXT,
    objetivo TEXT,
    nivel TEXT,
    dias_disponibles INTEGER DEFAULT 4,
    peso REAL,
    altura REAL,
    restricciones_medicas TEXT DEFAULT 'Ninguna',
    contacto_emergencia TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS body_measurements (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    fecha TEXT NOT NULL,
    peso REAL NOT NULL,
    altura REAL NOT NULL,
    imc REAL NOT NULL,
    cintura REAL,
    pecho REAL,
    brazo REAL,
    grasa_corporal REAL,
    restricciones_medicas TEXT,
    notas TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS workout_logs (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    fecha TEXT NOT NULL,
    ejercicio TEXT NOT NULL,
    grupo_muscular TEXT NOT NULL DEFAULT 'General',
    series INTEGER NOT NULL DEFAULT 3,
    repeticiones TEXT NOT NULL DEFAULT '10',
    peso_kg REAL NOT NULL DEFAULT 0,
    rpe REAL,
    notas TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS assigned_routines (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    assigned_by TEXT,
    titulo TEXT NOT NULL,
    objetivo TEXT,
    nivel TEXT,
    origen TEXT NOT NULL DEFAULT 'ia',
    rutina_json TEXT NOT NULL,
    activa INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT NOT NULL DEFAULT '',
    precio REAL NOT NULL,
    imagen TEXT NOT NULL DEFAULT 'img/product-placeholder.svg',
    categoria TEXT NOT NULL DEFAULT 'accesorio',
    stock INTEGER NOT NULL DEFAULT 25,
    activo INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_quotas (
    uid TEXT PRIMARY KEY,
    email TEXT,
    consultas_hoy INTEGER DEFAULT 0,
    ultimo_acceso TEXT
  );

  CREATE TABLE IF NOT EXISTS asistencias_edge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL,
    codigo_qr TEXT,
    timestamp TEXT NOT NULL,
    sincronizado INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS ia_cache (
    prompt_hash TEXT PRIMARY KEY,
    respuesta TEXT NOT NULL,
    creado_en TEXT NOT NULL
  );
`);

runSafeAlter("ALTER TABLE users ADD COLUMN provider TEXT NOT NULL DEFAULT 'email'");
runSafeAlter('ALTER TABLE memberships ADD COLUMN auto_renew INTEGER NOT NULL DEFAULT 0');
runSafeAlter('ALTER TABLE stripe_transactions ADD COLUMN folio TEXT');
runSafeAlter("ALTER TABLE stripe_transactions ADD COLUMN tipo TEXT NOT NULL DEFAULT 'membership'");
runSafeAlter("ALTER TABLE bookings ADD COLUMN estado TEXT NOT NULL DEFAULT 'Confirmada'");
runSafeAlter('ALTER TABLE attendances ADD COLUMN qr_token TEXT');
runSafeAlter("ALTER TABLE qr_tokens ADD COLUMN token_type TEXT NOT NULL DEFAULT 'member'");

// Semilla inicial de reservas de Boxeo si está vacía
try {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM bookings').get();
  if (!countRow || countRow.count === 0) {
    const seed = db.prepare(`
      INSERT INTO bookings (id, usuario, email, nombre, entrenamiento, fecha, turno)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    seed.run('seed-box-1', '1', 'socio1@espaciogym.mx', 'Socio Box 1', 'Boxeo', '2026-11-01', 'Matutino');
    seed.run('seed-box-2', '2', 'socio2@espaciogym.mx', 'Socio Box 2', 'Boxeo', '2026-11-02', 'Vespertino');
    seed.run('seed-box-3', '3', 'socio3@espaciogym.mx', 'Socio Box 3', 'Boxeo', '2026-11-03', 'Matutino');
    seed.run('seed-box-4', '4', 'socio4@espaciogym.mx', 'Socio Box 4', 'Boxeo', '2026-11-04', 'Vespertino');
  }
} catch (err) {
  console.warn('Advertencia al verificar semilla de bookings:', err.message);
}

// Semilla inicial del catálogo de 40 productos (y corrección precio $1350 en #1)
try {
  const prodCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (!prodCount || prodCount.count === 0) {
    const insertProd = db.prepare(`
      INSERT INTO products (id, nombre, descripcion, precio, imagen, categoria, stock, activo)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);
    const seedProducts = db.transaction(() => {
      for (const p of PRODUCTS_SEED) {
        insertProd.run(p.id, p.nombre, p.descripcion, p.precio, p.imagen, p.categoria, p.stock);
      }
    });
    seedProducts();
  } else {
    db.prepare("UPDATE products SET precio = 1350 WHERE id = 1 AND nombre = 'Gymshark Whey Protein' AND precio = 1").run();
  }
} catch (err) {
  console.warn('Advertencia al verificar semilla de productos:', err.message);
}

// Inicialización segura de cuentas administradoras sin contraseñas hardcodeadas
try {
  const seedAdminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@gymseminario.com').trim().toLowerCase();
  const seedAdminPass = process.env.SEED_ADMIN_PASSWORD || '';
  const adminRow = db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(seedAdminEmail);
  if (!adminRow) {
    const passHash = seedAdminPass ? bcrypt.hashSync(seedAdminPass, 10) : '';
    db.prepare('INSERT INTO users (email, password, nombre, role, provider) VALUES (?, ?, ?, ?, ?)')
      .run(seedAdminEmail, passHash, 'Administrador', 'admin', seedAdminPass ? 'email' : 'google');
  }

  const yahirEmail = 'guevara.cardona.yahir@gmail.com';
  const yahirRow = db.prepare('SELECT id, role FROM users WHERE lower(email) = ?').get(yahirEmail);
  if (yahirRow) {
    if (yahirRow.role !== 'admin') {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', yahirRow.id);
    }
  } else {
    db.prepare('INSERT INTO users (email, password, nombre, role, provider) VALUES (?, ?, ?, ?, ?)')
      .run(yahirEmail, '', 'Yahir Guevara Cardona', 'admin', 'google');
  }
} catch (err) {
  console.warn('Advertencia al inicializar administradores:', err.message);
}

export default db;
