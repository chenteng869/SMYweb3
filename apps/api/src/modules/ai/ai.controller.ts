import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { CurrentUser } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../../common/audit.service';

@ApiTags('🤖 AI 大脑')
@Controller('ai')
export class AiController {
  constructor(private svc: AiService, private audit: AuditService) {}

  // Agents
  @Get('agents') @ApiOperation({ summary: 'AI 顾问列表' })
  listAgents(@Query() q: any) { return this.svc.listAgents(q); }

  @Get('agents/:id') @ApiOperation({ summary: 'AI 顾问详情' })
  agentDetail(@Param('id', ParseIntPipe) id: number) { return this.svc.agentDetail(id); }

  @Post('agents') @ApiOperation({ summary: '创建 AI 顾问' })
  async createAgent(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.createAgent(body);
    await this.audit.log(req, user.id, 'create_ai_agent', 'ai', String(r.id), body);
    return r;
  }

  @Put('agents/:id') @ApiOperation({ summary: '更新 AI 顾问' })
  async updateAgent(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.updateAgent(id, body);
    await this.audit.log(req, user.id, 'update_ai_agent', 'ai', String(id), body);
    return r;
  }

  @Delete('agents/:id') @ApiOperation({ summary: '删除 AI 顾问' })
  async deleteAgent(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.deleteAgent(id);
    await this.audit.log(req, user.id, 'delete_ai_agent', 'ai', String(id));
    return r;
  }

  // Messages
  @Get('messages') @ApiOperation({ summary: 'AI 对话记录' })
  listMessages(@Query() q: any) { return this.svc.listMessages(q); }

  // Todos
  @Get('todos') @ApiOperation({ summary: 'AI Todo 列表' })
  listTodos(@Query() q: any) { return this.svc.listTodos(q); }

  // Knowledge
  @Get('knowledge') @ApiOperation({ summary: 'AI 知识库列表' })
  listKnowledge(@Query() q: any) { return this.svc.listKnowledge(q); }

  @Post('knowledge') @ApiOperation({ summary: '创建知识' })
  async createKnowledge(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.createKnowledge(body);
    await this.audit.log(req, user.id, 'create_knowledge', 'ai', String(r.id), body);
    return r;
  }

  @Put('knowledge/:id') @ApiOperation({ summary: '更新知识' })
  async updateKnowledge(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.updateKnowledge(id, body);
    await this.audit.log(req, user.id, 'update_knowledge', 'ai', String(id), body);
    return r;
  }

  @Delete('knowledge/:id') @ApiOperation({ summary: '删除知识' })
  async deleteKnowledge(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.deleteKnowledge(id);
    await this.audit.log(req, user.id, 'delete_knowledge', 'ai', String(id));
    return r;
  }

  @Get('stats') @ApiOperation({ summary: 'AI 统计' })
  stats() { return this.svc.stats(); }
}
