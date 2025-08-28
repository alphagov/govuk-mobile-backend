import { expect, describe, it, vi, afterAll, beforeEach } from 'vitest';

describe('Unit test for pager-duty-test-endpoint handler', () => {
  const consoleMock = vi
    .spyOn(console, 'log')
    .mockImplementation(() => undefined);

  beforeEach(() => {
    consoleMock.mockReset();
  });

  afterAll(() => {
    consoleMock.mockRestore();
  });

  it('logs the SNS event', async () => {
    const snsEvent = {
      Records: [
        {
          EventSource: 'aws:sns',
          EventVersion: '1.0',
          EventSubscriptionArn:
            'arn:aws:sns:region:account-id:example-topic:example-subscription',
          Sns: {
            Type: 'Notification',
            MessageId: '12345',
            TopicArn: 'arn:aws:sns:region:account-id:example-topic',
            Subject: 'TestSubject',
            Message: 'Test message',
            Timestamp: '2024-01-01T00:00:00.000Z',
            SignatureVersion: '1',
            Signature: 'EXAMPLE',
            SigningCertUrl:
              'https://sns.region.amazonaws.com/SimpleNotificationService.pem',
            UnsubscribeUrl:
              'https://sns.region.amazonaws.com/?Action=Unsubscribe',
            MessageAttributes: {},
          },
        },
      ],
    };

    // Import the lambdaHandler from the correct file
    const { lambdaHandler } = await import('../../app');

    await lambdaHandler(snsEvent as any);

    expect(consoleMock).toHaveBeenCalledWith(
      'SNS event for test Pager Duty:',
      JSON.stringify(snsEvent, null, 2),
    );
  });
});
