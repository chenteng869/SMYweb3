import { N8nIntegrationService } from '@/modules/n8n-integration/n8n.service';
import { PrismaService } from '@/common/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';

jest.mock('@/common/prisma.service');
jest.mock('@nestjs/axios');
jest.mock('@nestjs/config');

describe('N8nIntegrationService', () => {
  let service: N8nIntegrationService;
  let mockHttpService: Partial<HttpService>;
  let mockConfigService: Partial<ConfigService>;
  let mockPrisma: any;

  beforeEach(() => {
    mockHttpService = {
      get: jest.fn().mockReturnValue(of({ data: [{ id: 1, name: 'test' }] })),
      post: jest.fn().mockReturnValue(of({ data: { success: true } })),
      put: jest.fn().mockReturnValue(of({ data: {} })),
      delete: jest.fn().mockReturnValue(of({})),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'N8N_URL') return 'http://localhost:5678';
        if (key === 'N8N_API_KEY') return 'test-api-key';
        return '';
      }),
    };

    mockPrisma = {
      n8nExecution: { create: jest.fn() },
      n8nWorkflow: { create: jest.fn() },
      bpmProcessInstance: { updateMany: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
      $disconnect: jest.fn(),
    };

    (PrismaService as unknown as jest.Mock).mockImplementation(() => mockPrisma);
    (HttpService as unknown as jest.Mock).mockImplementation(() => mockHttpService);
    (ConfigService as unknown as jest.Mock).mockImplementation(() => mockConfigService);

    service = new N8nIntegrationService(
      mockHttpService as HttpService,
      mockConfigService as ConfigService,
      mockPrisma
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listWorkflows', () => {
    it('should return list of workflows', async () => {
      const result = await service.listWorkflows();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('triggerWebhook', () => {
    it('should trigger webhook with payload', async () => {
      const payload = { test: 'data' };
      const result = await service.triggerWebhook('/test-webhook', payload);

      expect(result).toBeDefined();
    });

    it('should throw error when webhook request fails', async () => {
      (mockHttpService.post as jest.Mock).mockReturnValueOnce(throwError(() => new Error('Network error')));

      await expect(service.triggerWebhook('/fail', {})).rejects.toThrow('Network error');
    });
  });

  describe('healthCheck', () => {
    it('should return connected status when n8n is healthy', async () => {
      (mockHttpService.get as jest.Mock).mockReturnValueOnce(of({ data: { version: '1.0.0' } }));

      const result = await service.healthCheck();

      expect(result.status).toBe('connected');
    });

    it('should return disconnected status when n8n is unreachable', async () => {
      (mockHttpService.get as jest.Mock).mockReturnValueOnce(throwError(() => new Error('Connection refused')));

      const result = await service.healthCheck();

      expect(result.status).toBe('disconnected');
    });
  });
});
