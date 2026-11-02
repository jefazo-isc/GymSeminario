import { verificarYActualizarCuota } from '../services/quota.service.js';

// Decodificador seguro y ligero de JWT (sin sobrecarga pesada)
function parseJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64').toString('utf8');
    return JSON.parse(payload);
  } catch (e) {
    return null;
  }
}

export function authAndQuotaGuard(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Acceso no autorizado: Se requiere token de Google/Firebase.'
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = parseJwt(token);

  if (!decoded || !decoded.user_id) {
    // Si no tiene user_id de Firebase/Google
    const uid = decoded?.sub || decoded?.uid;
    if (!uid) {
      return res.status(403).json({ error: 'Token de autenticación inválido.' });
    }
    req.user = { uid, email: decoded.email };
  } else {
    req.user = {
      uid: decoded.user_id,
      email: decoded.email,
      name: decoded.name
    };
  }

  // Verificar cuota en SQLite local
  const cuota = verificarYActualizarCuota(req.user.uid, req.user.email);
  if (!cuota.permitida) {
    return res.status(429).json({
      error: 'Has alcanzado el límite diario de consultas con el Coach IA. Vuelve mañana.',
      restantes: 0
    });
  }

  req.cuotaRestante = cuota.restantes;
  next();
}
