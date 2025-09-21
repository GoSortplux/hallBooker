import jsPDF from 'jspdf';
import 'jspdf-autotable';

const generatePdfReceipt = (booking) => {
    const doc = new jsPDF();

    // Add header
    doc.setFontSize(20);
    doc.text('Hall Booking Receipt', 105, 20, null, null, 'center');

    // Add booking details
    doc.setFontSize(12);
    doc.text(`Booking ID: ${booking._id}`, 14, 40);
    doc.text(`Booking Date: ${new Date(booking.createdAt).toLocaleDateString()}`, 14, 50);

    // Add user details
    doc.text('Billed To:', 14, 70);
    doc.text(booking.user.fullName, 14, 76);
    doc.text(booking.user.email, 14, 82);

    // Add table with booking info
    const tableColumn = ["Venue", "Date", "Start Time", "End Time", "Price"];
    const tableRows = [[
        booking.venue.name,
        new Date(booking.bookingDate).toLocaleDateString(),
        booking.startTime,
        booking.endTime,
        `NGN ${booking.totalPrice}`
    ]];

    doc.autoTable({
        startY: 95,
        head: [tableColumn],
        body: tableRows,
    });

    // Add footer with expiration warning
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(
            'Your hall renting will expire and you will not have access to the hall once the booking time is over.',
            105,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
        );
    }

    return doc.output('arraybuffer');
};

export { generatePdfReceipt };
