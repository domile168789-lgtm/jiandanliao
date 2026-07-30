export const SERVER_EVENT_CHANNEL = 'jianliao:server:event';
export const LEGACY_MESSAGE_CHANNEL = 'jianliao:message:new';
export const LEGACY_RECEIPT_CHANNEL = 'jianliao:receipt:new';

export type ServerEvent =
  | {
      type: 'message_created';
      conversationId: string;
      message: {
        id: string;
        conversationId: string;
        senderId: string;
        type: string;
        status: string;
        body: Record<string, unknown>;
        createdAt: string | Date;
      };
    }
  | {
      type: 'message_read';
      conversationId: string;
      receipt: {
        messageId: string;
        userId: string;
        type: 'DELIVERED' | 'READ';
        createdAt: string | Date;
      };
    }
  | {
      type: 'system_notice';
      conversationId: string;
      noticeId: string;
      title: string;
      content: string;
      actionUrl?: string | null;
      targetUserIds?: string[];
    }
  | {
      type: 'moderation_result';
      conversationId: string;
      targetUserId: string;
      status: 'restricted' | 'released';
      messageId?: string;
      content: string;
    }
  | {
      type: 'activity_published';
      activityId: string;
      title: string;
      status: 'PUBLISHED';
    };

export const buildServerEvent = <T extends ServerEvent>(event: T) => event;
