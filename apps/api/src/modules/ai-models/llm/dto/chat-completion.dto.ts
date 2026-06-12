import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessageDto {
  @IsEnum(['system', 'user', 'assistant', 'tool'])
  role: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class ToolDefinitionDto {
  @IsEnum(['function'])
  type: 'function';

  @IsObject()
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

/** POST /ai/chat — 对话补全请求 */
export class ChatCompletionDto {
  @IsString()
  model: string;

  @IsArray()
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @IsOptional()
  @IsArray()
  @Type(() => ToolDefinitionDto)
  tools?: ToolDefinitionDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Max(256000)
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;

  @IsOptional()
  stream?: boolean; // 是否使用流式输出
}

/** POST /ai/embed — 向量化请求 */
export class EmbeddingDto {
  @IsString()
  input: string;

  @IsOptional()
  @IsString()
  model?: string;
}

/** GET /ai/cost/stats — 成本统计查询参数 */
export class CostStatsQueryDto {
  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  startDate?: string; // ISO date

  @IsOptional()
  @IsString()
  endDate?: string; // ISO date
}
