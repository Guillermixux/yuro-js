-- Esquema de base de datos para Yuro (Cloudflare D1)

CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    direccion TEXT UNIQUE NOT NULL,
    es_admin INTEGER NOT NULL DEFAULT 0,
    congelado INTEGER NOT NULL DEFAULT 0,
    csrf TEXT NOT NULL,
    creado REAL NOT NULL,
    sesion_token TEXT,
    sesion_expira REAL
);

CREATE TABLE IF NOT EXISTS bloques (
    numero INTEGER PRIMARY KEY,
    hash TEXT NOT NULL,
    hash_anterior TEXT NOT NULL,
    nonce INTEGER NOT NULL,
    minero TEXT NOT NULL,
    recompensa REAL NOT NULL,
    timestamp REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS transacciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    de TEXT NOT NULL,
    para TEXT NOT NULL,
    cantidad REAL NOT NULL,
    concepto TEXT,
    bloque_numero INTEGER,
    timestamp REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS anuncios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    autor TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    timestamp REAL NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS tablon (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    autor TEXT NOT NULL,
    titulo TEXT NOT NULL,
    contenido TEXT,
    timestamp REAL NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS log_gobierno (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin TEXT NOT NULL,
    accion TEXT NOT NULL,
    detalle TEXT,
    timestamp REAL NOT NULL
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_transacciones_de ON transacciones(de);
CREATE INDEX IF NOT EXISTS idx_transacciones_para ON transacciones(para);
CREATE INDEX IF NOT EXISTS idx_usuarios_direccion ON usuarios(direccion);
