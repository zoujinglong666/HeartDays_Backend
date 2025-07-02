import { PartialType } from '@nestjs/swagger';
import { CreateAnniversaryDto } from './create-anniversary.dto';

export class UpdateAnniversaryDto extends PartialType(CreateAnniversaryDto) {
}
