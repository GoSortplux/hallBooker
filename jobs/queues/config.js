export const defaultQueueOptions = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 24 * 3600, // keep up to 24 hours
      count: 1000, // keep up to 1000 jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // keep up to 7 days
    },
  },
};
