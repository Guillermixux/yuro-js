// Yuro - App JavaScript

// Configuración
const API_URL = window.location.origin + "/api";
let token = localStorage.getItem("yuro_token");
let usuarioActual = null;

// ==================== UTILIDADES ====================

function formatear(n) {
    return Number(n).toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function fecha(ts) {
    if (!ts) return "";
    const d = new Date(ts * 1000);
    return d.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function cortaDir(d, n = 12) {
    if (!d) return "";
    return d.length > n ? d.substring(0, n) + "..." : d;
}

async function api(ruta, opciones = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...opciones.headers
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const resp = await fetch(API_URL + ruta, {
        ...opciones,
        headers
    });

    const data = await resp.json();

    if (!resp.ok) {
        throw new Error(data.error || "Error desconocido");
    }

    return data;
}

function mostrar(mensaje, tipo = "exito", elementoId = null) {
    const el = elementoId
        ? document.getElementById(elementoId)
        : document.querySelector(".mensaje");

    if (el) {
        el.textContent = mensaje;
        el.className = `mensaje ${tipo}`;
        el.classList.remove("oculto");

        if (tipo === "exito") {
            setTimeout(() => el.classList.add("oculto"), 3000);
        }
    }
}

function mostrarError(msg) {
    const el = document.getElementById("auth-error");
    if (el) {
        el.textContent = msg;
        el.classList.remove("oculto");
        setTimeout(() => el.classList.add("oculto"), 3000);
    }
}

// ==================== NAVEGACIÓN ====================

function mostrarPagina(nombre) {
    // Ocultar todas
    document.querySelectorAll(".container").forEach(el => {
        el.classList.add("oculto");
    });

    // Mostrar la seleccionada
    const pagina = document.getElementById(`pagina-${nombre}`);
    if (pagina) {
        pagina.classList.remove("oculto");
    }

    // Actualizar nav
    document.querySelectorAll(".nav-links a").forEach(a => {
        a.classList.toggle("activo", a.dataset.pagina === nombre);
    });

    // Cargar datos de la página
    switch (nombre) {
        case "panel": cargarPanel(); break;
        case "enviar": cargarEnviar(); break;
        case "tablon": cargarTablon(); break;
        case "explorador": cargarExplorador(); break;
        case "ranking": cargarRanking(); break;
        case "gobierno": cargarGobierno(); break;
    }
}

// ==================== AUTH ====================

function mostrarTab(tab) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("activo"));
    document.querySelectorAll(".auth-form").forEach(f => f.classList.add("oculto"));

    document.getElementById(`form-${tab}`).classList.remove("oculto");
    event.target.classList.add("activo");
}

document.getElementById("form-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        const data = await api("/login", {
            method: "POST",
            body: JSON.stringify({
                nombre: document.getElementById("login-nombre").value,
                password: document.getElementById("login-password").value
            })
        });

        token = data.token;
        localStorage.setItem("yuro_token", token);
        usuarioActual = data.usuario;

        entrarApp();
    } catch (err) {
        mostrarError(err.message);
    }
});

document.getElementById("form-registro").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        const data = await api("/registro", {
            method: "POST",
            body: JSON.stringify({
                nombre: document.getElementById("registro-nombre").value,
                password: document.getElementById("registro-password").value
            })
        });

        token = data.token;
        localStorage.setItem("yuro_token", token);
        usuarioActual = { nombre: document.getElementById("registro-nombre").value };

        entrarApp();
    } catch (err) {
        mostrarError(err.message);
    }
});

async function logout() {
    try {
        await api("/logout", { method: "POST" });
    } catch (err) {
        // Ignorar error
    }

    token = null;
    usuarioActual = null;
    localStorage.removeItem("yuro_token");

    document.getElementById("nav").classList.add("oculto");
    document.getElementById("auth").classList.remove("oculto");
}

function entrarApp() {
    document.getElementById("auth").classList.add("oculto");
    document.getElementById("nav").classList.remove("oculto");

    if (usuarioActual) {
        document.getElementById("nav-usuario").textContent = usuarioActual.nombre;
    }

    mostrarPagina("panel");
}

