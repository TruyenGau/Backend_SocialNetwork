// dto/review-post.dto.ts
import { IsEnum } from 'class-validator';

export enum ReviewAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  DELETE = 'DELETE',
}

export class ReviewPostDto {
  @IsEnum(ReviewAction)
  action: ReviewAction;
}
