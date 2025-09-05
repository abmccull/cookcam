import { NotificationService, notificationService } from '../notifications';

// Mock dependencies
jest.mock('../../index', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

describe('NotificationService', () => {
  let service: NotificationService;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();

    service = new NotificationService();
    mockSupabase = require('../../index').supabase;
  });

  describe('Device Registration', () => {
    it('should register device successfully', async () => {
      await service.registerDevice('user123', 'device-token-123', 'ios');

      expect(mockSupabase.from).toHaveBeenCalledWith('device_tokens');
      expect(mockSupabase.from().upsert).toHaveBeenCalledWith(
        {
          user_id: 'user123',
          token: 'device-token-123',
          platform: 'ios',
          active: true,
          updated_at: expect.any(String),
        },
        {
          onConflict: 'user_id,token',
        }
      );
    });

    it('should register Android device successfully', async () => {
      await service.registerDevice('user456', 'android-token-456', 'android');

      expect(mockSupabase.from().upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user456',
          token: 'android-token-456',
          platform: 'android',
          active: true,
        }),
        expect.any(Object)
      );
    });

    it('should handle registration errors', async () => {
      mockSupabase.from().upsert.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(service.registerDevice('user123', 'token', 'ios')).rejects.toThrow(
        'Failed to register device: Database error'
      );

      expect(console.error).toHaveBeenCalledWith('Device registration error:', expect.any(Error));
    });

    it('should handle unexpected errors during registration', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await expect(service.registerDevice('user123', 'token', 'ios')).rejects.toThrow(
        'Unexpected error'
      );

      expect(console.error).toHaveBeenCalledWith('Device registration error:', expect.any(Error));
    });
  });

  describe('Device Unregistration', () => {
    it('should unregister device successfully', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });
      mockSupabase.from.mockReturnValue({ update: mockUpdate });

      await service.unregisterDevice('user123', 'device-token-123');

      expect(mockUpdate).toHaveBeenCalledWith({ active: false });
    });

    it('should handle unregistration errors', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } }),
        }),
      });
      mockSupabase.from.mockReturnValue({ update: mockUpdate });

      await expect(service.unregisterDevice('user123', 'token')).rejects.toThrow(
        'Failed to unregister device: Update failed'
      );

      expect(console.error).toHaveBeenCalledWith('Device unregistration error:', expect.any(Error));
    });

    it('should handle unexpected errors during unregistration', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await expect(service.unregisterDevice('user123', 'token')).rejects.toThrow(
        'Unexpected error'
      );

      expect(console.error).toHaveBeenCalledWith('Device unregistration error:', expect.any(Error));
    });
  });

  describe('Sending Notifications', () => {
    const mockPayload = {
      title: 'Test Title',
      body: 'Test body message',
      data: { type: 'test', action: 'test_action' },
      sound: 'default',
    };

    beforeEach(() => {
      // Mock successful device retrieval
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              { token: 'ios-token-123', platform: 'ios' },
              { token: 'android-token-456', platform: 'android' },
            ],
            error: null,
          }),
        }),
      });
      mockSupabase.from.mockReturnValue({ select: mockSelect, insert: jest.fn().mockResolvedValue({ data: null, error: null }) });
    });

    it('should send notification to user with multiple devices', async () => {
      await service.sendToUser('user123', mockPayload);

      expect(mockSupabase.from).toHaveBeenCalledWith('device_tokens');
      expect(console.log).toHaveBeenCalledWith(
        '📱 Sending notification to ios device:',
        expect.objectContaining({
          token: 'ios-token-...',
          payload: mockPayload,
        })
      );
      expect(console.log).toHaveBeenCalledWith(
        '📱 Sending notification to android device:',
        expect.objectContaining({
          token: 'android-to...',
          payload: mockPayload,
        })
      );
    });

    it('should log notification after sending', async () => {
      await service.sendToUser('user123', mockPayload);

      expect(mockSupabase.from).toHaveBeenCalledWith('notification_logs');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        user_id: 'user123',
        title: 'Test Title',
        body: 'Test body message',
        type: 'test',
        sent_at: expect.any(String),
      });
    });

    it('should handle user with no active devices', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      await service.sendToUser('user123', mockPayload);

      expect(console.log).toHaveBeenCalledWith('No active devices for user user123');
    });

    it('should handle database error when getting devices', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      await service.sendToUser('user123', mockPayload);

      expect(console.log).toHaveBeenCalledWith('No active devices for user user123');
    });

    it('should handle errors during notification sending', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(service.sendToUser('user123', mockPayload)).rejects.toThrow(
        'Database connection failed'
      );

      expect(console.error).toHaveBeenCalledWith('Send to user error:', expect.any(Error));
    });

    it('should handle logging errors gracefully', async () => {
      // Mock successful device retrieval but failed logging
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ token: 'test-token', platform: 'ios' }],
            error: null,
          }),
        }),
      });

      const mockInsert = jest.fn().mockRejectedValue(new Error('Logging failed'));

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'device_tokens') {
          return { select: mockSelect };
        }
        if (table === 'notification_logs') {
          return { insert: mockInsert };
        }
        return {};
      });

      // Should not throw error despite logging failure
      await expect(service.sendToUser('user123', mockPayload)).resolves.not.toThrow();

      expect(console.error).toHaveBeenCalledWith('Notification logging error:', expect.any(Error));
    });
  });

  describe('Specific Notification Types', () => {
    beforeEach(() => {
      // Mock successful device retrieval and sending
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ token: 'test-token', platform: 'ios' }],
            error: null,
          }),
        }),
      });
      mockSupabase.from.mockReturnValue({ 
        select: mockSelect, 
        insert: jest.fn().mockResolvedValue({ data: null, error: null }) 
      });
    });

    it('should send daily check-in reminder', async () => {
      await service.sendDailyCheckInReminder('user123');

      expect(console.log).toHaveBeenCalledWith(
        '📱 Sending notification to ios device:',
        expect.objectContaining({
          payload: expect.objectContaining({
            title: '📸 Time for your daily check-in!',
            body: expect.stringContaining('Show us what you\'re cooking today'),
            data: {
              type: 'daily_checkin',
              action: 'open_camera',
            },
            sound: 'default',
          }),
        })
      );
    });

    it('should send challenge reminder', async () => {
      await service.sendChallengeReminder('user123', 'Weekly Veggie Challenge', 3);

      expect(console.log).toHaveBeenCalledWith(
        '📱 Sending notification to ios device:',
        expect.objectContaining({
          payload: expect.objectContaining({
            title: '🎯 Challenge Update',
            body: '3 days left in "Weekly Veggie Challenge"! Don\'t miss out on the rewards!',
            data: {
              type: 'challenge_reminder',
              action: 'open_challenges',
            },
            sound: 'default',
          }),
        })
      );
    });

    it('should send achievement unlocked notification', async () => {
      await service.sendAchievementUnlocked('user123', 'Master Chef', 500);

      expect(console.log).toHaveBeenCalledWith(
        '📱 Sending notification to ios device:',
        expect.objectContaining({
          payload: expect.objectContaining({
            title: '🏆 Achievement Unlocked!',
            body: 'You earned "Master Chef" and 500 XP!',
            data: {
              type: 'achievement',
              action: 'open_profile',
            },
            sound: 'achievement',
          }),
        })
      );
    });

    it('should send streak warning notification', async () => {
      await service.sendStreakWarning('user123', 15);

      expect(console.log).toHaveBeenCalledWith(
        '📱 Sending notification to ios device:',
        expect.objectContaining({
          payload: expect.objectContaining({
            title: '🔥 Your streak is at risk!',
            body: 'Don\'t lose your 15 day streak! Check in before midnight!',
            data: {
              type: 'streak_warning',
              action: 'open_camera',
              urgency: 'high',
            },
            sound: 'warning',
          }),
        })
      );
    });

    it('should send recipe suggestion notification', async () => {
      await service.sendRecipeSuggestion('user123', 'Spicy Thai Curry');

      expect(console.log).toHaveBeenCalledWith(
        '📱 Sending notification to ios device:',
        expect.objectContaining({
          payload: expect.objectContaining({
            title: '👨‍🍳 New recipe suggestion!',
            body: 'Based on your recent scans, try making "Spicy Thai Curry"',
            data: {
              type: 'recipe_suggestion',
              action: 'open_recipes',
            },
            sound: 'default',
          }),
        })
      );
    });
  });

  describe('Scheduled Notifications', () => {
    it('should schedule daily notifications for users with notifications enabled', async () => {
      const mockUsers = [
        { id: 'user1', notification_preferences: { daily_checkin: true } },
        { id: 'user2', notification_preferences: { daily_checkin: false } },
        { id: 'user3', notification_preferences: {} },
      ];

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: mockUsers,
          error: null,
        }),
      });

      // Mock device retrieval for sending notifications
      const mockDeviceSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ token: 'test-token', platform: 'ios' }],
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return { select: mockSelect };
        }
        if (table === 'device_tokens') {
          return { select: mockDeviceSelect };
        }
        if (table === 'notification_logs') {
          return { insert: jest.fn().mockResolvedValue({ data: null, error: null }) };
        }
        return {};
      });

      await service.scheduleDaily();

      // Should send to user1 (explicit true) and user3 (default true)
      // Should not send to user2 (explicit false)
      expect(console.log).toHaveBeenCalledTimes(2); // 2 users receiving notifications
    });

    it('should handle errors when getting users for scheduled notifications', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      await service.scheduleDaily();

      expect(console.error).toHaveBeenCalledWith(
        'Failed to get users for notifications:',
        { message: 'Database error' }
      );
    });

    it('should handle no users found for scheduled notifications', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      await service.scheduleDaily();

      expect(console.error).toHaveBeenCalledWith(
        'Failed to get users for notifications:',
        null
      );
    });

    it('should handle errors during scheduled notification processing', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await service.scheduleDaily();

      expect(console.error).toHaveBeenCalledWith(
        'Schedule daily notifications error:',
        expect.any(Error)
      );
    });
  });

  describe('Private Methods', () => {
    it('should send to device with correct parameters', async () => {
      const payload = {
        title: 'Test',
        body: 'Test body',
        data: { type: 'test' },
      };

      // Call private method via any type assertion
      await (service as any).sendToDevice('test-token-123456789', 'ios', payload);

      expect(console.log).toHaveBeenCalledWith(
        '📱 Sending notification to ios device:',
        {
          token: 'test-token...',
          payload,
        }
      );
    });

    it('should truncate long device tokens in logs', async () => {
      const longToken = 'a'.repeat(100);
      const payload = { title: 'Test', body: 'Test body' };

      await (service as any).sendToDevice(longToken, 'android', payload);

      expect(console.log).toHaveBeenCalledWith(
        '📱 Sending notification to android device:',
        expect.objectContaining({
          token: 'aaaaaaaaaa...',
        })
      );
    });

    it('should log notification with correct parameters', async () => {
      const payload = {
        title: 'Test Title',
        body: 'Test Body',
        data: { type: 'test_type', action: 'test_action' },
      };

      await (service as any).logNotification('user123', payload);

      expect(mockSupabase.from).toHaveBeenCalledWith('notification_logs');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        user_id: 'user123',
        title: 'Test Title',
        body: 'Test Body',
        type: 'test_type',
        sent_at: expect.any(String),
      });
    });

    it('should use default type when data.type is not provided', async () => {
      const payload = {
        title: 'Test Title',
        body: 'Test Body',
      };

      await (service as any).logNotification('user123', payload);

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'general',
        })
      );
    });

    it('should handle logging errors without throwing', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockRejectedValue(new Error('Logging failed')),
      });

      const payload = { title: 'Test', body: 'Test body' };

      // Should not throw
      await expect((service as any).logNotification('user123', payload)).resolves.not.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        'Notification logging error:',
        expect.any(Error)
      );
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle non-Error objects in catch blocks', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw 'String error'; // Non-Error object
      });

      await expect(service.registerDevice('user123', 'token', 'ios')).rejects.toBe('String error');

      expect(console.error).toHaveBeenCalledWith('Device registration error:', 'String error');
    });

    it('should handle undefined data when checking for devices', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: undefined,
            error: null,
          }),
        }),
      });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      await service.sendToUser('user123', { title: 'Test', body: 'Test' });

      expect(console.log).toHaveBeenCalledWith('No active devices for user user123');
    });

    it('should handle payload without data property', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ token: 'test-token', platform: 'ios' }],
            error: null,
          }),
        }),
      });
      mockSupabase.from.mockReturnValue({ 
        select: mockSelect, 
        insert: jest.fn().mockResolvedValue({ data: null, error: null }) 
      });

      const payloadWithoutData = {
        title: 'Test Title',
        body: 'Test Body',
      };

      await service.sendToUser('user123', payloadWithoutData);

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'general', // Should default to 'general'
        })
      );
    });
  });

  describe('Module Export', () => {
    it('should export singleton notification service instance', () => {
      expect(notificationService).toBeInstanceOf(NotificationService);
    });
  });
});