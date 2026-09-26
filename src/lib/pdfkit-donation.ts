const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generateDonationPDF(donorData: { nombre: any; dni: any; monto: any; }) {
  const doc = new PDFDocument();
  const filename = `Declaracion_Jurada_${Date.now()}.pdf`;
  
  // 🔥 RUTA ABSOLUTA - Usa esta directamente
  const fingerprintPath = path.join(
    __dirname,
    '../../public/assets/fingerprint-profesional.png'
  );
  
  console.log('🔍 Ruta calculada:', fingerprintPath);
  console.log('✅ Archivo existe:', fs.existsSync(fingerprintPath));
  
  // Crear carpeta output si no existe
  const outputDir = path.join(__dirname, '../../downloads');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, filename);
  doc.pipe(fs.createWriteStream(outputPath));
  
  // Título
  doc.fontSize(16).font('Helvetica-Bold')
    .text('DECLARACIÓN JURADA DE RECEPCIÓN DE DONACIÓN', { align: 'center' });
  doc.moveDown();
  
  // Contenido
  doc.fontSize(11).font('Helvetica');
  doc.text(`Yo, ${donorData.nombre}, identificado(a) con DNI/CE N° ${donorData.dni}`);
  doc.text(`con domicilio en calle lima f1, urb lima f4`);
  doc.moveDown();
  doc.text(`Declaro que el día de hoy he recibido en calidad de`);
  doc.text(`donación y sin costo alguno, conforme a ley.`);
  doc.moveDown();
  doc.text(`Monto: ${donorData.monto}`);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-PE')}`);
  doc.moveDown(2);
  
  // ✅ INSERTAR HUELLA
  try {
    doc.image(fingerprintPath, 420, 100, { 
      width: 120, 
      height: 160
    });
    
    doc.fontSize(9).font('Helvetica-Bold')
      .text('Firma Digital Autenticada', 420, 270, { align: 'center' });
    
    console.log('✅ Huella insertada exitosamente');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('❌ Error al insertar huella:', message);
  }
  
  doc.end();
  
  console.log(`✅ PDF generado: ${outputPath}`);
  return outputPath;
}

// Exportar
module.exports = { generateDonationPDF };