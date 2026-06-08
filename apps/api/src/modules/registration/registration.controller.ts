import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RegistrationService } from './registration.service';

@ApiTags('📋 注册管理')
@Controller('registration')
export class RegistrationController {
  constructor(private svc: RegistrationService) {}

  // ==================== 国内注册 - 方案 ====================

  @Get('domestic/plans')
  @ApiOperation({ summary: '国内注册方案列表' })
  getDomesticPlans() {
    return this.svc.getDomesticPlans();
  }

  @Get('domestic/plans/:id')
  @ApiOperation({ summary: '国内注册方案详情' })
  getDomesticPlan(@Param('id') id: string) {
    return this.svc.getDomesticPlan(Number(id));
  }

  @Post('domestic/plans')
  @ApiOperation({ summary: '创建国内注册方案' })
  createDomesticPlan(@Body() body: any) {
    return this.svc.createDomesticPlan(body);
  }

  @Put('domestic/plans/:id')
  @ApiOperation({ summary: '更新国内注册方案' })
  updateDomesticPlan(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateDomesticPlan(Number(id), body);
  }

  @Delete('domestic/plans/:id')
  @ApiOperation({ summary: '删除国内注册方案' })
  deleteDomesticPlan(@Param('id') id: string) {
    return this.svc.deleteDomesticPlan(Number(id));
  }

  // ==================== 国内注册 - 记录 ====================

  @Get('domestic/registrations')
  @ApiOperation({ summary: '国内注册记录列表(分页)' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'pageSize', required: false }) @ApiQuery({ name: 'status', required: false }) @ApiQuery({ name: 'userId', required: false }) @ApiQuery({ name: 'search', required: false })
  getDomesticRegistrations(@Query() q: any) {
    return this.svc.getDomesticRegistrations(q);
  }

  @Get('domestic/registrations/:id')
  @ApiOperation({ summary: '国内注册记录详情' })
  getDomesticRegistration(@Param('id') id: string) {
    return this.svc.getDomesticRegistration(Number(id));
  }

  @Post('domestic/registrations')
  @ApiOperation({ summary: '发起国内注册申请' })
  createDomesticRegistration(@Body() body: any) {
    return this.svc.createDomesticRegistration(body);
  }

  @Put('domestic/registrations/:id')
  @ApiOperation({ summary: '更新国内注册进度/状态' })
  updateDomesticRegistration(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateDomesticRegistration(Number(id), body);
  }

  @Get('domestic/stats')
  @ApiOperation({ summary: '国内注册统计' })
  getDomesticStats() {
    return this.svc.getDomesticStats();
  }

  // ==================== 海外注册 - 法域 ====================

  @Get('overseas/jurisdictions')
  @ApiOperation({ summary: '离岸法域列表' })
  getJurisdictions() {
    return this.svc.getJurisdictions();
  }

  @Get('overseas/jurisdictions/:id')
  @ApiOperation({ summary: '离岸法域详情' })
  getJurisdiction(@Param('id') id: string) {
    return this.svc.getJurisdiction(Number(id));
  }

  @Post('overseas/jurisdictions')
  @ApiOperation({ summary: '创建离岸法域' })
  createJurisdiction(@Body() body: any) {
    return this.svc.createJurisdiction(body);
  }

  @Put('overseas/jurisdictions/:id')
  @ApiOperation({ summary: '更新离岸法域' })
  updateJurisdiction(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateJurisdiction(Number(id), body);
  }

  @Delete('overseas/jurisdictions/:id')
  @ApiOperation({ summary: '删除离岸法域' })
  deleteJurisdiction(@Param('id') id: string) {
    return this.svc.deleteJurisdiction(Number(id));
  }

  // ==================== 海外注册 - 记录 ====================

  @Get('overseas/registrations')
  @ApiOperation({ summary: '海外注册记录列表(分页)' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'pageSize', required: false }) @ApiQuery({ name: 'status', required: false }) @ApiQuery({ name: 'jurisdictionId', required: false }) @ApiQuery({ name: 'userId', required: false }) @ApiQuery({ name: 'search', required: false })
  getOverseasRegistrations(@Query() q: any) {
    return this.svc.getOverseasRegistrations(q);
  }

  @Get('overseas/registrations/:id')
  @ApiOperation({ summary: '海外注册记录详情' })
  getOverseasRegistration(@Param('id') id: string) {
    return this.svc.getOverseasRegistration(Number(id));
  }

