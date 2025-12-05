import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  OrganizationMembersInvitedEvent,
  DocumentApprovedEvent,
  DocumentRejectedEvent,
} from '../events/organization.events';
import { NotificationManagerService } from '../services/notification-manager.service';

@Injectable()
export class OrganizationEventListener {
  private readonly logger = new Logger(OrganizationEventListener.name);

  constructor(private readonly notificationManager: NotificationManagerService) {}

  @OnEvent('organization.members.invited', { async: true })
  async handleMembersInvited(event: OrganizationMembersInvitedEvent) {
    try {
      this.logger.log(
        `Handling organization.members.invited event for ${event.invitations.length} invitations [traceId: ${event.traceId}]`,
      );

      // Use batch sending for bulk invites
      await this.notificationManager.sendBatch(
        'organization.members.invited',
        event.invitations.map((invitation) => ({
          userId: invitation.userId,
          data: {
            organizationId: event.organizationId,
            organizationName: event.organizationName,
            inviteLink: invitation.inviteLink,
            inviterName: event.invitedBy.name,
            email: invitation.email,
          },
        })),
      );

      this.logger.log(
        `✅ Organization invite notifications sent: ${event.invitations.length} invites`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to send organization invite notifications:`,
        error.stack,
      );
    }
  }

  @OnEvent('document.approved', { async: true })
  async handleDocumentApproved(event: DocumentApprovedEvent) {
    try {
      this.logger.log(
        `Handling document.approved event for document ${event.documentId} [traceId: ${event.traceId}]`,
      );

      await this.notificationManager.sendForEvent('document.approved', {
        userId: event.uploadedBy,
        data: {
          documentId: event.documentId,
          documentName: event.documentName,
          documentType: event.documentType,
          approvedByName: event.approvedBy.name,
        },
      });

      this.logger.log(`✅ Document approved notification sent for document ${event.documentId}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send document approved notification:`,
        error.stack,
      );
    }
  }

  @OnEvent('document.rejected', { async: true })
  async handleDocumentRejected(event: DocumentRejectedEvent) {
    try {
      this.logger.log(
        `Handling document.rejected event for document ${event.documentId} [traceId: ${event.traceId}]`,
      );

      await this.notificationManager.sendForEvent('document.rejected', {
        userId: event.uploadedBy,
        data: {
          documentId: event.documentId,
          documentName: event.documentName,
          documentType: event.documentType,
          rejectedByName: event.rejectedBy.name,
          reason: event.reason,
        },
      });

      this.logger.log(`✅ Document rejected notification sent for document ${event.documentId}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send document rejected notification:`,
        error.stack,
      );
    }
  }
}
