import { StripeConnectService } from '../stripeConnectService';
import { createMockSupabaseClient, createMockStripe, mockEnvVars } from '../../__tests__/utils/testHelpers';
import { mockUsers, mockStripeEvents } from '../../__tests__/utils/mockData';

// Mock external dependencies
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe);
});

jest.mock('../../index', () => ({
  supabase: mockSupabaseClient,
}));

const mockStripe = createMockStripe();
const mockSupabaseClient = createMockSupabaseClient();

// Mock environment variables
Object.assign(process.env, mockEnvVars);

describe('StripeConnectService', () => {
  let service: StripeConnectService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StripeConnectService();
  });

  describe('createConnectedAccount', () => {
    it('should create a connected account for creator', async () => {
      const mockAccount = {
        id: 'acct_test123',
        business_type: 'individual',
        country: 'US',
        email: mockUsers.creator.email,
        charges_enabled: false,
        payouts_enabled: false,
      };

      mockStripe.accounts.create.mockResolvedValue(mockAccount);
      mockSupabaseClient.from().update().eq().mockResolvedValue({
        data: { ...mockUsers.creator, stripe_account_id: mockAccount.id },
        error: null,
      });

      const result = await service.createConnectedAccount(mockUsers.creator.id, {
        business_type: 'individual',
        country: 'US',
        email: mockUsers.creator.email,
      });

      expect(result.success).toBe(true);
      expect(result.data.account_id).toBe(mockAccount.id);
      expect(mockStripe.accounts.create).toHaveBeenCalledWith({
        type: 'express',
        business_type: 'individual',
        country: 'US',
        email: mockUsers.creator.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
    });

    it('should handle Stripe account creation errors', async () => {
      mockStripe.accounts.create.mockRejectedValue(new Error('Stripe error'));

      const result = await service.createConnectedAccount(mockUsers.creator.id, {
        business_type: 'individual',
        country: 'US',
        email: mockUsers.creator.email,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create Stripe account');
    });

    it('should handle database update errors', async () => {
      const mockAccount = { id: 'acct_test123' };
      mockStripe.accounts.create.mockResolvedValue(mockAccount);
      mockSupabaseClient.from().update().eq().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await service.createConnectedAccount(mockUsers.creator.id, {
        business_type: 'individual',
        country: 'US',
        email: mockUsers.creator.email,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to update user with Stripe account');
    });
  });

  describe('createAccountLink', () => {
    it('should create account link for onboarding', async () => {
      const mockLink = {
        object: 'account_link',
        created: Date.now(),
        expires_at: Date.now() + 3600,
        url: 'https://connect.stripe.com/setup/acct_test123',
      };

      mockStripe.accountLinks.create.mockResolvedValue(mockLink);

      const result = await service.createAccountLink('acct_test123', 'account_onboarding');

      expect(result.success).toBe(true);
      expect(result.data.url).toBe(mockLink.url);
      expect(mockStripe.accountLinks.create).toHaveBeenCalledWith({
        account: 'acct_test123',
        refresh_url: expect.stringContaining('/creator/onboarding/refresh'),
        return_url: expect.stringContaining('/creator/onboarding/return'),
        type: 'account_onboarding',
      });
    });

    it('should handle account link creation errors', async () => {
      mockStripe.accountLinks.create.mockRejectedValue(new Error('Link creation failed'));

      const result = await service.createAccountLink('acct_test123', 'account_onboarding');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create account link');
    });
  });

  describe('getAccountStatus', () => {
    it('should retrieve account status with payout capability', async () => {
      const mockAccount = {
        id: 'acct_test123',
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
        capabilities: {
          card_payments: 'active',
          transfers: 'active',
        },
        requirements: {
          currently_due: [],
          eventually_due: [],
          past_due: [],
          pending_verification: [],
        },
      };

      mockStripe.accounts.retrieve.mockResolvedValue(mockAccount);

      const result = await service.getAccountStatus('acct_test123');

      expect(result.success).toBe(true);
      expect(result.data.charges_enabled).toBe(true);
      expect(result.data.payouts_enabled).toBe(true);
      expect(result.data.onboarding_complete).toBe(true);
    });

    it('should handle account retrieval errors', async () => {
      mockStripe.accounts.retrieve.mockRejectedValue(new Error('Account not found'));

      const result = await service.getAccountStatus('acct_invalid');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to retrieve account status');
    });
  });

  describe('createTransfer', () => {
    it('should create transfer to connected account', async () => {
      const mockTransfer = {
        id: 'tr_test123',
        amount: 1000,
        currency: 'usd',
        destination: 'acct_test123',
        created: Date.now(),
      };

      mockStripe.transfers.create.mockResolvedValue(mockTransfer);

      const result = await service.createTransfer({
        amount: 1000,
        currency: 'usd',
        destination: 'acct_test123',
        description: 'Recipe revenue share',
        metadata: {
          recipe_id: 'recipe-123',
          creator_id: mockUsers.creator.id,
        },
      });

      expect(result.success).toBe(true);
      expect(result.data.transfer_id).toBe(mockTransfer.id);
      expect(mockStripe.transfers.create).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'usd',
        destination: 'acct_test123',
        description: 'Recipe revenue share',
        metadata: {
          recipe_id: 'recipe-123',
          creator_id: mockUsers.creator.id,
        },
      });
    });

    it('should handle transfer creation errors', async () => {
      mockStripe.transfers.create.mockRejectedValue(new Error('Insufficient funds'));

      const result = await service.createTransfer({
        amount: 1000,
        currency: 'usd',
        destination: 'acct_test123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create transfer');
    });
  });

  describe('calculateCreatorEarnings', () => {
    it('should calculate earnings based on recipe performance', async () => {
      const mockAnalytics = [
        { recipe_id: 'recipe-1', event_type: 'recipe_view', created_at: '2024-01-01' },
        { recipe_id: 'recipe-1', event_type: 'recipe_complete', created_at: '2024-01-01' },
        { recipe_id: 'recipe-2', event_type: 'recipe_view', created_at: '2024-01-01' },
      ];

      mockSupabaseClient.from().select().eq().gte().lte().mockResolvedValue({
        data: mockAnalytics,
        error: null,
      });

      const result = await service.calculateCreatorEarnings(mockUsers.creator.id, {
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(result.success).toBe(true);
      expect(result.data.total_views).toBe(2);
      expect(result.data.total_completions).toBe(1);
      expect(result.data.estimated_earnings).toBeGreaterThan(0);
    });

    it('should handle analytics query errors', async () => {
      mockSupabaseClient.from().select().eq().gte().lte().mockResolvedValue({
        data: null,
        error: { message: 'Query failed' },
      });

      const result = await service.calculateCreatorEarnings(mockUsers.creator.id, {
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to calculate earnings');
    });
  });

  describe('processCreatorPayouts', () => {
    it('should process payouts for eligible creators', async () => {
      const mockCreators = [
        {
          id: mockUsers.creator.id,
          stripe_account_id: 'acct_test123',
          pending_earnings: 5000,
        },
      ];

      const mockAccount = {
        payouts_enabled: true,
        charges_enabled: true,
      };

      mockSupabaseClient.from().select().eq().gte().mockResolvedValue({
        data: mockCreators,
        error: null,
      });

      mockStripe.accounts.retrieve.mockResolvedValue(mockAccount);
      mockStripe.transfers.create.mockResolvedValue({ id: 'tr_test123' });
      mockSupabaseClient.from().insert().mockResolvedValue({ data: {}, error: null });
      mockSupabaseClient.from().update().eq().mockResolvedValue({ data: {}, error: null });

      const result = await service.processCreatorPayouts();

      expect(result.success).toBe(true);
      expect(result.data.processed_count).toBe(1);
      expect(result.data.total_amount).toBe(5000);
    });

    it('should skip creators with insufficient earnings', async () => {
      const mockCreators = [
        {
          id: mockUsers.creator.id,
          stripe_account_id: 'acct_test123',
          pending_earnings: 500, // Below minimum threshold
        },
      ];

      mockSupabaseClient.from().select().eq().gte().mockResolvedValue({
        data: mockCreators,
        error: null,
      });

      const result = await service.processCreatorPayouts();

      expect(result.success).toBe(true);
      expect(result.data.processed_count).toBe(0);
      expect(result.data.skipped_count).toBe(1);
    });
  });

  describe('webhook handling', () => {
    it('should handle account.updated webhook', async () => {
      const webhookBody = JSON.stringify({
        type: 'account.updated',
        data: {
          object: {
            id: 'acct_test123',
            charges_enabled: true,
            payouts_enabled: true,
          },
        },
      });

      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'account.updated',
        data: {
          object: {
            id: 'acct_test123',
            charges_enabled: true,
            payouts_enabled: true,
          },
        },
      });

      mockSupabaseClient.from().update().eq().mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await service.handleWebhook(webhookBody, 'signature');

      expect(result.success).toBe(true);
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalled();
    });

    it('should handle invalid webhook signatures', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const result = await service.handleWebhook('invalid body', 'invalid signature');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid webhook signature');
    });
  });
});