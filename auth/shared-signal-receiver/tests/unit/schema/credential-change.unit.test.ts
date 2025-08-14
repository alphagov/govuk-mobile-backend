import { describe, expect, it } from 'vitest';
import { credentialChangeSchema } from '../../../schema/credential-change';
import {
  CredentialChangeEventBuilder,
  SignalBuilder,
} from '../../helpers/signal';

describe('credentialChangeSchema', () => {
  const credentialChangeEvent = new CredentialChangeEventBuilder();
  const signal = new SignalBuilder(credentialChangeEvent);

  describe('change type', () => {
    it.each(['update', 'delete', 'create', 'revoke'])(
      'should accept valid change types',
      (type) => {
        credentialChangeEvent.withChangeType(type);

        expect(() =>
          credentialChangeSchema.parse(signal.build()),
        ).not.toThrow();
      },
    );

    it.each(['invalid', null, {}, false])(
      'should reject invalid change types',
      (invalidChangeType) => {
        credentialChangeEvent.withChangeType(invalidChangeType);

        expect(() => credentialChangeSchema.parse(signal.build())).toThrow();
      },
    );
  });
});
