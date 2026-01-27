import { generatePdfReceipt, generateRecurringBookingPdfReceipt, generateSubscriptionPdfReceipt } from '../../utils/pdfGenerator.js';
import emailQueue from '../queues/email.queue.js';

const pdfProcessor = async (job) => {
  const { type, data, emailOptions } = job.data;

  let pdfContent;
  let filename = 'receipt.pdf';

  try {
    if (type === 'booking') {
      pdfContent = generatePdfReceipt(data.booking);
      filename = `receipt-${data.booking.bookingId}.pdf`;
    } else if (type === 'recurring') {
      pdfContent = generateRecurringBookingPdfReceipt(data.customerDetails, data.bookings, data.hall);
      filename = `receipt-recurring-${data.bookings[0].recurringBookingId}.pdf`;
    } else if (type === 'subscription') {
      pdfContent = generateSubscriptionPdfReceipt(data.subscription);
      filename = `receipt-subscription-${data.subscription.transactionReference}.pdf`;
    }

    if (pdfContent) {
      const attachments = [
        {
          filename,
          content: Buffer.from(pdfContent),
          contentType: 'application/pdf',
        },
      ];

      await emailQueue.add('sendEmail', {
        ...emailOptions,
        attachments,
      });
      console.log(`[PdfWorker] PDF generated and email queued for ${emailOptions.email}`);
    }
  } catch (error) {
    console.error(`[PdfWorker] Error generating PDF for ${emailOptions.email}:`, error);
    throw error;
  }
};

export default pdfProcessor;
