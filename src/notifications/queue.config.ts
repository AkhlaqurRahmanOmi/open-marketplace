export const QUEUE_NAMES = {
  EMAIL: 'notification-email',
  REALTIME: 'notification-realtime',
} as const;

export const QUEUE_CONFIG = {
  email: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 60000, // 1 minute, then 2 min, then 4 min
    },
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs
      age: 86400, // Keep for 24 hours (in seconds)
    },
    removeOnFail: {
      count: 5000, // Keep last 5000 failed jobs for debugging
      age: 604800, // Keep for 7 days (in seconds)
    },
  },
  realtime: {
    attempts: 1, // No retry for realtime notifications
    removeOnComplete: {
      count: 100,
      age: 3600, // Keep for 1 hour
    },
  },
};
