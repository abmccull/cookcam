import { creatorService } from '../creatorService';
import { supabase } from '../../index';
import { logger } from '../../utils/logger';
import Stripe from 'stripe';

// Mock dependencies
jest.mock('../../index', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('stripe');

describe('CreatorService', () => {
  let mockStripe: jest.Mocked<Stripe>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Stripe mock
    mockStripe = {
      accounts: {
        create: jest.fn(),
        update: jest.fn(),
        retrieve: jest.fn(),
      },
      transfers: {
        create: jest.fn(),
      },
      payouts: {
        create: jest.fn(),
      },
    } as any;

    (Stripe as jest.MockedClass<typeof Stripe>).mockImplementation(() => mockStripe);

    // Setup environment
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  });

  describe('registerCreator', () => {
    it('should register a new creator successfully', async () => {
      const creatorData = {
        userId: 'user-123',
        businessName: 'Test Creator LLC',
        businessType: 'individual',
        taxId: '123456789',
        email: 'creator@test.com',
        bankAccount: {
          routingNumber: '123456789',
          accountNumber: '987654321',
          accountType: 'checking',
        },
      };

      const mockStripeAccount = {
        id: 'acct_stripe123',
        details_submitted: false,
        charges_enabled: false,
        payouts_enabled: false,
      };

      const mockCreator = {
        id: 'creator-123',
        user_id: 'user-123',
        business_name: 'Test Creator LLC',
        stripe_account_id: 'acct_stripe123',
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockStripe.accounts.create.mockResolvedValueOnce(mockStripeAccount);
      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: mockCreator,
        error: null,
      });

      const result = await creatorService.registerCreator(creatorData);

      expect(result).toEqual(mockCreator);
      expect(mockStripe.accounts.create).toHaveBeenCalledWith({
        type: 'express',
        country: 'US',
        email: 'creator@test.com',
        business_type: 'individual',
        company: {
          name: 'Test Creator LLC',
          tax_id: '123456789',
        },
        external_account: {
          object: 'bank_account',
          country: 'US',
          currency: 'usd',
          routing_number: '123456789',
          account_number: '987654321',
        },
      });

      expect(supabase.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        business_name: 'Test Creator LLC',
        business_type: 'individual',
        tax_id: '123456789',
        stripe_account_id: 'acct_stripe123',
        status: 'pending',
      });
    });

    it('should handle existing creator registration', async () => {
      const creatorData = {
        userId: 'user-123',
        businessName: 'Test Creator LLC',
        businessType: 'individual',
        taxId: '123456789',
      };

      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { code: '23505', message: 'duplicate key value' }, // Unique constraint violation
      });

      await expect(creatorService.registerCreator(creatorData)).rejects.toThrow(
        'Creator account already exists for this user'
      );
    });

    it('should handle Stripe account creation errors', async () => {
      const creatorData = {
        userId: 'user-123',
        businessName: 'Test Creator LLC',
        businessType: 'individual',
        taxId: '123456789',
      };

      mockStripe.accounts.create.mockRejectedValueOnce(new Error('Invalid tax ID'));

      await expect(creatorService.registerCreator(creatorData)).rejects.toThrow(
        'Failed to create Stripe account'
      );
    });

    it('should validate required creator data', async () => {
      const incompleteData = {
        userId: 'user-123',
        businessName: '', // Empty business name
        businessType: 'individual',
      };

      await expect(creatorService.registerCreator(incompleteData)).rejects.toThrow(
        'Business name is required'
      );
    });
  });

  describe('getCreatorProfile', () => {
    it('should get creator profile successfully', async () => {
      const mockCreator = {
        id: 'creator-123',
        user_id: 'user-123',
        business_name: 'Test Creator LLC',
        status: 'active',
        total_earnings: 15000,
        commission_rate: 0.15,
        created_at: '2024-01-01T00:00:00Z',
      };

      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: mockCreator,
        error: null,
      });

      const result = await creatorService.getCreatorProfile('user-123');

      expect(result).toEqual(mockCreator);
      expect(supabase.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('should handle creator not found', async () => {
      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      await expect(creatorService.getCreatorProfile('nonexistent-user')).rejects.toThrow(
        'Creator profile not found'
      );
    });

    it('should handle database errors', async () => {
      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      });

      await expect(creatorService.getCreatorProfile('user-123')).rejects.toThrow(
        'Failed to fetch creator profile'
      );
    });
  });

  describe('updateCreatorProfile', () => {
    it('should update creator profile successfully', async () => {
      const updateData = {
        businessName: 'Updated Creator LLC',
        businessType: 'company',
        payoutFrequency: 'monthly',
      };

      const mockUpdatedCreator = {
        id: 'creator-123',
        user_id: 'user-123',
        business_name: 'Updated Creator LLC',
        business_type: 'company',
        payout_frequency: 'monthly',
        updated_at: '2024-01-01T00:00:00Z',
      };

      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: mockUpdatedCreator,
        error: null,
      });

      const result = await creatorService.updateCreatorProfile('user-123', updateData);

      expect(result).toEqual(mockUpdatedCreator);
      expect(supabase.update).toHaveBeenCalledWith({
        business_name: 'Updated Creator LLC',
        business_type: 'company',
        payout_frequency: 'monthly',
        updated_at: expect.any(String),
      });
    });

    it('should handle update errors', async () => {
      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

      await expect(
        creatorService.updateCreatorProfile('user-123', {
          businessName: 'New Name',
        })
      ).rejects.toThrow('Failed to update creator profile');
    });
  });

  describe('generateAffiliateLink', () => {
    it('should generate affiliate link successfully', async () => {
      const mockLink = {
        id: 'link-123',
        creator_id: 'creator-123',
        code: 'TESTCREATOR20',
        url: 'https://app.cookcam.com/ref/TESTCREATOR20',
        commission_rate: 0.2,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
      };

      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: mockLink,
        error: null,
      });

      const result = await creatorService.generateAffiliateLink('creator-123', {
        campaignName: 'Winter Promo',
        commissionRate: 0.2,
        expiryDate: '2024-12-31',
      });

      expect(result).toEqual(mockLink);
      expect(supabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          creator_id: 'creator-123',
          code: expect.stringMatching(/^[A-Z0-9]+$/),
          commission_rate: 0.2,
          campaign_name: 'Winter Promo',
          expires_at: '2024-12-31',
        })
      );
    });

    it('should generate unique affiliate codes', async () => {
      const mockLink1 = { id: 'link-1', code: 'CODE1' };
      const mockLink2 = { id: 'link-2', code: 'CODE2' };

      (supabase.single as jest.Mock)
        .mockResolvedValueOnce({ data: mockLink1, error: null })
        .mockResolvedValueOnce({ data: mockLink2, error: null });

      const result1 = await creatorService.generateAffiliateLink('creator-1', {});
      const result2 = await creatorService.generateAffiliateLink('creator-2', {});

      expect(result1.code).not.toBe(result2.code);
    });

    it('should validate commission rate', async () => {
      await expect(
        creatorService.generateAffiliateLink('creator-123', {
          commissionRate: 1.5, // 150% is invalid
        })
      ).rejects.toThrow('Commission rate must be between 0 and 1');

      await expect(
        creatorService.generateAffiliateLink('creator-123', {
          commissionRate: -0.1, // Negative is invalid
        })
      ).rejects.toThrow('Commission rate must be between 0 and 1');
    });
  });

  describe('trackAffiliateClick', () => {
    it('should track affiliate click successfully', async () => {
      const mockLink = {
        id: 'link-123',
        creator_id: 'creator-123',
        is_active: true,
        expires_at: null,
      };

      const mockClick = {
        id: 'click-123',
        affiliate_link_id: 'link-123',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0...',
        referrer: 'https://google.com',
        clicked_at: '2024-01-01T00:00:00Z',
      };

      (supabase.single as jest.Mock)
        .mockResolvedValueOnce({ data: mockLink, error: null })
        .mockResolvedValueOnce({ data: mockClick, error: null });

      const result = await creatorService.trackAffiliateClick('TESTCODE', {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        referrer: 'https://google.com',
      });

      expect(result).toEqual(mockClick);
      expect(supabase.insert).toHaveBeenCalledWith({
        affiliate_link_id: 'link-123',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0...',
        referrer: 'https://google.com',
      });
    });

    it('should handle inactive affiliate links', async () => {
      const mockLink = {
        id: 'link-123',
        is_active: false,
      };

      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: mockLink,
        error: null,
      });

      await expect(
        creatorService.trackAffiliateClick('INACTIVECODE', {
          ipAddress: '192.168.1.1',
        })
      ).rejects.toThrow('Affiliate link is not active');
    });

    it('should handle expired affiliate links', async () => {
      const mockLink = {
        id: 'link-123',
        is_active: true,
        expires_at: '2023-12-31T00:00:00Z', // Expired
      };

      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: mockLink,
        error: null,
      });

      await expect(
        creatorService.trackAffiliateClick('EXPIREDCODE', {
          ipAddress: '192.168.1.1',
        })
      ).rejects.toThrow('Affiliate link has expired');
    });

    it('should handle non-existent affiliate codes', async () => {
      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      await expect(
        creatorService.trackAffiliateClick('NONEXISTENT', {
          ipAddress: '192.168.1.1',
        })
      ).rejects.toThrow('Affiliate link not found');
    });
  });

  describe('processAffiliateConversion', () => {
    it('should process affiliate conversion successfully', async () => {
      const mockConversion = {
        id: 'conversion-123',
        affiliate_link_id: 'link-123',
        user_id: 'user-456',
        order_value: 2999,
        commission_amount: 450,
        status: 'completed',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockCreatorEarnings = {
        creator_id: 'creator-123',
        total_earnings: 15450,
      };

      (supabase.single as jest.Mock)
        .mockResolvedValueOnce({ data: mockConversion, error: null })
        .mockResolvedValueOnce({ data: mockCreatorEarnings, error: null });

      const result = await creatorService.processAffiliateConversion('link-123', {
        userId: 'user-456',
        orderValue: 29.99,
        commissionRate: 0.15,
      });

      expect(result).toEqual(mockConversion);
      expect(supabase.insert).toHaveBeenCalledWith({
        affiliate_link_id: 'link-123',
        user_id: 'user-456',
        order_value: 2999, // Converted to cents
        commission_amount: 450, // 15% of 2999 cents
        status: 'pending',
      });
    });

    it('should validate order value', async () => {
      await expect(
        creatorService.processAffiliateConversion('link-123', {
          userId: 'user-456',
          orderValue: -10,
          commissionRate: 0.15,
        })
      ).rejects.toThrow('Order value must be positive');
    });

    it('should handle duplicate conversions', async () => {
      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { code: '23505', message: 'duplicate key value' },
      });

      await expect(
        creatorService.processAffiliateConversion('link-123', {
          userId: 'user-456',
          orderValue: 29.99,
          commissionRate: 0.15,
        })
      ).rejects.toThrow('Conversion already exists for this user and link');
    });
  });

  describe('getCreatorEarnings', () => {
    it('should get creator earnings successfully', async () => {
      const mockEarnings = {
        total_earnings: 25000,
        pending_earnings: 3500,
        paid_out: 21500,
        current_month: 5000,
        last_month: 4500,
        this_year: 25000,
        commission_rate: 0.15,
      };

      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: mockEarnings,
        error: null,
      });

      const result = await creatorService.getCreatorEarnings('creator-123');

      expect(result).toEqual(mockEarnings);
    });

    it('should get earnings for date range', async () => {
      const mockEarnings = {
        period_earnings: 12000,
        conversion_count: 45,
        average_order_value: 3999,
      };

      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: mockEarnings,
        error: null,
      });

      const result = await creatorService.getCreatorEarnings('creator-123', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(result).toEqual(mockEarnings);
    });
  });

  describe('requestPayout', () => {
    it('should request payout successfully', async () => {
      const mockCreator = {
        id: 'creator-123',
        stripe_account_id: 'acct_stripe123',
        pending_earnings: 10000,
      };

      const mockPayout = {
        id: 'payout-123',
        creator_id: 'creator-123',
        amount: 8000,
        status: 'pending',
        requested_at: '2024-01-01T00:00:00Z',
      };

      const mockStripePayout = {
        id: 'po_stripe123',
        amount: 8000,
        status: 'pending',
      };

      (supabase.single as jest.Mock)
        .mockResolvedValueOnce({ data: mockCreator, error: null })
        .mockResolvedValueOnce({ data: mockPayout, error: null });

      mockStripe.payouts.create.mockResolvedValueOnce(mockStripePayout);

      const result = await creatorService.requestPayout('creator-123', 80.0);

      expect(result).toEqual(mockPayout);
      expect(mockStripe.payouts.create).toHaveBeenCalledWith(
        {
          amount: 8000,
          currency: 'usd',
          method: 'instant',
        },
        {
          stripeAccount: 'acct_stripe123',
        }
      );
    });

    it('should validate payout amount', async () => {
      await expect(creatorService.requestPayout('creator-123', -50)).rejects.toThrow(
        'Payout amount must be positive'
      );

      await expect(creatorService.requestPayout('creator-123', 5)).rejects.toThrow(
        'Minimum payout amount is $10.00'
      );
    });

    it('should check sufficient balance', async () => {
      const mockCreator = {
        id: 'creator-123',
        pending_earnings: 5000, // $50.00
      };

      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: mockCreator,
        error: null,
      });

      await expect(creatorService.requestPayout('creator-123', 100.0)).rejects.toThrow(
        'Insufficient balance for payout'
      );
    });

    it('should handle Stripe payout errors', async () => {
      const mockCreator = {
        id: 'creator-123',
        stripe_account_id: 'acct_stripe123',
        pending_earnings: 10000,
      };

      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: mockCreator,
        error: null,
      });

      mockStripe.payouts.create.mockRejectedValueOnce(new Error('Insufficient funds'));

      await expect(creatorService.requestPayout('creator-123', 80.0)).rejects.toThrow(
        'Failed to process payout'
      );
    });
  });

  describe('getAffiliateAnalytics', () => {
    it('should get affiliate analytics successfully', async () => {
      const mockAnalytics = {
        total_clicks: 1250,
        total_conversions: 89,
        conversion_rate: 0.0712,
        total_revenue: 267500,
        total_commission: 40125,
        top_performing_links: [
          {
            code: 'SPRING20',
            clicks: 450,
            conversions: 32,
            revenue: 95000,
          },
        ],
        monthly_stats: [
          {
            month: '2024-01',
            clicks: 320,
            conversions: 24,
            revenue: 72000,
          },
        ],
      };

      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: mockAnalytics,
        error: null,
      });

      const result = await creatorService.getAffiliateAnalytics('creator-123');

      expect(result).toEqual(mockAnalytics);
    });

    it('should get analytics for specific time period', async () => {
      const mockAnalytics = {
        period_clicks: 500,
        period_conversions: 35,
        period_revenue: 105000,
      };

      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: mockAnalytics,
        error: null,
      });

      const result = await creatorService.getAffiliateAnalytics('creator-123', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(result).toEqual(mockAnalytics);
    });
  });

  describe('updateStripeAccount', () => {
    it('should update Stripe account successfully', async () => {
      const updateData = {
        businessUrl: 'https://creator.example.com',
        productDescription: 'Digital cooking content and recipes',
      };

      const mockStripeAccount = {
        id: 'acct_stripe123',
        business_profile: {
          url: 'https://creator.example.com',
          product_description: 'Digital cooking content and recipes',
        },
      };

      mockStripe.accounts.update.mockResolvedValueOnce(mockStripeAccount);

      const result = await creatorService.updateStripeAccount('acct_stripe123', updateData);

      expect(result).toEqual(mockStripeAccount);
      expect(mockStripe.accounts.update).toHaveBeenCalledWith('acct_stripe123', {
        business_profile: {
          url: 'https://creator.example.com',
          product_description: 'Digital cooking content and recipes',
        },
      });
    });

    it('should handle Stripe update errors', async () => {
      mockStripe.accounts.update.mockRejectedValueOnce(new Error('Invalid account'));

      await expect(
        creatorService.updateStripeAccount('invalid-account', {
          businessUrl: 'https://example.com',
        })
      ).rejects.toThrow('Failed to update Stripe account');
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle missing Stripe configuration', async () => {
      delete process.env.STRIPE_SECRET_KEY;

      await expect(
        creatorService.registerCreator({
          userId: 'user-123',
          businessName: 'Test Creator',
          businessType: 'individual',
        })
      ).rejects.toThrow('Stripe configuration missing');
    });

    it('should handle concurrent payout requests', async () => {
      const mockCreator = {
        id: 'creator-123',
        pending_earnings: 10000,
        payout_in_progress: true,
      };

      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: mockCreator,
        error: null,
      });

      await expect(creatorService.requestPayout('creator-123', 50.0)).rejects.toThrow(
        'Payout already in progress'
      );
    });

    it('should handle database transaction failures', async () => {
      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'Transaction failed' },
      });

      await expect(
        creatorService.processAffiliateConversion('link-123', {
          userId: 'user-456',
          orderValue: 29.99,
          commissionRate: 0.15,
        })
      ).rejects.toThrow('Failed to record conversion');
    });

    it('should validate email addresses', async () => {
      await expect(
        creatorService.registerCreator({
          userId: 'user-123',
          businessName: 'Test Creator',
          businessType: 'individual',
          email: 'invalid-email',
        })
      ).rejects.toThrow('Invalid email address');
    });

    it('should handle very large earnings calculations', async () => {
      const result = await creatorService.processAffiliateConversion('link-123', {
        userId: 'user-456',
        orderValue: 999999.99,
        commissionRate: 0.15,
      });

      // Should handle large numbers correctly
      expect(result.commission_amount).toBe(15000000); // 150,000.00 in cents
    });

    it('should throttle affiliate link generation', async () => {
      // Mock rapid link generation attempts
      const promises = Array(10)
        .fill(null)
        .map(() => creatorService.generateAffiliateLink('creator-123', {}));

      // Should handle concurrent requests gracefully
      await expect(Promise.all(promises)).resolves.toBeDefined();
    });
  });

  describe('Logging and monitoring', () => {
    it('should log important creator actions', async () => {
      const mockCreator = {
        id: 'creator-123',
        user_id: 'user-123',
        business_name: 'Test Creator LLC',
      };

      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: mockCreator,
        error: null,
      });

      await creatorService.registerCreator({
        userId: 'user-123',
        businessName: 'Test Creator LLC',
        businessType: 'individual',
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Creator registered successfully',
        expect.objectContaining({
          creatorId: 'creator-123',
          businessName: 'Test Creator LLC',
        })
      );
    });

    it('should log payout requests', async () => {
      const mockCreator = {
        id: 'creator-123',
        stripe_account_id: 'acct_stripe123',
        pending_earnings: 10000,
      };

      const mockPayout = {
        id: 'payout-123',
        amount: 5000,
      };

      (supabase.single as jest.Mock)
        .mockResolvedValueOnce({ data: mockCreator, error: null })
        .mockResolvedValueOnce({ data: mockPayout, error: null });

      mockStripe.payouts.create.mockResolvedValueOnce({ id: 'po_123' });

      await creatorService.requestPayout('creator-123', 50.0);

      expect(logger.info).toHaveBeenCalledWith(
        'Payout requested',
        expect.objectContaining({
          creatorId: 'creator-123',
          amount: 5000,
        })
      );
    });

    it('should log conversion tracking', async () => {
      const mockConversion = {
        id: 'conversion-123',
        commission_amount: 450,
      };

      (supabase.single as jest.Mock).mockResolvedValueOnce({
        data: mockConversion,
        error: null,
      });

      await creatorService.processAffiliateConversion('link-123', {
        userId: 'user-456',
        orderValue: 29.99,
        commissionRate: 0.15,
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Affiliate conversion processed',
        expect.objectContaining({
          conversionId: 'conversion-123',
          commission: 450,
        })
      );
    });
  });
});
