// Migración: permite login temporal con password temporal
// Se usa UNA SOLA VEZ para migrar desde PythonAnywhere

export async function migrarUsuario(db, nombre, passwordTemp) {
  const hash = await hashPassword(passwordTemp);
  await db.prepare(
    "UPDATE usuarios SET password_hash = ?, necesita_cambiar_password = 1 WHERE nombre = ?"
  ).bind(hash, nombre).run();
}
