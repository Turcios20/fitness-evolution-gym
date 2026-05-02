const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const enviarCorreoRegistro = async (emailCliente, nombreCliente) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: emailCliente,
        subject: 'Comprobante de Registro - EVOLUTIONS GYM',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h1 style="color: #333;">Hola ${nombreCliente},</h1>
                <p>Tu registro se ha completado con éxito.</p>
                <p>Este correo sirve como comprobante de tu inscripción en el sistema.</p>
                <p>¡Ya puedes comenzar a entrenar con nosotros!</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Correo automatizado enviado a', emailCliente);
    } catch (error) {
        console.error('Error enviando correo:', error);
    }
};

module.exports = { enviarCorreoRegistro };