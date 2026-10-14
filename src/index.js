// Yuro (Y) - Moneda blockchain en Cloudflare Workers + D1
// Versión JavaScript para GitHub Pages + Cloudflare

const NOMBRE_MONEDA = "Yuro";
const SIMBOLO = "Y";
const RECOMPENSA = 50;
const BIENVENIDA = 100;
const DIFICULTAD = 3; // ceros iniciales en el hash
const IMPUESTO_DEFECTO = 0;

// ==================== HELPERS ====================

function generarDireccion() {
  const hex = "0123456789abcdef";
  let dir = "yuro";
  for (let i = 0; i < 40; i++) {
    dir += hex[Math.floor(Math.random() * 16)];
  }
  return dir;
}

function generarToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "yuro_salt_2024");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hashBloque(data) {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

function error(msg, status = 400) {
  return json({ error: msg }, status);
}

function formatear(n) {
  return Number(n).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ==================== ROUTER ====================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    try {
      // ========== API Routes ==========
      if (path.startsWith("/api/")) {
        return await handleAPI(request, env, path, method);
      }

      // ========== Static Files (sirve el frontend) ==========
      return await handleStatic(path, env);
    } catch (e) {
      return error("Error interno: " + e.message, 500);
    }
  }
};

// ==================== API HANDLER ====================

