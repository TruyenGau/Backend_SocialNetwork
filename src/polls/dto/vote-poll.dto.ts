import { IsNumber, Min } from 'class-validator';

export class VotePollDto {
  @IsNumber()
  @Min(0)
  optionIndex: number;
}
