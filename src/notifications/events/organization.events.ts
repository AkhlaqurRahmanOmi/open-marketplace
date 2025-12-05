import { BaseEvent } from './base.event';

/**
 * Data structure for an invitation
 */
export interface InvitationData {
  userId: number;
  email: string;
  inviteLink: string;
}

/**
 * Event emitted when members are invited to an organization
 */
export class OrganizationMembersInvitedEvent extends BaseEvent {
  readonly eventName = 'organization.members.invited';

  constructor(
    public readonly organizationId: number,
    public readonly organizationName: string,
    public readonly invitations: InvitationData[],
    public readonly invitedBy: { id: number; name: string },
    traceId?: string,
  ) {
    super(traceId);
  }

  protected getPayload(): Record<string, any> {
    return {
      organizationId: this.organizationId,
      organizationName: this.organizationName,
      invitationCount: this.invitations.length,
      invitedBy: this.invitedBy,
    };
  }
}

/**
 * Event emitted when a document is approved
 */
export class DocumentApprovedEvent extends BaseEvent {
  readonly eventName = 'document.approved';

  constructor(
    public readonly documentId: number,
    public readonly documentName: string,
    public readonly documentType: string,
    public readonly uploadedBy: number,
    public readonly approvedBy: { id: number; name: string },
    traceId?: string,
  ) {
    super(traceId);
  }

  protected getPayload(): Record<string, any> {
    return {
      documentId: this.documentId,
      documentName: this.documentName,
      documentType: this.documentType,
      uploadedBy: this.uploadedBy,
      approvedBy: this.approvedBy,
    };
  }
}

/**
 * Event emitted when a document is rejected
 */
export class DocumentRejectedEvent extends BaseEvent {
  readonly eventName = 'document.rejected';

  constructor(
    public readonly documentId: number,
    public readonly documentName: string,
    public readonly documentType: string,
    public readonly uploadedBy: number,
    public readonly rejectedBy: { id: number; name: string },
    public readonly reason?: string,
    traceId?: string,
  ) {
    super(traceId);
  }

  protected getPayload(): Record<string, any> {
    return {
      documentId: this.documentId,
      documentName: this.documentName,
      documentType: this.documentType,
      uploadedBy: this.uploadedBy,
      rejectedBy: this.rejectedBy,
      hasReason: !!this.reason,
    };
  }
}
