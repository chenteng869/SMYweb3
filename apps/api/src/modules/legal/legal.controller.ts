import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LegalService } from './legal.service';
import { CurrentUser } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../../common/audit.service';

@ApiTags('⚖️ 法务合规')
@Controller('legal')
export class LegalController {
  constructor(private svc: LegalService, private audit: AuditService) {}

  // Compliance
  @Get('compliance') @ApiOperation({ summary: '合规项列表' })
  listCompliance(@Query() q: any) { return this.svc.listCompliance(q); }

  @Post('compliance') @ApiOperation({ summary: '创建合规项' })
  async createCompliance(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.createCompliance(body);
    await this.audit.log(req, user.id, 'create_compliance', 'legal', String(r.id), body);
    return r;
  }

  @Put('compliance/:id') @ApiOperation({ summary: '更新合规项' })
  async updateCompliance(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.updateCompliance(id, body);
    await this.audit.log(req, user.id, 'update_compliance', 'legal', String(id), body);
    return r;
  }

  @Delete('compliance/:id') @ApiOperation({ summary: '删除合规项' })
  async deleteCompliance(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.deleteCompliance(id);
    await this.audit.log(req, user.id, 'delete_compliance', 'legal', String(id));
    return r;
  }

  // Contracts
  @Get('contracts') @ApiOperation({ summary: '合同列表' })
  listContracts(@Query() q: any) { return this.svc.listContracts(q); }

  @Post('contracts') @ApiOperation({ summary: '创建合同' })
  async createContract(@Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.createContract(body);
    await this.audit.log(req, user.id, 'create_contract', 'legal', String(r.id), body);
    return r;
  }

  @Put('contracts/:id') @ApiOperation({ summary: '更新合同' })
  async updateContract(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.updateContract(id, body);
    await this.audit.log(req, user.id, 'update_contract', 'legal', String(id), body);
    return r;
  }

  @Delete('contracts/:id') @ApiOperation({ summary: '删除合同' })
  async deleteContract(@Param('id', ParseIntPipe) id: number, @Req() req: any, @CurrentUser() user: any) {
    const r = await this.svc.deleteContract(id);
    await this.audit.log(req, user.id, 'delete_contract', 'legal', String(id));
    return r;
  }
}
