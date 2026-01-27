import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { ExpressAdapter } from '@bull-board/express';

import emailQueue from '../jobs/queues/email.queue.js';
import notificationQueue from '../jobs/queues/notification.queue.js';
import analyticsQueue from '../jobs/queues/analytics.queue.js';
import pdfQueue from '../jobs/queues/pdf.queue.js';
import bookingQueue from '../jobs/queues/booking.queue.js';
import mediaQueue from '../jobs/queues/media.queue.js';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),
    new BullMQAdapter(notificationQueue),
    new BullMQAdapter(analyticsQueue),
    new BullMQAdapter(pdfQueue),
    new BullMQAdapter(bookingQueue),
    new BullMQAdapter(mediaQueue),
  ],
  serverAdapter: serverAdapter,
});

export default serverAdapter;
