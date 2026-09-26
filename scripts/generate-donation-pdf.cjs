const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generateDonationPDF(donorData) {
  try {
    const doc = new PDFDocument();
    const filename = `Declaracion_Jurada_${Date.now()}.pdf`;
    const outputDir = path.resolve(__dirname, '..', 'downloads');
    const outputPath = path.resolve(outputDir, filename);
    const fingerprintPath = path.resolve(__dirname, '..', 'public', 'assets', 'fingerprint-profesional.png');

    console.log('📁 Ruta huella:', fingerprintPath);
    console.log('✅ Archivo existe:', fs.existsSync(fingerprintPath));

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (!fs.existsSync(fingerprintPath)) {
      console.error('❌ Error: No se encontró fingerprint-profesional.png');
      console.error('   Busca en:', fingerprintPath);
      return null;
    }

    doc.pipe(fs.createWriteStream(outputPath));

    doc.fontSize(16)
      .font('Helvetica-Bold')
      .text('DECLARACIÓN JURADA DE RECEPCIÓN DE DONACIÓN', { align: 'center' });

    doc.moveDown();
    doc.fontSize(11).font('Helvetica');
    doc.text(`Yo, ${donorData.nombre}, identificado(a) con DNI/CE N° ${donorData.dni}`);
    doc.moveDown();
    doc.text('Declaro que he recibido en calidad de donación el siguiente bien:');
    doc.moveDown();
    doc.text(`Monto: ${donorData.monto}`);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-PE')}`);
    doc.moveDown(2);

    try {
      doc.image(fingerprintPath, 420, 100, {
        width: 120,
        height: 160,
        align: 'center',
      });

      doc.fontSize(9)
        .font('Helvetica-Bold')
        .text('Firma Digital Autenticada', 420, 270, { align: 'center' });

      console.log('✅ Huella insertada correctamente');
    } catch (error) {
      console.error('❌ Error al insertar huella:', error.message);
    }

    doc.end();

    console.log(`✅ PDF generado en: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('❌ Error al generar el PDF:', error.message);
    return null;
  }
}

const result = generateDonationPDF({
  nombre: 'Codigo rojas Flutter',
  dni: '76815695',
  monto: 'S/ 100.00',
});

console.log('📄 Resultado:', result);
