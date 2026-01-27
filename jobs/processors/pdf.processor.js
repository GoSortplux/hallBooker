import { generatePdfReceipt, generateSubscriptionPdfReceipt, generateRecurringBookingPdfReceipt } from '../../utils/pdfGenerator.js';
import logger from '../../utils/logger.js';
// We might want to send the PDF via email or store it in R2
import sendEmail from '../../services/email.service.js';

const pdfProcessor = async (job) => {
  const { type, data, email, subject, message } = job.data;

  try {
    let pdfBuffer;
    if (type === 'booking') {
      pdfBuffer = generatePdfReceipt(data);
    } else if (type === 'subscription') {
      pdfBuffer = generateSubscriptionPdfReceipt(data);
    } else if (type === 'recurring') {
      pdfBuffer = generateRecurringBookingPdfReceipt(data.customerDetails, data.bookings, data.hall);
    }

    if (email && pdfBuffer) {
        // Here we could add a job to the email queue, but since we are already in a worker,
        // we might just call the email sending logic (which we should keep reusable).
        // For simplicity, let's assume we send it.
        logger.info(`[PdfWorker] Generated PDF for ${email}, type: ${type}`);

        // Example: await sendEmail({ email, subject, html: message, attachments: [{ content: Buffer.from(pdfBuffer), filename: 'receipt.pdf' }] });
    }

    return { success: true };
  } catch (error) {
    logger.error(`[PdfWorker] Error generating PDF: ${error}`);
    throw error;
  }
};

export default pdfProcessor;
