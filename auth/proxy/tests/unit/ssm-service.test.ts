import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SSMService } from '../../service/ssm-service';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

vi.mock('@aws-sdk/client-ssm', () => {
  const mockSend = vi.fn();
  return {
    SSMClient: vi.fn(() => ({
      send: mockSend,
    })),
    GetParameterCommand: vi.fn(),
  };
});

describe('SSMService', () => {
  let ssmService: SSMService;
  let mockSSMClient: any;
  let mockSend: any;

  beforeEach(() => {
    mockSSMClient = new SSMClient({});
    mockSend = mockSSMClient.send;
    ssmService = new SSMService(mockSSMClient);
  });

  it('should retrieve a parameter successfully', async () => {
    const mockResponse = { Parameter: { Value: 'mockValue' } };
    mockSend.mockResolvedValueOnce(mockResponse);

    const result = await ssmService.getParameterValue('mockParameterName');
    expect(result).toBe('mockValue');
    expect(mockSend).toHaveBeenCalledWith(
      new GetParameterCommand({
        Name: 'mockParameterName',
        WithDecryption: true,
      }),
    );
  });

  it('should throw error when value is undefined', async () => {
    const mockResponse = { Parameter: { Value: undefined } };
    mockSend.mockResolvedValueOnce(mockResponse);

    await expect(
      ssmService.getParameterValue('mockParameterName'),
    ).rejects.toThrowError();
  });

  it('should throw an error if parameter retrieval fails', async () => {
    mockSend.mockRejectedValueOnce(new Error('SSM error'));

    await expect(
      ssmService.getParameterValue('mockParameterName'),
    ).rejects.toThrow('SSM error');
    expect(mockSend).toHaveBeenCalledWith(
      new GetParameterCommand({
        Name: 'mockParameterName',
        WithDecryption: true,
      }),
    );
  });
});
