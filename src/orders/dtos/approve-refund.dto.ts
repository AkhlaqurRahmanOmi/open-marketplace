import { IsInt, IsPositive, IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveRefundDto {
  @IsInt()
  @IsPositive()
  refundId: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  approverNotes?: string;
}

export class RejectRefundDto {
  @IsInt()
  @IsPositive()
  refundId: number;

  @IsString()
  @MaxLength(500)
  reason: string;
}
