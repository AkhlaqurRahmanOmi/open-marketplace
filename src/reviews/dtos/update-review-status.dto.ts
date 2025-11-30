import { IsString, IsIn } from 'class-validator';

export class UpdateReviewStatusDto {
  @IsString()
  @IsIn(['pending', 'approved', 'rejected'])
  status: string;
}
