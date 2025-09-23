import { createRequire } from 'module';
import autoTable from 'jspdf-autotable';
import { formatDuration } from './time.js';

const require = createRequire(import.meta.url);
const { jsPDF } = require('jspdf');

const generatePdfReceipt = (booking) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(40);
    doc.text('Booking Confirmation Receipt', 105, 25, null, null, 'center');

    // Sub-header
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Booking ID: ${booking._id}`, 105, 35, null, null, 'center');

    // Billed To Section
    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text('Billed To', 14, 55);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(booking.user.fullName, 14, 62);
    doc.text(booking.user.email, 14, 69);

    // Booking Details Table
    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text('Booking Details', 14, 85);

    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    const startDate = new Date(booking.startTime);
    const endDate = new Date(booking.endTime);
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

    const isSameDay = startDate.getFullYear() === endDate.getFullYear() &&
                      startDate.getMonth() === endDate.getMonth() &&
                      startDate.getDate() === endDate.getDate();

    const formattedDate = isSameDay
      ? startDate.toLocaleDateString('en-US', dateOptions)
      : `${startDate.toLocaleDateString('en-US', dateOptions)} - ${endDate.toLocaleDateString('en-US', dateOptions)}`;

    const tableBody = [
        ['Venue', booking.venue.name],
        ['Location', booking.venue.location],
        ['Date', formattedDate],
        ['Time', `${startDate.toLocaleTimeString('en-US', timeOptions)} - ${endDate.toLocaleTimeString('en-US', timeOptions)}`],
        ['Duration', formatDuration(startDate, endDate)],
        ['Event Details', booking.eventDetails],
        ['Payment Status', booking.paymentStatus],
        [{ content: 'Total Price', styles: { fontStyle: 'bold' } }, { content: `NGN ${booking.totalPrice.toLocaleString()}`, styles: { fontStyle: 'bold' } }],
    ];

    autoTable(doc, {
        startY: 92,
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [22, 160, 133] },
        didDrawPage: function (data) {
            // Footer
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text('Thank you for booking with HallBooker.', data.settings.margin.left, doc.internal.pageSize.height - 15);
        }
    });

    return doc.output('arraybuffer');
};

export { generatePdfReceipt };