async function handleAPI(request, env, path, method) {
  const db = env.DB;
  const url = new URL(request.url);

  // GET /api/estado - Estado general
  if (path === "/api/estado" && method === "GET") {
    const usuarios = await db.prepare("SELECT COUNT(*) as n FROM usuarios").first();
    const bloques = await db.prepare("SELECT COUNT(*) as n FROM bloques").first();
    const transacciones = await db.prepare("SELECT COUNT(*) as n FROM transacciones").first();
    const suministro = await db.prepare(
      "SELECT COALESCE(SUM(cantidad), 0) as total FROM transacciones WHERE tipo = 'mineria' OR tipo = 'bienvenida'"
    ).first();

    return json({
      nombre: NOMBRE_MONEDA,
      simbolo: SIMBOLO,
      usuarios: usuarios.n,
      bloques: bloques.n,
      transacciones: transacciones.n,
      suministro: suministro.total,
      recompensa: RECOMPENSA
    });
  }

  // POST /api/registro - Registro
  if (path === "/api/registro" && method === "POST") {
    const body = await request.json();
    const { nombre, password } = body;

    if (!nombre || nombre.length < 3 || nombre.length > 16) {
      return error("Nombre entre 3 y 16 caracteres");
    }
    if (!password || password.length < 6) {
      return error("Password mínimo 6 caracteres");
    }

    // Verificar si ya existe
    const existe = await db.prepare(
      "SELECT id FROM usuarios WHERE nombre = ?"
    ).bind(nombre).first();

    if (existe) {
      return error("Ese nombre ya está registrado");
    }

    // Crear usuario
    const direccion = generarDireccion();
    const passwordHash = await hashPassword(password);
    const csrf = generarToken();
    const sesionToken = generarToken();
    const ahora = Date.now() / 1000;
    const expira = ahora + (30 * 24 * 60 * 60); // 30 días

    // ¿Es el primer usuario? → admin
    const primerUser = await db.prepare("SELECT COUNT(*) as n FROM usuarios").first();
    const esAdmin = primerUser.n === 0 ? 1 : 0;

    await db.prepare(
      `INSERT INTO usuarios (nombre, password_hash, direccion, es_admin, congelado, csrf, creado, sesion_token, sesion_expira)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)`
    ).bind(nombre, passwordHash, direccion, esAdmin, csrf, ahora, sesionToken, expira).run();

    // Dar bienvenida
    await db.prepare(
      `INSERT INTO transacciones (de, para, cantidad, concepto, timestamp, tipo)
       VALUES ('FAUCET', ?, ?, 'Bienvenida', ?, 'bienvenida')`
    ).bind(direccion, BIENVENIDA, ahora).run();

    // Crear genesis block si es el primer usuario
    if (primerUser.n === 0) {
      const genesisHash = await hashBloque("genesis");
      await db.prepare(
        `INSERT INTO bloques (numero, hash, hash_anterior, nonce, minero, recompensa, timestamp)
         VALUES (0, ?, '0', 0, ?, 0, ?)`
      ).bind(genesisHash, nombre, ahora).run();
    }

    return json({
      ok: true,
      mensaje: `¡Bienvenido a Yuro! Tienes ${BIENVENIDA} ${SIMBOLO} de regalo`,
      token: sesionToken
    });
  }

  // POST /api/login - Login
  if (path === "/api/login" && method === "POST") {
    const body = await request.json();
    const { nombre, password } = body;

    const passwordHash = await hashPassword(password);
    const usuario = await db.prepare(
      "SELECT * FROM usuarios WHERE nombre = ? AND password_hash = ?"
    ).bind(nombre, passwordHash).first();

    if (!usuario) {
      return error("Nombre o password incorrectos");
    }

    if (usuario.congelado) {
      return error("Tu cuenta está congelada");
    }

    // Actualizar sesión
    const sesionToken = generarToken();
    const expira = Date.now() / 1000 + (30 * 24 * 60 * 60);

    await db.prepare(
      "UPDATE usuarios SET sesion_token = ?, sesion_expira = ? WHERE id = ?"
    ).bind(sesionToken, expira, usuario.id).run();

    return json({
      ok: true,
      token: sesionToken,
      usuario: {
        nombre: usuario.nombre,
        direccion: usuario.direccion,
        es_admin: usuario.es_admin
      }
    });
  }

  // POST /api/logout - Logout
  if (path === "/api/logout" && method === "POST") {
    const token = getAuthToken(request);
    if (token) {
      await db.prepare(
        "UPDATE usuarios SET sesion_token = NULL WHERE sesion_token = ?"
      ).bind(token).run();
    }
    return json({ ok: true });
  }

  // GET /api/perfil - Mi perfil
  if (path === "/api/perfil" && method === "GET") {
    const usuario = await getUsuario(request, db);
    if (!usuario) return error("No autorizado", 401);

    const saldo = await getSaldo(db, usuario.direccion);
    const recibido = await db.prepare(
      "SELECT COALESCE(SUM(cantidad), 0) as total FROM transacciones WHERE para = ?"
    ).bind(usuario.direccion).first();
    const enviado = await db.prepare(
      "SELECT COALESCE(SUM(cantidad), 0) as total FROM transacciones WHERE de = ?"
    ).bind(usuario.direccion).first();

    return json({
      nombre: usuario.nombre,
      direccion: usuario.direccion,
      saldo: saldo,
      recibido: recibido.total,
      enviado: enviado.total,
      es_admin: usuario.es_admin,
      congelado: usuario.congelado,
      csrf: usuario.csrf
    });
  }

  // GET /api/ranking - Ranking de usuarios
  if (path === "/api/ranking" && method === "GET") {
    const usuarios = await db.prepare(
      `SELECT u.nombre, u.direccion, COALESCE(s.saldo, 0) as saldo
       FROM usuarios u
       LEFT JOIN (
         SELECT direccion, SUM(CASE WHEN de = direccion THEN -cantidad ELSE cantidad END) as saldo
         FROM transacciones
         GROUP BY direccion
       ) s ON u.direccion = s.direccion
       WHERE u.es_admin = 0
       ORDER BY saldo DESC
       LIMIT 50`
    ).all();

    return json(usuarios.results);
  }

  // POST /api/enviar - Enviar Yuro
  if (path === "/api/enviar" && method === "POST") {
    const usuario = await getUsuario(request, db);
    if (!usuario) return error("No autorizado", 401);

    const body = await request.json();
    const { destino, cantidad, concepto } = body;

    if (!destino || !cantidad || cantidad <= 0) {
      return error("Destino y cantidad válidos requeridos");
    }

    // Buscar destino
    const receptor = await db.prepare(
      "SELECT * FROM usuarios WHERE nombre = ? OR direccion = ?"
    ).bind(destino, destino).first();

    if (!receptor) {
      return error("Usuario no encontrado");
    }

    if (receptor.direccion === usuario.direccion) {
      return error("No puedes enviarte a ti mismo");
    }

    // Verificar saldo
    const saldo = await getSaldo(db, usuario.direccion);
    if (saldo < cantidad) {
      return error(`No tienes suficientes Yuro. Saldo: ${formatear(saldo)}`);
    }

    // Aplicar impuesto
    const impuesto = cantidad * (IMPUESTO_DEFECTO / 100);
    const neto = cantidad - impuesto;
    const ahora = Date.now() / 1000;

    // Registrar transacción
    await db.prepare(
      `INSERT INTO transacciones (de, para, cantidad, concepto, timestamp, tipo)
       VALUES (?, ?, ?, ?, ?, 'envio')`
    ).bind(usuario.direccion, receptor.direccion, neto, concepto || "", ahora).run();

    if (impuesto > 0) {
      await db.prepare(
        `INSERT INTO transacciones (de, para, cantidad, concepto, timestamp, tipo)
         VALUES (?, 'GOBIERNO', ?, 'Impuesto', ?, 'impuesto')`
      ).bind(usuario.direccion, impuesto, ahora).run();
    }

    return json({
      ok: true,
      mensaje: `Enviado ${SIMBOLO} ${formatear(neto)} a ${receptor.nombre}`
    });
  }

  // POST /api/minar - Minar un bloque
  if (path === "/api/minar" && method === "POST") {
    const usuario = await getUsuario(request, db);
    if (!usuario) return error("No autorizado", 401);

    const body = await request.json();
    const { nonce, hash } = body;

    // Verificar PoW simple
    if (!hash || !hash.startsWith("0".repeat(DIFICULTAD))) {
      return error("Hash inválido. Debe empezar con " + "0".repeat(DIFICULTAD) + " ceros");
    }

    // Obtener último bloque
    const ultimo = await db.prepare(
      "SELECT * FROM bloques ORDER BY numero DESC LIMIT 1"
    ).first();

    const numeroBloque = (ultimo?.numero || 0) + 1;
    const ahora = Date.now() / 1000;

    // Registrar bloque
    await db.prepare(
      `INSERT INTO bloques (numero, hash, hash_anterior, nonce, minero, recompensa, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      numeroBloque, hash, ultimo?.hash || "0",
      nonce || 0, usuario.nombre, RECOMPENSA, ahora
    ).run();

    // Dar recompensa
    await db.prepare(
      `INSERT INTO transacciones (de, para, cantidad, concepto, timestamp, tipo)
       VALUES ('COINBASE', ?, ?, 'Minería', ?, 'mineria')`
    ).bind(usuario.direccion, RECOMPENSA, ahora).run();

    return json({
      ok: true,
      bloque: numeroBloque,
      recompensa: RECOMPENSA,
      mensaje: `¡Bloque #${numeroBloque} minado! +${SIMBOLO} ${formatear(RECOMPENSA)}`
    });
  }

  // GET /api/bloques - Explorador de bloques
  if (path === "/api/bloques" && method === "GET") {
    const bloques = await db.prepare(
      "SELECT * FROM bloques ORDER BY numero DESC LIMIT 50"
    ).all();

    return json(bloques.results);
  }

  // GET /api/transacciones - Últimas transacciones
  if (path === "/api/transacciones" && method === "GET") {
    const transacciones = await db.prepare(
      `SELECT t.*, 
              u1.nombre as nombre_de, 
              u2.nombre as nombre_para
       FROM transacciones t
       LEFT JOIN usuarios u1 ON t.de = u1.direccion
       LEFT JOIN usuarios u2 ON t.para = u2.direccion
       ORDER BY t.timestamp DESC
       LIMIT 50`
    ).all();

    return json(transacciones.results);
  }

  // GET /api/tablon - Tablón de anuncios
  if (path === "/api/tablon" && method === "GET") {
    const publicaciones = await db.prepare(
      "SELECT * FROM tablon WHERE activo = 1 ORDER BY id DESC LIMIT 50"
    ).all();

    return json(publicaciones.results);
  }

  // POST /api/tablon - Publicar en tablón
  if (path === "/api/tablon" && method === "POST") {
    const usuario = await getUsuario(request, db);
    if (!usuario) return error("No autorizado", 401);

    const body = await request.json();
    const { titulo, contenido } = body;

    if (!titulo || titulo.length > 100) {
      return error("Título requerido (máx 100 caracteres)");
    }

    const ahora = Date.now() / 1000;
    await db.prepare(
      `INSERT INTO tablon (autor, titulo, contenido, timestamp, activo)
       VALUES (?, ?, ?, ?, 1)`
    ).bind(usuario.nombre, titulo, contenido || "", ahora).run();

    return json({ ok: true, mensaje: "Publicado" });
  }

  // GET /api/gobierno - Panel de gobierno (solo admin)
  if (path === "/api/gobierno" && method === "GET") {
    const usuario = await getUsuario(request, db);
    if (!usuario || !usuario.es_admin) return error("No autorizado", 403);

    const usuarios = await db.prepare("SELECT COUNT(*) as n FROM usuarios").first();
    const saldoGobierno = await getSaldo(db, "GOBIERNO");
    const bloques = await db.prepare("SELECT COUNT(*) as n FROM bloques").first();

    return json({
      total_usuarios: usuarios.n,
      saldo_gobierno: saldoGobierno,
      total_bloques: bloques.n
    });
  }

  return error("Ruta no encontrada", 404);
}

