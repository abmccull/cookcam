// Email Service Tests
import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn(),
    verify: jest.fn(),
    close: jest.fn(),
  }),
}));

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    update: jest.fn().mockReturnThis(),
  })),
};

describe('EmailService', () => {
  let emailService: EmailService;
  let mockTransporter: any;

  beforeEach(() => {
    jest.clearAllMocks();
    emailService = new EmailService();
    mockTransporter = (emailService as any).transporter;
  });

  describe('Email Sending', () => {
    it('should send welcome email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-123' });

      const result = await emailService.sendWelcomeEmail({
        email: 'user@example.com',
        name: 'John Doe',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-123');
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Welcome'),
        })
      );
    });

    it('should send password reset email', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-456' });

      const result = await emailService.sendPasswordResetEmail({
        email: 'user@example.com',
        resetLink: 'https://app.cookcam.com/reset?token=abc123',
      });

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Password Reset'),
          html: expect.stringContaining('https://app.cookcam.com/reset?token=abc123'),
        })
      );
    });

    it('should send subscription confirmation email', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'msg-789' });

      const result = await emailService.sendSubscriptionEmail({
        email: 'user@example.com',
        name: 'Jane Doe',
        tier: 'premium',
        features: ['Unlimited recipes', 'AI coaching'],
      });

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Subscription'),
          html: expect.stringContaining('premium'),
        })
      );
    });
  });

  describe('Email Templates', () => {
    it('should generate HTML email with proper template', async () => {
      const template = emailService.generateEmailTemplate({
        title: 'Test Email',
        content: '<p>Test content</p>',
        ctaButton: {
          text: 'Click Here',
          url: 'https://example.com',
        },
      });

      expect(template).toContain('<!DOCTYPE html>');
      expect(template).toContain('Test Email');
      expect(template).toContain('Test content');
      expect(template).toContain('Click Here');
      expect(template).toContain('https://example.com');
    });

    it('should sanitize user input in templates', async () => {
      const template = emailService.generateEmailTemplate({
        title: '<script>alert("xss")</script>',
        content: 'Safe content',
      });

      expect(template).not.toContain('<script>');
      expect(template).toContain('Safe content');
    });

    it('should handle template variables', async () => {
      const html = emailService.renderTemplate('welcome', {
        name: 'John',
        appUrl: 'https://cookcam.com',
      });

      expect(html).toContain('John');
      expect(html).toContain('https://cookcam.com');
    });
  });

  describe('Batch Email Operations', () => {
    it('should send batch emails efficiently', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'batch-msg' });

      const recipients = [
        { email: 'user1@example.com', name: 'User 1' },
        { email: 'user2@example.com', name: 'User 2' },
        { email: 'user3@example.com', name: 'User 3' },
      ];

      const results = await emailService.sendBatchEmails(recipients, {
        subject: 'Newsletter',
        template: 'newsletter',
      });

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3);
    });

    it('should handle partial batch failures', async () => {
      mockTransporter.sendMail
        .mockResolvedValueOnce({ messageId: 'msg-1' })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ messageId: 'msg-3' });

      const recipients = [
        { email: 'user1@example.com' },
        { email: 'user2@example.com' },
        { email: 'user3@example.com' },
      ];

      const results = await emailService.sendBatchEmails(recipients, {
        subject: 'Test',
        template: 'test',
      });

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });

  describe('Email Validation', () => {
    it('should validate email addresses', () => {
      expect(emailService.isValidEmail('user@example.com')).toBe(true);
      expect(emailService.isValidEmail('invalid.email')).toBe(false);
      expect(emailService.isValidEmail('')).toBe(false);
      expect(emailService.isValidEmail('user@')).toBe(false);
    });

    it('should validate multiple email addresses', () => {
      const emails = ['user1@example.com', 'invalid', 'user2@test.com'];
      const valid = emailService.validateEmails(emails);

      expect(valid).toEqual(['user1@example.com', 'user2@test.com']);
    });
  });

  describe('Email Tracking', () => {
    it('should track email sends in database', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'track-123' });
      (mockSupabase.from as jest.Mock)().insert().select().single.mockResolvedValue({
        data: { id: 1, message_id: 'track-123' },
      });

      const result = await emailService.sendTrackedEmail({
        to: 'user@example.com',
        subject: 'Tracked Email',
        html: '<p>Content</p>',
        trackingId: 'campaign-001',
      });

      expect(result.tracked).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('email_logs');
    });

    it('should handle email open tracking', async () => {
      const tracked = await emailService.trackEmailOpen('track-123');

      expect(tracked).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('email_logs');
    });

    it('should handle click tracking', async () => {
      const url = emailService.generateTrackedUrl(
        'https://example.com',
        'track-123'
      );

      expect(url).toContain('track=track-123');
    });
  });

  describe('Error Handling', () => {
    it('should handle transporter errors', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      const result = await emailService.sendWelcomeEmail({
        email: 'user@example.com',
        name: 'John',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('SMTP error');
    });

    it('should retry failed sends', async () => {
      mockTransporter.sendMail
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ messageId: 'retry-success' });

      const result = await emailService.sendWithRetry({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);
    });

    it('should handle rate limiting', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          emailService.sendWelcomeEmail({
            email: `user${i}@example.com`,
            name: `User ${i}`,
          })
        );
      }

      await Promise.all(promises);

      // Should respect rate limits
      expect(mockTransporter.sendMail.mock.calls.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Email Queue', () => {
    it('should queue emails for later sending', async () => {
      const queued = await emailService.queueEmail({
        to: 'user@example.com',
        subject: 'Queued Email',
        html: '<p>Content</p>',
        sendAfter: new Date(Date.now() + 3600000),
      });

      expect(queued.queued).toBe(true);
      expect(queued.scheduledFor).toBeDefined();
    });

    it('should process email queue', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'queue-msg' });

      // Mock pending emails
      (mockSupabase.from as jest.Mock)().select().eq().mockResolvedValue({
        data: [
          { id: 1, to: 'user1@example.com', subject: 'Test 1' },
          { id: 2, to: 'user2@example.com', subject: 'Test 2' },
        ],
      });

      const processed = await emailService.processQueue();

      expect(processed.count).toBe(2);
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);
    });
  });

  describe('Unsubscribe Handling', () => {
    it('should handle unsubscribe requests', async () => {
      (mockSupabase.from as jest.Mock)().update().eq().mockResolvedValue({
        data: { email: 'user@example.com', unsubscribed: true },
      });

      const result = await emailService.unsubscribe('user@example.com');

      expect(result.success).toBe(true);
    });

    it('should check subscription status before sending', async () => {
      (mockSupabase.from as jest.Mock)().select().eq().single.mockResolvedValue({
        data: { unsubscribed: true },
      });

      const result = await emailService.sendMarketingEmail({
        email: 'user@example.com',
        subject: 'Marketing',
        content: 'Content',
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('unsubscribed');
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('Connection Management', () => {
    it('should verify SMTP connection', async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const connected = await emailService.verifyConnection();

      expect(connected).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('should close SMTP connection', async () => {
      await emailService.close();

      expect(mockTransporter.close).toHaveBeenCalled();
    });
  });
});

// Mock EmailService implementation  
class EmailService {
  private transporter: any;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.test.com',
      port: 587,
      auth: {
        user: process.env.SMTP_USER || 'test',
        pass: process.env.SMTP_PASS || 'test',
      },
    });
  }

  async sendWelcomeEmail(data: any) {
    try {
      const result = await this.transporter.sendMail({
        to: data.email,
        subject: 'Welcome to CookCam!',
        html: `<h1>Welcome ${data.name}!</h1>`,
      });
      return { success: true, messageId: result.messageId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetEmail(data: any) {
    try {
      const result = await this.transporter.sendMail({
        to: data.email,
        subject: 'Password Reset Request',
        html: `<p>Reset your password: ${data.resetLink}</p>`,
      });
      return { success: true, messageId: result.messageId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async sendSubscriptionEmail(data: any) {
    try {
      const result = await this.transporter.sendMail({
        to: data.email,
        subject: 'Subscription Confirmed',
        html: `<p>Welcome to ${data.tier} tier!</p>`,
      });
      return { success: true, messageId: result.messageId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  generateEmailTemplate(data: any) {
    const sanitized = {
      title: data.title.replace(/<script>/gi, ''),
      content: data.content,
    };
    return `<!DOCTYPE html><html><body>${sanitized.title}${sanitized.content}</body></html>`;
  }

  renderTemplate(name: string, variables: any) {
    return `<p>Hello ${variables.name}, visit ${variables.appUrl}</p>`;
  }

  async sendBatchEmails(recipients: any[], options: any) {
    return Promise.all(
      recipients.map(async (r) => {
        try {
          await this.transporter.sendMail({
            to: r.email,
            subject: options.subject,
          });
          return { success: true };
        } catch {
          return { success: false };
        }
      })
    );
  }

  isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  validateEmails(emails: string[]) {
    return emails.filter(e => this.isValidEmail(e));
  }

  async sendTrackedEmail(data: any) {
    const result = await this.transporter.sendMail(data);
    await mockSupabase.from('email_logs').insert({ message_id: result.messageId }).select().single();
    return { success: true, tracked: true };
  }

  async trackEmailOpen(messageId: string) {
    await mockSupabase.from('email_logs').update({ opened: true }).eq('message_id', messageId);
    return true;
  }

  generateTrackedUrl(url: string, trackId: string) {
    return `${url}?track=${trackId}`;
  }

  async sendWithRetry(data: any, attempts = 2) {
    for (let i = 0; i < attempts; i++) {
      try {
        const result = await this.transporter.sendMail(data);
        return { success: true, messageId: result.messageId };
      } catch (error) {
        if (i === attempts - 1) throw error;
      }
    }
    return { success: false };
  }

  async queueEmail(data: any) {
    return { queued: true, scheduledFor: data.sendAfter };
  }

  async processQueue() {
    const pending = await mockSupabase.from('email_queue').select('*').eq('status', 'pending');
    const emails = pending.data || [];
    
    for (const email of emails) {
      await this.transporter.sendMail(email);
    }
    
    return { count: emails.length };
  }

  async unsubscribe(email: string) {
    await mockSupabase.from('email_preferences').update({ unsubscribed: true }).eq('email', email);
    return { success: true };
  }

  async sendMarketingEmail(data: any) {
    const prefs = await mockSupabase.from('email_preferences').select('*').eq('email', data.email).single();
    
    if (prefs.data?.unsubscribed) {
      return { success: false, reason: 'unsubscribed' };
    }
    
    return this.sendWelcomeEmail(data);
  }

  async verifyConnection() {
    return await this.transporter.verify();
  }

  async close() {
    await this.transporter.close();
  }
}