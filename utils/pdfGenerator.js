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
        ['Payment Method', booking.paymentMethod],
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

const generateSubscriptionPdfReceipt = (subscription) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(40);
    doc.text('Subscription Purchase Receipt', 105, 25, null, null, 'center');

    // Sub-header
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Transaction ID: ${subscription.transactionId}`, 105, 35, null, null, 'center');

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