// ==================== HELPERS DE BASE DE DATOS ====================

async function getUsuario(request, db) {
  const token = getAuthToken(request);
  if (!token) return null;

  const ahora = Date.now() / 1000;
  const usuario = await db.prepare(
    "SELECT * FROM usuarios WHERE sesion_token = ? AND sesion_expira > ?"
  ).bind(token, ahora).first();

  return usuario;
}

function getAuthToken(request) {
  // Buscar en Authorization header
  const auth = request.headers.get("Authorization");
  if (auth && auth.startsWith("Bearer ")) {
    return auth.substring(7);
  }

  // Buscar en cookie
  const cookie = request.headers.get("Cookie");
  if (cookie) {
    const match = cookie.match(/yuro_token=([^;]+)/);
    if (match) return match[1];
  }

  return null;
}

async function getSaldo(db, direccion) {
  const recibido = await db.prepare(
    "SELECT COALESCE(SUM(cantidad), 0) as total FROM transacciones WHERE para = ?"
  ).bind(direccion).first();

  const enviado = await db.prepare(
    "SELECT COALESCE(SUM(cantidad), 0) as total FROM transacciones WHERE de = ?"
  ).bind(direccion).first();

  return recibido.total - enviado.total;
}

// ==================== STATIC FILES ====================

async function handleStatic(path, env) {
  // Si hay un archivo estático, servirlo
  if (env.ASSETS) {
    const asset = await env.ASSETS.fetch(new Request(path));
    if (asset.status === 200) {
      return asset;
    }
  }

  // Si no, servir index.html (SPA)
  if (env.ASSETS) {
    return env.ASSETS.fetch(new Request("/index.html"));
  }

  return new Response("Yuro", { headers: { "Content-Type": "text/plain" } });
}
