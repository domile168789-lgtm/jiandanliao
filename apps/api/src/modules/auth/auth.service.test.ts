import { describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('sms login is disabled', async () => {
    const service = new AuthService();
    await expect(service.loginWithSms({ phone: '85512345678', code: '123456', deviceId: 'ios-1' })).rejects.toThrow(
      'sms login disabled'
    );
  });
});
