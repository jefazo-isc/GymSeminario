import express from 'express';
import db from '../services/db.js';
import { authGuard, requireRole } from '../middleware/auth.middleware.js';

export function createProductsRouter() {
  const router = express.Router();

  router.get('/api/products', (req, res) => {
    try {
      const categoria = req.query.categoria ? String(req.query.categoria).trim().toLowerCase() : '';
      const includeInactive = req.query.all === 'true';

      let sql = 'SELECT * FROM products WHERE 1=1';
      const params = [];
      if (!includeInactive) {
        sql += ' AND activo = 1';
      }
      if (categoria) {
        sql += ' AND lower(categoria) = ?';
        params.push(categoria);
      }
      sql += ' ORDER BY id ASC';

      const rows = db.prepare(sql).all(...params);
      return res.json(rows);
    } catch (err) {
      console.error('Error en GET /api/products:', err);
      return res.status(500).json({ error: 'Error al consultar catálogo de productos.' });
    }
  });

  router.post('/api/products', authGuard, requireRole('admin'), (req, res) => {
    try {
      const b = req.body || {};
      const nombre = String(b.nombre || '').trim();
      const precio = Number(b.precio);
      if (!nombre || !Number.isFinite(precio) || precio <= 0) {
        return res.status(400).json({ error: 'Nombre y precio válido (> 0) requeridos.' });
      }
      const result = db.prepare(`
        INSERT INTO products (nombre, descripcion, precio, imagen, categoria, stock, activo, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))
      `).run(
        nombre,
        String(b.descripcion || '').trim(),
        Number(precio.toFixed(2)),
        String(b.imagen || 'img/product-placeholder.svg').trim(),
        String(b.categoria || 'accesorio').trim().toLowerCase(),
        Math.max(0, Number(b.stock ?? 25)),
      );
      const created = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
      return res.status(201).json(created);
    } catch (err) {
      console.error('Error en POST /api/products:', err);
      return res.status(500).json({ error: 'Error al crear producto.' });
    }
  });

  router.put('/api/products/:id', authGuard, requireRole('admin'), (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      if (!existing) {
        return res.status(404).json({ error: 'Producto no encontrado.' });
      }
      const b = req.body || {};
      const nextPrecio = b.precio !== undefined ? Number(b.precio) : existing.precio;
      if (!Number.isFinite(nextPrecio) || nextPrecio <= 0) {
        return res.status(400).json({ error: 'El precio debe ser mayor a 0.' });
      }
      db.prepare(`
        UPDATE products SET
          nombre = ?,
          descripcion = ?,
          precio = ?,
          imagen = ?,
          categoria = ?,
          stock = ?,
          activo = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        String(b.nombre || existing.nombre).trim(),
        b.descripcion !== undefined ? String(b.descripcion).trim() : existing.descripcion,
        Number(nextPrecio.toFixed(2)),
        b.imagen !== undefined ? String(b.imagen).trim() : existing.imagen,
        b.categoria !== undefined ? String(b.categoria).trim().toLowerCase() : existing.categoria,
        b.stock !== undefined ? Math.max(0, Number(b.stock)) : existing.stock,
        b.activo !== undefined ? (b.activo ? 1 : 0) : existing.activo,
        id,
      );
      const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      return res.json(updated);
    } catch (err) {
      console.error('Error en PUT /api/products/:id:', err);
      return res.status(500).json({ error: 'Error al actualizar producto.' });
    }
  });

  router.delete('/api/products/:id', authGuard, requireRole('admin'), (req, res) => {
    try {
      const id = Number(req.params.id);
      const result = db.prepare('DELETE FROM products WHERE id = ?').run(id);
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Producto no encontrado.' });
      }
      return res.json({ ok: true, id, mensaje: 'Producto eliminado' });
    } catch (err) {
      console.error('Error en DELETE /api/products/:id:', err);
      return res.status(500).json({ error: 'Error al eliminar producto.' });
    }
  });

  return router;
}
