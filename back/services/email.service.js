import nodemailer from 'nodemailer';

/**
 * Plantilla HTML responsive para el correo de confirmación de agendamiento
 */
function getBookingHtmlTemplate({ nombre, entrenamiento, fecha, turno }) {
  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
      .container { max-width: 580px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155; }
      .header { background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); padding: 32px 24px; text-align: center; }
      .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
      .header p { margin: 8px 0 0 0; color: #fecdd3; font-size: 14px; }
      .content { padding: 32px 24px; }
      .greeting { font-size: 18px; font-weight: 600; color: #f1f5f9; margin-bottom: 16px; }
      .card { background-color: #0f172a; border-radius: 12px; padding: 20px; border: 1px solid #334155; margin: 20px 0; }
      .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #1e293b; }
      .row:last-child { border-bottom: none; }
      .label { color: #94a3b8; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
      .value { color: #f8fafc; font-weight: 700; font-size: 15px; }
      .badge { display: inline-block; background-color: rgba(225, 29, 72, 0.2); color: #fb7185; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; border: 1px solid rgba(225, 29, 72, 0.4); }
      .tips { background-color: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-top: 24px; }
      .tips p { margin: 0; color: #93c5fd; font-size: 13px; line-height: 1.5; }
      .footer { padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #334155; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>espacioGYM · GROM 21</h1>
        <p>Confirmación de Agendamiento de Clase</p>
      </div>
      <div class="content">
        <div class="greeting">¡Hola, ${nombre}! 👋</div>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-top: 0;">
          Tu entrenamiento ha quedado agendado exitosamente. A continuación te presentamos el resumen de tu sesión:
        </p>
        
        <div class="card">
          <div class="row">
            <span class="label">🏋️ Actividad</span>
            <span class="value">${entrenamiento}</span>
          </div>
          <div class="row">
            <span class="label">📅 Fecha</span>
            <span class="value">${fecha}</span>
          </div>
          <div class="row">
            <span class="label">⏰ Turno</span>
            <span class="value"><span class="badge">${turno}</span></span>
          </div>
          <div class="row">
            <span class="label">📍 Ubicación</span>
            <span class="value">GROM 21 Center</span>
          </div>
        </div>

        <div class="tips">
          <p>💡 <strong>Recomendaciones:</strong> Preséntate con 10 minutos de anticipación, lleva toalla personal, botella de agua y ropa deportiva adecuada. Recuerda mostrar tu código QR de asistencia en recepción.</p>
        </div>
      </div>
      <div class="footer">
        © 2026 espacioGYM · GROM 21. Plataforma Web Académica de Seminario.<br>
        Este es un correo automático de confirmación, por favor no respondas a este mensaje.
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Plantilla HTML para asistencia
 */
function getAttendanceHtmlTemplate({ nombre, clase, fecha, hora }) {
  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; margin: 0; }
      .container { max-width: 580px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 28px; }
      h2 { color: #10b981; margin-top: 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>✅ Asistencia Registrada — espacioGYM</h2>
      <p>Hola <strong>${nombre}</strong>, tu asistencia ha sido validada:</p>
      <ul>
        <li><strong>Clase:</strong> ${clase}</li>
        <li><strong>Fecha:</strong> ${fecha}</li>
        <li><strong>Hora:</strong> ${hora}</li>
      </ul>
      <p style="color: #94a3b8; font-size: 13px;">¡Buen entrenamiento!</p>
    </div>
  </body>
  </html>
  `;
}

/**
 * Envía un correo usando el proveedor configurado disponible (Resend HTTP, Brevo HTTP o Nodemailer SMTP)
 */
export async function sendEmail({ to, subject, html, text }) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const brevoApiKey = process.env.BREVO_API_KEY;
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  console.log(`[EMAIL] Intentando enviar correo a: ${to} | Asunto: "${subject}"`);

  // 1. Prioridad: Resend API (HTTP Port 443 — no bloqueado en Render ni en nube)
  if (resendApiKey) {
    try {
      console.log('[EMAIL] Usando proveedor: Resend API (HTTPS)');
      const fromEmail = process.env.EMAIL_FROM || 'espacioGYM <onboarding@resend.dev>';
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject: subject,
          html: html,
          text: text
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Resend API Error (${response.status}): ${JSON.stringify(data)}`);
      }

      console.log('✅ [EMAIL] Correo enviado exitosamente vía Resend:', data);
      return { exito: true, proveedor: 'resend', id: data.id };
    } catch (err) {
      console.error('❌ [EMAIL] Error en Resend API:', err.message);
      // Continuar al siguiente proveedor si falla
    }
  }

  // 2. Brevo API (HTTP Port 443 — sin bloqueo de puertos)
  if (brevoApiKey) {
    try {
      console.log('[EMAIL] Usando proveedor: Brevo API (HTTPS)');
      const fromEmail = process.env.EMAIL_FROM || 'cuentaalumnosterceroc@gmail.com';
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'espacioGYM · GROM 21', email: fromEmail },
          to: [{ email: to }],
          subject: subject,
          htmlContent: html,
          textContent: text
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Brevo API Error (${response.status}): ${JSON.stringify(data)}`);
      }

      console.log('✅ [EMAIL] Correo enviado exitosamente vía Brevo:', data);
      return { exito: true, proveedor: 'brevo', id: data.messageId };
    } catch (err) {
      console.error('❌ [EMAIL] Error en Brevo API:', err.message);
      // Continuar al siguiente proveedor si falla
    }
  }

  // 3. Nodemailer SMTP (con timeout estricto de 4s para evitar cuelgues si Render bloquea el puerto)
  if (emailUser && emailPass) {
    try {
      console.log(`[EMAIL] Usando proveedor: Nodemailer SMTP (${emailUser})`);
      const transporter = nodemailer.createTransport({
        service: process.env.SMTP_SERVICE || 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass
        },
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 4000
      });

      const info = await transporter.sendMail({
        from: `espacioGYM <${emailUser}>`,
        to: to,
        subject: subject,
        text: text,
        html: html
      });

      console.log('✅ [EMAIL] Correo enviado exitosamente vía Nodemailer SMTP:', info.messageId);
      return { exito: true, proveedor: 'smtp', id: info.messageId };
    } catch (err) {
      console.error('❌ [EMAIL] Error en Nodemailer SMTP (puerto posiblemente bloqueado en la nube):', err.message);
    }
  }

  // 4. Modo Simulación / Log (cuando no hay credenciales activas válidas)
  console.warn('⚠️ [EMAIL] No se pudo enviar por ningún proveedor (credenciales no configuradas o puertos bloqueados).');
  console.log(`[EMAIL MOCK] Para: ${to} | Asunto: ${subject}`);
  return {
    exito: false,
    proveedor: 'ninguno',
    aviso: 'Configura RESEND_API_KEY, BREVO_API_KEY o credenciales SMTP en las variables de entorno para entrega real.'
  };
}

/**
 * Función pública para agendamiento de entrenamiento
 */
export async function sendBookingNotification({ correo, nombre, entrenamiento, fecha, turno }) {
  const subject = `🏋️ Confirmación de entrenamiento: ${entrenamiento} - espacioGYM`;
  const text = `Hola ${nombre},\n\nTu entrenamiento ha sido confirmado:\n- Actividad: ${entrenamiento}\n- Fecha: ${fecha}\n- Turno: ${turno}\n\n¡Te esperamos en GROM 21!`;
  const html = getBookingHtmlTemplate({ nombre, entrenamiento, fecha, turno });

  return await sendEmail({ to: correo, subject, html, text });
}

/**
 * Función pública para confirmación de asistencia
 */
export async function sendAttendanceNotification({ correo, nombre, clase, fecha, hora }) {
  const subject = `✅ Confirmación de Asistencia: ${clase} - espacioGYM`;
  const text = `Hola ${nombre},\n\nTu asistencia a la clase de ${clase} ha sido confirmada el ${fecha} a las ${hora}.`;
  const html = getAttendanceHtmlTemplate({ nombre, clase, fecha, hora });

  return await sendEmail({ to: correo, subject, html, text });
}
