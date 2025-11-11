import { Module } from '@nestjs/common';
import { StoriesService } from './stories.service';
import { StoryNodesService } from './story-nodes.service';
import { BranchesService } from './branches.service';
import { StoriesController } from './stories.controller';

@Module({
  providers: [StoriesService, StoryNodesService, BranchesService],
  controllers: [StoriesController],
  exports: [StoriesService, StoryNodesService, BranchesService],
})
export class StoriesModule {}