// ==================== PANEL ====================

async function cargarPanel() {
    try {
        const perfil = await api("/perfil");
        const estado = await api("/estado");

        document.getElementById("saldo").textContent = `${formatear(perfil.saldo)} Y`;
        document.getElementById("direccion").textContent = cortaDir(perfil.direccion, 20);
        document.getElementById("recibido").textContent = formatear(perfil.recibido);
        document.getElementById("enviado").textContent = formatear(perfil.enviado);
        document.getElementById("total-usuarios").textContent = estado.usuarios;
        document.getElementById("total-bloques").textContent = estado.bloques;

        // Guardar para usar en otras páginas
        usuarioActual = { ...usuarioActual, ...perfil };
    } catch (err) {
        if (err.message.includes("autorizado")) {
            logout();
        }
    }
}

// ==================== ENVIAR ====================

async function cargarEnviar() {
    try {
        const perfil = await api("/perfil");
        document.getElementById("saldo-enviar").textContent = `${formatear(perfil.saldo)} Y`;
    } catch (err) {
        // Ignorar
    }
}

document.getElementById("form-enviar").addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
        const data = await api("/enviar", {
            method: "POST",
            body: JSON.stringify({
                destino: document.getElementById("enviar-destino").value,
                cantidad: parseFloat(document.getElementById("enviar-cantidad").value),
                concepto: document.getElementById("enviar-concepto").value
            })
        });

        mostrar(data.mensaje, "exito", "enviar-mensaje");

        // Limpiar formulario
        document.getElementById("enviar-destino").value = "";
        document.getElementById("enviar-cantidad").value = "";
        document.getElementById("enviar-concepto").value = "";

        // Actualizar saldo
        cargarEnviar();
    } catch (err) {
        mostrar(err.message, "error", "enviar-mensaje");
    }
});

// ==================== MINAR ====================

async function minar() {
    const btn = document.getElementById("btn-minar");
    btn.disabled = true;
    btn.textContent = "⏳ Minando...";

    try {
        // Generar PoW simple
        const dificultad = 3;
        let nonce = 0;
        let hash;

        while (true) {
            const data = `yuro-${nonce}-${Date.now()}`;
            const encoder = new TextEncoder();
            const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
            hash = Array.from(new Uint8Array(hashBuffer))
                .map(b => b.toString(16).padStart(2, "0"))
                .join("");

            if (hash.startsWith("0".repeat(dificultad))) {
                break;
            }
            nonce++;
        }

        const data = await api("/minar", {
            method: "POST",
            body: JSON.stringify({ nonce, hash })
        });

        mostrar(data.mensaje, "exito", "minar-mensaje");
    } catch (err) {
        mostrar(err.message, "error", "minar-mensaje");
    }

    btn.disabled = false;
    btn.textContent = "⛏️ MINAR AHORA";
}

// ==================== TABLÓN ====================

async function cargarTablon() {
    try {
        const publicaciones = await api("/tablon");
        const cont = document.getElementById("lista-tablon");

        if (publicaciones.length === 0) {
            cont.innerHTML = '<p class="sub" style="text-align:center;padding:24px">No hay publicaciones todavía</p>';
            return;
        }

        cont.innerHTML = publicaciones.map(p => `
            <div class="lista-item" style="flex-direction:column;align-items:flex-start">
                <div style="display:flex;justify-content:space-between;width:100%;margin-bottom:8px">
                    <strong>${escaparHTML(p.autor)}</strong>
                    <span class="sub">${fecha(p.timestamp)}</span>
                </div>
                <div class="titulo texto-oro">${escaparHTML(p.titulo)}</div>
                ${p.contenido ? `<div class="sub">${escaparHTML(p.contenido)}</div>` : ""}
            </div>
        `).join("");
    } catch (err) {
        console.error(err);
    }
}

