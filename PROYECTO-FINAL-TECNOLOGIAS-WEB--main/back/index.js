const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
const twilio = require('twilio');
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.post('/enviar-correo', async (req, res) => {
  const { correo, nombre, entrenamiento, fecha, turno } = req.body;

  if (!correo || !nombre || !entrenamiento || !fecha || !turno) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'carlosvm12345678@gmail.com',
      pass: 'temoxwazusjxxrnr'
    }
  });

  const mailOptions = {
    from: 'carlosvm12345678@gmail.com',
    to: correo,
    subject: 'Confirmación de entrenamiento',
    text: `Hola ${nombre},

Gracias por registrarte al entrenamiento. Aquí están los detalles:

- 🏋️ Entrenamiento: ${entrenamiento}
- 📅 Fecha: ${fecha}
- ⏰ Turno: ${turno}

¡Nos vemos pronto!

Saludos,
GROM`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ mensaje: 'Correo enviado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al enviar el correo' });
  }
});


app.post('/enviar-asistencia', async (req, res) => {
  const { correo, nombre, clase, fecha, hora } = req.body;

  if (!correo || !nombre || !clase || !fecha || !hora) {
    return res.status(400).json({ mensaje: 'Faltan campos requeridos.' });
  }

  try {
    // Configura tu transporte de correo
    const transporter = nodemailer.createTransport({
      service: 'gmail', // O el servicio que uses
      auth: {
         user: 'carlosvm12345678@gmail.com',
         pass: 'temoxwazusjxxrnr'
      }
    });

    const info = await transporter.sendMail({
      from: 'tu-correo@gmail.com',
      to: correo,
      subject: 'Confirmación de Asistencia',
      html: `
        <h2>Hola ${nombre}</h2>
        <p>Tu asistencia se ha registrado correctamente:</p>
        <ul>
          <li><strong>Clase:</strong> ${clase}</li>
          <li><strong>Fecha:</strong> ${fecha}</li>
          <li><strong>Hora:</strong> ${hora}</li>
        </ul>
        <p>¡Gracias por asistir!</p>
      `
    });

    res.status(200).json({ mensaje: 'Correo enviado', info });
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    res.status(500).json({ mensaje: 'Error al enviar el correo.' });
  }
});



///////////api celular
const accountSid = 'TU_TWILIO_ACCOUNT_SID';
const authToken = 'TU_TWILIO_AUTH_TOKEN';
const client = twilio(accountSid, authToken);

// Ruta para enviar SMS
app.post('/enviar-sms', async (req, res) => {
  const { telefono, mensaje } = req.body;

  try {
    const response = await client.messages.create({
      body: mensaje,
      from: '+15077095977',
      to: telefono,
    });

    res.status(200).send({ success: true, sid: response.sid });
  } catch (error) {
    console.error('Error al enviar SMS:', error);
    res.status(500).send({ success: false, error: error.message });
  }
});


app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});