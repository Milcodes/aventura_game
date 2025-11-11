import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StoriesService } from './stories.service';
import { StoryNodesService } from './story-nodes.service';
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateStoryDto,
  UpdateStoryDto,
  StoryStatus,
  CreateStoryNodeDto,
  UpdateStoryNodeDto,
  ReorderNodesDto,
  CreateBranchDto,
  UpdateBranchDto,
} from './dto';

@Controller('stories')
export class StoriesController {
  constructor(
    private storiesService: StoriesService,
    private storyNodesService: StoryNodesService,
    private branchesService: BranchesService,
  ) {}

  // ========== STORY ENDPOINTS ==========

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req, @Body() dto: CreateStoryDto) {
    return this.storiesService.create(req.user.id, dto);
  }

  @Get()
  findAll(
    @Query('userId') userId?: string,
    @Query('includeNodes') includeNodes?: string,
  ) {
    return this.storiesService.findAll(userId, includeNodes === 'true');
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('includeDetails') includeDetails?: string,
  ) {
    return this.storiesService.findOne(id, includeDetails === 'true');
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Request() req, @Body() dto: UpdateStoryDto) {
    return this.storiesService.update(id, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Request() req,
    @Body('status') status: StoryStatus,
  ) {
    return this.storiesService.updateStatus(id, req.user.id, status);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@Param('id') id: string, @Request() req) {
    return this.storiesService.delete(id, req.user.id);
  }

  // ========== STORY NODE ENDPOINTS ==========

  @UseGuards(JwtAuthGuard)
  @Post('nodes')
  createNode(@Request() req, @Body() dto: CreateStoryNodeDto) {
    return this.storyNodesService.create(req.user.id, dto);
  }

  @Get(':storyId/nodes')
  getStoryNodes(
    @Param('storyId') storyId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.storyNodesService.findByStory(storyId, branchId);
  }

  @Get('nodes/:nodeId')
  getNode(@Param('nodeId') nodeId: string) {
    return this.storyNodesService.findOne(nodeId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('nodes/:nodeId')
  updateNode(
    @Param('nodeId') nodeId: string,
    @Request() req,
    @Body() dto: UpdateStoryNodeDto,
  ) {
    return this.storyNodesService.update(nodeId, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('nodes/:nodeId')
  deleteNode(@Param('nodeId') nodeId: string, @Request() req) {
    return this.storyNodesService.delete(nodeId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':storyId/nodes/reorder')
  reorderNodes(
    @Param('storyId') storyId: string,
    @Request() req,
    @Body() dto: ReorderNodesDto,
  ) {
    return this.storyNodesService.reorderNodes(req.user.id, storyId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('nodes/:nodeId/decisions')
  addDecision(
    @Param('nodeId') nodeId: string,
    @Request() req,
    @Body() decision: any,
  ) {
    return this.storyNodesService.addDecision(nodeId, req.user.id, decision);
  }

  @UseGuards(JwtAuthGuard)
  @Post('nodes/:nodeId/effects')
  addEffect(
    @Param('nodeId') nodeId: string,
    @Request() req,
    @Body() effect: any,
  ) {
    return this.storyNodesService.addEffect(nodeId, req.user.id, effect);
  }

  // ========== BRANCH ENDPOINTS ==========

  @UseGuards(JwtAuthGuard)
  @Post('branches')
  createBranch(@Request() req, @Body() dto: CreateBranchDto) {
    return this.branchesService.create(req.user.id, dto);
  }

  @Get(':storyId/branches')
  getStoryBranches(@Param('storyId') storyId: string) {
    return this.branchesService.findByStory(storyId);
  }

  @Get(':storyId/branches/tree')
  getBranchTree(@Param('storyId') storyId: string) {
    return this.branchesService.getBranchTree(storyId);
  }

  @Get('branches/:branchId')
  getBranch(@Param('branchId') branchId: string) {
    return this.branchesService.findOne(branchId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('branches/:branchId')
  updateBranch(
    @Param('branchId') branchId: string,
    @Request() req,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchesService.update(branchId, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('branches/:branchId')
  deleteBranch(@Param('branchId') branchId: string, @Request() req) {
    return this.branchesService.delete(branchId, req.user.id);
  }
}