  @Post('overseas/registrations')
  @ApiOperation({ summary: '发起海外注册申请' })
  createOverseasRegistration(@Body() body: any) {
    return this.svc.createOverseasRegistration(body);
  }

  @Put('overseas/registrations/:id')
  @ApiOperation({ summary: '更新海外注册' })
  updateOverseasRegistration(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateOverseasRegistration(Number(id), body);
  }

  @Get('overseas/stats')
  @ApiOperation({ summary: '海外注册统计' })
  getOverseasStats() {
    return this.svc.getOverseasStats();
  }

  // ==================== 隐私保护 ====================

  @Get('privacy/items')
  @ApiOperation({ summary: '隐私合规项列表' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'pageSize', required: false }) @ApiQuery({ name: 'region', required: false }) @ApiQuery({ name: 'status', required: false }) @ApiQuery({ name: 'category', required: false })
  getPrivacyItems(@Query() q: any) {
    return this.svc.getPrivacyItems(q);
  }

  @Get('privacy/items/:id')
  @ApiOperation({ summary: '隐私合规项详情' })
  getPrivacyItem(@Param('id') id: string) {
    return this.svc.getPrivacyItem(Number(id));
  }

  @Post('privacy/items')
  @ApiOperation({ summary: '创建隐私合规项' })
  createPrivacyItem(@Body() body: any) {
    return this.svc.createPrivacyItem(body);
  }

  @Put('privacy/items/:id')
  @ApiOperation({ summary: '更新隐私合规项' })
  updatePrivacyItem(@Param('id') id: string, @Body() body: any) {
    return this.svc.updatePrivacyItem(Number(id), body);
  }

  @Delete('privacy/items/:id')
  @ApiOperation({ summary: '删除隐私合规项' })
  deletePrivacyItem(@Param('id') id: string) {
    return this.svc.deletePrivacyItem(Number(id));
  }

  @Get('privacy/stats')
  @ApiOperation({ summary: '隐私合规统计' })
  getPrivacyStats() {
    return this.svc.getPrivacyStats();
  }

  // ==================== 合同模板 ====================

  @Get('contracts/templates')
  @ApiOperation({ summary: '合同模板列表' })
  @ApiQuery({ name: 'type', required: false }) @ApiQuery({ name: 'status', required: false })
  getTemplates(@Query() q: any) {
    return this.svc.getTemplates(q);
  }

  @Get('contracts/templates/:id')
  @ApiOperation({ summary: '合同模板详情' })
  getTemplate(@Param('id') id: string) {
    return this.svc.getTemplate(Number(id));
  }

  @Post('contracts/templates')
  @ApiOperation({ summary: '创建合同模板' })
  createTemplate(@Body() body: any) {
    return this.svc.createTemplate(body);
  }

  @Put('contracts/templates/:id')
  @ApiOperation({ summary: '更新合同模板' })
  updateTemplate(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateTemplate(Number(id), body);
  }

  @Delete('contracts/templates/:id')
  @ApiOperation({ summary: '删除合同模板' })
  deleteTemplate(@Param('id') id: string) {
    return this.svc.deleteTemplate(Number(id));
  }

  // ==================== 合同实例 ====================

  @Get('contracts')
  @ApiOperation({ summary: '合同实例列表(分页)' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'pageSize', required: false }) @ApiQuery({ name: 'registrationType', required: false }) @ApiQuery({ name: 'status', required: false }) @ApiQuery({ name: 'templateId', required: false })
  getContracts(@Query() q: any) {
    return this.svc.getContracts(q);
  }

  @Get('contracts/:id')
  @ApiOperation({ summary: '合同实例详情' })
  getContract(@Param('id') id: string) {
    return this.svc.getContract(Number(id));
  }

  @Post('contracts')
  @ApiOperation({ summary: '从模板生成合同实例' })
  createContract(@Body() body: any) {
    return this.svc.createContract(body);
  }

  @Put('contracts/:id')
  @ApiOperation({ summary: '更新合同状态/签署' })
  updateContract(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateContract(Number(id), body);
  }

  @Get('contracts/stats')
  @ApiOperation({ summary: '合同统计' })
  getContractStats() {
    return this.svc.getContractStats();
  }
}
