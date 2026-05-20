export type NotificationChannel = "alimtalk_mock" | "sms_mock" | "email_mock";

export type NotificationMockMessage = {
  channel: NotificationChannel;
  recipientMasked: string;
  templateCode: string;
  payload: Record<string, string>;
};

export type NotificationMockResult = {
  id: string;
  status: "queued_mock" | "sent_mock" | "failed_mock";
  message: string;
};

export function sendNotificationMock(message: NotificationMockMessage): NotificationMockResult {
  return {
    id: `notification-mock-${message.templateCode}`,
    status: "queued_mock",
    message: `${message.channel} queued for ${message.recipientMasked}. No provider API was called.`,
  };
}

export function failNotificationMock(templateCode: string): NotificationMockResult {
  return {
    id: `notification-failed-${templateCode}`,
    status: "failed_mock",
    message: "Mock failure only. Kakao Alimtalk sender/template approval remains blocked.",
  };
}