document.getElementById("form-tablon").addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
        await api("/tablon", {
            method: "POST",
            body: JSON.stringify({
                titulo: document.getElementById("tablon-titulo").value,
                contenido: document.getElementById("tablon-contenido").value
            })
        });

        document.getElementById("tablon-titulo").value = "";
        document.getElementById("tablon-contenido").value = "";
        cargarTablon();
    } catch (err) {
        alert(err.message);
    }
});

// ==================== EXPLORADOR ====================

async function cargarExplorador() {
    try {
        // Bloques
        const bloques = await api("/bloques");
        const contBloques = document.getElementById("lista-bloques");

        if (bloques.length === 0) {
            contBloques.innerHTML = '<p class="sub">No hay bloques todavía</p>';
        } else {
            contBloques.innerHTML = bloques.map(b => `
                <div class="lista-item">
                    <div class="info">
                        <div class="titulo">Bloque #${b.numero}</div>
                        <div class="sub">Minero: ${escaparHTML(b.minero)}</div>
                        <div class="sub">${fecha(b.timestamp)}</div>
                    </div>
                    <div class="cantidad positivo">+${formatear(b.recompensa)} Y</div>
                </div>
            `).join("");
        }

        // Transacciones
        const transacciones = await api("/transacciones");
        const contTrans = document.getElementById("lista-transacciones");

        if (transacciones.length === 0) {
            contTrans.innerHTML = '<p class="sub">No hay transacciones todavía</p>';
        } else {
            contTrans.innerHTML = transacciones.map(t => `
                <div class="lista-item">
                    <div class="info">
                        <div class="titulo">${escaparHTML(t.nombre_de || t.de)} → ${escaparHTML(t.nombre_para || t.para)}</div>
                        <div class="sub">${t.concepto || "Sin concepto"} · ${fecha(t.timestamp)}</div>
                    </div>
                    <div class="cantidad">${formatear(t.cantidad)} Y</div>
                </div>
            `).join("");
        }
    } catch (err) {
        console.error(err);
    }
}

// ==================== RANKING ====================

async function cargarRanking() {
    try {
        const ranking = await api("/ranking");
        const cont = document.getElementById("lista-ranking");

        if (ranking.length === 0) {
            cont.innerHTML = '<p class="sub">No hay usuarios todavía</p>';
            return;
        }

        cont.innerHTML = `
            <table class="tabla">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Usuario</th>
                        <th>Saldo</th>
                    </tr>
                </thead>
                <tbody>
                    ${ranking.map((u, i) => `
                        <tr>
                            <td>${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</td>
                            <td>${escaparHTML(u.nombre)}</td>
                            <td class="texto-oro" style="font-weight:700">${formatear(u.saldo)} Y</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `;
    } catch (err) {
        console.error(err);
    }
}

// ==================== GOBIERNO ====================

async function cargarGobierno() {
    try {
        const gobierno = await api("/gobierno");
        const cont = document.getElementById("gobierno-stats");

        cont.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-icono">👥</span>
                    <span class="stat-valor">${gobierno.total_usuarios}</span>
                    <span class="stat-label">Usuarios</span>
                </div>
                <div class="stat-card">
                    <span class="stat-icono">🏦</span>
                    <span class="stat-valor">${formatear(gobierno.saldo_gobierno)} Y</span>
                    <span class="stat-label">Saldo Gobierno</span>
                </div>
                <div class="stat-card">
                    <span class="stat-icono">⛏️</span>
                    <span class="stat-valor">${gobierno.total_bloques}</span>
                    <span class="stat-label">Bloques</span>
                </div>
            </div>
        `;
    } catch (err) {
        console.error(err);
    }
}

// ==================== HELPERS ====================

function escaparHTML(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// ==================== INIT ====================

document.querySelectorAll("[data-pagina]").forEach(el => {
    el.addEventListener("click", (e) => {
        e.preventDefault();
        mostrarPagina(el.dataset.pagina);
    });
});

// Verificar sesión al cargar
(async () => {
    if (token) {
        try {
            const perfil = await api("/perfil");
            usuarioActual = perfil;
            entrarApp();
        } catch (err) {
            token = null;
            localStorage.removeItem("yuro_token");
        }
    }
})();
