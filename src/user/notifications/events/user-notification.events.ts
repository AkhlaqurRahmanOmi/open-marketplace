export const UserNotificationEvents = {
  USER_REGISTERED: 'user.registered',
  OTP_REQUESTED: 'user.otp.requested',
  USER_VERIFIED: 'user.verified',
  PASSWORD_RESET_REQUESTED: 'user.password.reset.requested',
  PASSWORD_CHANGED: 'user.password.changed',
} as const;

export type UserNotificationEvent =
  (typeof UserNotificationEvents)[keyof typeof UserNotificationEvents];
