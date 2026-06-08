import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SystemService } from './system.service';
import { CurrentUser } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../../common/audit.service';

@ApiTags('⚙️ 系统设置')
@Controller('system')
export class SystemController {
  constructor(private svc: SystemService, private audit: AuditService) {}

  // Configs
  @Get('configs') @ApiOperation({ summary: '系统配置列表' })
  configs(@Query('group') group?: string) { return this.svc.listConfigs(group); }

  @Post('configs') @ApiOperation({ summary: '创建配置' })
  async createConfig(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.createConfig(body);
    await this.audit.log(req, user.id, 'create_config', 'system', String(r.id), body);
    return r;
  }

  @Put('configs/:id') @ApiOperation({ summary: '更新配置' })
  async updateConfig(@Param('id', ParseIntPipe) id: number, @Body() body: { value: string }, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.updateConfig(id, body.value);
    await this.audit.log(req, user.id, 'update_config', 'system', String(id), body);
    return r;
  }

  @Delete('configs/:id') @ApiOperation({ summary: '删除配置' })
  async deleteConfig(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.deleteConfig(id);
    await this.audit.log(req, user.id, 'delete_config', 'system', String(id));
    return r;
  }

  // Audit Logs
  @Get('audit-logs') @ApiOperation({ summary: '审计日志' })
  auditLogs(@Query() q: any) { return this.svc.listAuditLogs(q); }

  // Admin Users
  @Get('admins') @ApiOperation({ summary: '管理员列表' })
  admins(@Query() q: any) { return this.svc.listAdmins(q); }

  @Post('admins') @ApiOperation({ summary: '创建管理员' })
  async createAdmin(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.createAdmin(body);
    await this.audit.log(req, user.id, 'create_admin', 'system', String(r.id), { username: body.username });
    return r;
  }

  @Put('admins/:id') @ApiOperation({ summary: '更新管理员' })
  async updateAdmin(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.updateAdmin(id, body);
    await this.audit.log(req, user.id, 'update_admin', 'system', String(id), body);
    return r;
  }

  @Delete('admins/:id') @ApiOperation({ summary: '删除管理员' })
  async deleteAdmin(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.deleteAdmin(id);
    await this.audit.log(req, user.id, 'delete_admin', 'system', String(id));
    return r;
  }

  // Roles
  @Get('roles') @ApiOperation({ summary: '角色列表' })
  roles() { return this.svc.listRoles(); }

  @Post('roles') @ApiOperation({ summary: '创建角色' })
  async createRole(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.createRole(body);
    await this.audit.log(req, user.id, 'create_role', 'system', String(r.id), body);
    return r;
  }

  @Put('roles/:id') @ApiOperation({ summary: '更新角色' })
  async updateRole(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.updateRole(id, body);
    await this.audit.log(req, user.id, 'update_role', 'system', String(id), body);
    return r;
  }

  @Delete('roles/:id') @ApiOperation({ summary: '删除角色' })
  async deleteRole(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.deleteRole(id);
    await this.audit.log(req, user.id, 'delete_role', 'system', String(id));
    return r;
  }
}
