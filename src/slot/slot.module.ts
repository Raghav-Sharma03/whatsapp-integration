import { Module } from '@nestjs/common';
import { SlotService } from './slot.service';

@Module({
  providers: [SlotService],
  exports: [SlotService],
})
export class SlotModule {}