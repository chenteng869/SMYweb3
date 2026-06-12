import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../../common/audit.service';

@ApiTags('👥 用户管理')
@Controller('users')
export class UsersController {
  constructor(
    private svc: UsersService,
    private audit: AuditService
  ) {}

  @Get()
  @ApiOperation({ summary: '用户列表' })
  list(@Query() q: any) {
    return this.svc.list(q);
  }

  @Get('stats')
  @ApiOperation({ summary: '用户统计' })
  stats() {
    return this.svc.stats();
  }

  @Get(':id')
  @ApiOperation({ summary: '用户详情' })
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.svc.detail(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新用户' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    const result = await this.svc.update(id, body);
    await this.audit.log(req, user.id, 'update_user', 'users', String(id), body);
    return result;
  }

  @Put(':id/status')
  @ApiOperation({ summary: '启用/禁用用户' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { isActive: boolean; reason?: string },
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    const result = await this.svc.updateStatus(id, body.isActive, body.reason);
    await this.audit.log(
      req,
      user.id,
      body.isActive ? 'enable_user' : 'disable_user',
      'users',
      String(id),
      body
    );
    return result;
  }

  @Put(':id/kyc')
  @ApiOperation({ summary: '更新 KYC 状态' })
  async updateKyc(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { kycStatus: string },
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    const result = await this.svc.updateKyc(id, body.kycStatus);
    await this.audit.log(req, user.id, 'update_kyc', 'users', String(id), body);
    return result;
  }

  @Put(':id/level')
  @ApiOperation({ summary: '调整 DLC 等级' })
  async updateLevel(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { dlcLevel: number },
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    const result = await this.svc.updateLevel(id, body.dlcLevel);
    await this.audit.log(req, user.id, 'update_level', 'users', String(id), body);
    return result;
  }

  // === Dashboard ===
  @Get('dashboard/stats')
  @ApiOperation({ summary: '用户总览统计数据' })
  async dashboardStats() {
    return this.svc.getDashboardStats();
  }

  // === Roles CRUD ===
  @Get('roles')
  @ApiOperation({ summary: '获取所有角色列表' })
  async getRoles(@Query() q: any) {
    return this.svc.getRoles(q);
  }

  @Get('roles/:id')
  @ApiOperation({ summary: '获取角色详情' })
  async getRole(@Param('id') id: string) {
    return this.svc.getRole(Number(id));
  }

  @Post('roles')
  @ApiOperation({ summary: '创建角色' })
  async createRole(@Body() dto: any) {
    return this.svc.createRole(dto);
  }

  @Put('roles/:id')
  @ApiOperation({ summary: '更新角色' })
  async updateRole(@Param('id') id: string, @Body() dto: any) {
    return this.svc.updateRole(Number(id), dto);
  }

  @Delete('roles/:id')
  @ApiOperation({ summary: '删除角色' })
  async deleteRole(@Param('id') id: string) {
    return this.svc.deleteRole(Number(id));
  }

  @Post(':userId/roles')
  @ApiOperation({ summary: '为用户分配角色' })
  async assignRoles(@Param('userId') userId: string, @Body() dto: { roleIds: number[] }) {
    return this.svc.assignUserRole(Number(userId), dto.roleIds);
  }

  @Get(':userId/roles')
  @ApiOperation({ summary: '获取用户的角色列表' })
  async getUserRoles(@Param('userId') userId: string) {
    return this.svc.getUserRoles(Number(userId));
  }

  // === Risk Assessment (AML/CFT) ===
  @Get('risk/assessments')
  @ApiOperation({ summary: '获取风险评估列表' })
  async getRiskAssessments(@Query() q: any) {
    return this.svc.getRiskAssessments(q);
  }

  @Get('risk/user/:userId')
  @ApiOperation({ summary: '获取单个用户风险评估' })
  async getRiskAssessment(@Param('userId') userId: string) {
    return this.svc.getRiskAssessment(Number(userId));
  }

  @Put('risk/user/:userId')
  @ApiOperation({ summary: '更新用户风险评估' })
  async updateRiskAssessment(@Param('userId') userId: string, @Body() dto: any) {
    return this.svc.updateRiskAssessment(Number(userId), dto);
  }

  @Get('risk/stats')
  @ApiOperation({ summary: '风控统计概览' })
  async getRiskStats() {
    return this.svc.getRiskStats();
  }

  // === Audit Logs ===
  @Get('audit/logs')
  @ApiOperation({ summary: '获取操作审计日志' })
  async getAuditLogs(@Query() q: any) {
    return this.svc.getAuditLogs(q);
  }

  @Get('audit/stats')
  @ApiOperation({ summary: '审计日志统计' })
  async getAuditLogStats() {
    return this.svc.getAuditLogStats();
  }

  // === Session Management ===
  @Get('sessions')
  @ApiOperation({ summary: '获取活跃会话列表' })
  async getActiveSessions(@Query() q: any) {
    return this.svc.getAllActiveSessions(q);
  }

  @Get('sessions/user/:userId')
  @ApiOperation({ summary: '获取用户的所有会话' })
  async getUserSessions(@Param('userId') userId: string) {
    return this.svc.getUserSessions(Number(userId));
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: '终止指定会话' })
  async terminateSession(
    @Param('sessionId') sessionId: string,
    @Body() body?: { reason?: string }
  ) {
    return this.svc.terminateSession(sessionId, body?.reason || 'force_logout');
  }

  @Delete('sessions/user/:userId/all')
  @ApiOperation({ summary: '终止用户所有会话(强制下线)' })
  async terminateAllSessions(
    @Param('userId') userId: string,
    @Headers('x-session-id') exceptId?: string
  ) {
    return this.svc.terminateAllUserSessions(Number(userId), exceptId);
  }

  @Get('sessions/stats')
  @ApiOperation({ summary: '会话统计' })
  async getSessionStats() {
    return this.svc.getSessionStats();
  }

  // === Login History ===
  @Get('login-history/:userId')
  @ApiOperation({ summary: '获取用户登录历史' })
  async getLoginHistory(@Param('userId') userId: string, @Query() q: any) {
    return this.svc.getLoginHistories(Number(userId), q);
  }
}
