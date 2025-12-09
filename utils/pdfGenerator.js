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
    doc.text(`Booking ID: ${booking.bookingId}`, 105, 35, null, null, 'center');

    // Billed To Section
    const userDetails = booking.bookingType === 'walk-in' ? booking.walkInUserDetails : booking.user;
    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text('Billed To', 14, 55);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(userDetails.fullName, 14, 62);
    if (userDetails.email) {
        doc.text(userDetails.email, 14, 69);
    }

    // Booking Details Table
    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text('Booking Details', 14, 85);

    const directionUrl = booking.hall.directionUrl;

    const tableBody = [
        ['Hall', booking.hall.name],
        ['Location', booking.hall.location],
        ['Event Details', booking.eventDetails],
        ['Payment Method', booking.paymentMethod],
        ['Payment Status', booking.paymentStatus],
    ];

    if (directionUrl) {
        tableBody.splice(2, 0, ['Directions', 'Get Directions']);
    }

    autoTable(doc, {
        startY: 92,
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [22, 160, 133] },
        didDrawCell: function (data) {
            if (
                data.cell.section === 'body' &&
                data.column.index === 1 &&
                data.row.cells[0].text[0] === 'Directions'
            ) {
                doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, {
                    url: directionUrl,
                });
            }
        },
    });

    const bookingDatesBody = booking.bookingDates.map(bookingDate => {
        const startDate = new Date(bookingDate.startTime);
        const endDate = new Date(bookingDate.endTime);
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

        const isSameDay = startDate.getFullYear() === endDate.getFullYear() &&
                          startDate.getMonth() === endDate.getMonth() &&
                          startDate.getDate() === endDate.getDate();

        const formattedDate = isSameDay
          ? startDate.toLocaleDateString('en-US', dateOptions)
          : `${startDate.toLocaleDateString('en-US', dateOptions)} - ${endDate.toLocaleDateString('en-US', dateOptions)}`;

        const timeWithOptions = { hour: '2-digit', minute: '2-digit', hour12: true };

        const formattedTime = `${startDate.toLocaleTimeString('en-US', timeWithOptions)} - ${endDate.toLocaleTimeString('en-US', timeWithOptions)}`;

        return [formattedDate, formattedTime, formatDuration(startDate, endDate)];
    });

    autoTable(doc, {
        head: [['Date', 'Time', 'Duration']],
        body: bookingDatesBody,
        theme: 'striped',
        headStyles: { fillColor: [22, 160, 133] },
    });

    const costBody = [
        ['Hall Price', `NGN ${(booking.hallPrice || 0).toLocaleString()}`],
        ['Facilities Price', `NGN ${(booking.facilitiesPrice || 0).toLocaleString()}`],
        [{ content: 'Total Price', styles: { fontStyle: 'bold' } }, { content: `NGN ${booking.totalPrice.toLocaleString()}`, styles: { fontStyle: 'bold' } }],
    ];

    autoTable(doc, {
        body: costBody,
        theme: 'grid',
    });

    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('Thank you for booking with HallBooker.', 14, doc.internal.pageSize.height - 15);

    return doc.output('arraybuffer');
};

const generateSubscriptionPdfReceipt = (subscription) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(40);
    doc.text('Subscription Purchase Receipt', 105, 25, null, null, 'center');

    // Sub-header
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Transaction Reference: ${subscription.transactionReference}`, 105, 35, null, null, 'center');

    // Billed To Section
    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text('Billed To', 14, 55);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(subscription.owner.fullName, 14, 62);
    doc.text(subscription.owner.email, 14, 69);

    // Subscription Details Table
    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text('Subscription Details', 14, 85);

    const purchaseDate = new Date(subscription.purchaseDate);
    const expiryDate = new Date(subscription.expiryDate);
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };

    const tableBody = [
        ['Subscription Tier', subscription.tier.name],
        ['Purchase Date', purchaseDate.toLocaleDateString('en-US', dateOptions)],
        ['Expiry Date', expiryDate.toLocaleDateString('en-US', dateOptions)],
        ['Duration', `${subscription.tier.durationInDays} days`],
        ['Payment Method', subscription.paymentMethod],
        ['Payment Reference', subscription.paymentReference],
        ['Transaction Reference', subscription.transactionReference],
        [{ content: 'Amount Paid', styles: { fontStyle: 'bold' } }, { content: `NGN ${subscription.price.toLocaleString()}`, styles: { fontStyle: 'bold' } }],
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
            doc.text('Thank you for subscribing to HallBooker.', data.settings.margin.left, doc.internal.pageSize.height - 15);
        }
    });

    return doc.output('arraybuffer');
};

export { generatePdfReceipt, generateSubscriptionPdfReceipt };
