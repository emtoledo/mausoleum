/**
 * PDF Generator Utility
 * 
 * Generates PDF from approval proof HTML content using jsPDF and html2canvas
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generate PDF from approval proof container element
 * @param {HTMLElement} element - The container element to convert to PDF
 * @param {string} filename - Optional filename for the PDF
 * @returns {Promise<Blob>} PDF blob
 */
export async function generateApprovalPDF(element, filename = 'approval-proof.pdf') {
  if (!element) {
    throw new Error('Element is required for PDF generation');
  }

  try {
    // Use html2canvas to capture the element as an image
    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      useCORS: true,
      logging: false,
      backgroundColor: '#f5f5f5',
      width: element.scrollWidth,
      height: element.scrollHeight
    });

    // Convert canvas to image data
    const imgData = canvas.toDataURL('image/png');

    // Calculate PDF dimensions (A4 landscape size in mm)
    const pdfWidth = 297; // A4 landscape width in mm
    const pdfHeight = 210; // A4 landscape height in mm
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    // Calculate aspect ratio
    const ratio = imgWidth / imgHeight;
    let finalWidth = pdfWidth;
    let finalHeight = pdfWidth / ratio;

    // If content is taller than one page, we'll need multiple pages
    const pdf = new jsPDF('l', 'mm', 'a4'); // 'l' = landscape orientation
    
    if (finalHeight <= pdfHeight) {
      // Content fits on one page
      pdf.addImage(imgData, 'PNG', 0, 0, finalWidth, finalHeight);
    } else {
      // Content spans multiple pages
      let heightLeft = finalHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, finalWidth, finalHeight);
      heightLeft -= pdfHeight;

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - finalHeight;
        pdf.addPage('l', 'a4'); // Add landscape pages
        pdf.addImage(imgData, 'PNG', 0, position, finalWidth, finalHeight);
        heightLeft -= pdfHeight;
      }
    }

    // Return PDF as blob
    return pdf.output('blob');
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

/**
 * Generate PDF and return as data URL
 * @param {HTMLElement} element - The container element to convert to PDF
 * @returns {Promise<string>} PDF as data URL
 */
export async function generateApprovalPDFAsDataURL(element) {
  const blob = await generateApprovalPDF(element);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

