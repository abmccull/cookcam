import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

export interface GooglePlaySubscription {
  acknowledgementState: number;
  autoRenewing: boolean;
  cancelReason?: number;
  countryCode: string;
  expiryTimeMillis: string;
  introductoryPriceInfo?: any;
  linkedPurchaseToken?: string;
  orderId: string;
  paymentState: number;
  priceAmountMicros: string;
  priceCurrencyCode: string;
  purchaseType: number;
  startTimeMillis: string;
}

export class GooglePlayService {
  private auth: GoogleAuth;
  private readonly baseUrl = 'https://androidpublisher.googleapis.com/androidpublisher/v3';
  private readonly packageName: string;

  constructor() {
    this.packageName = process.env.ANDROID_PACKAGE_NAME || 'com.cookcam.app';

    // Use service account key or Application Default Credentials
    this.auth = new GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
  }

  /**
   * Validate a subscription by getting its details
   */
  async validateSubscription(
    subscriptionId: string,
    purchaseToken: string
  ): Promise<GooglePlaySubscription | null> {
    try {
      return await this.getSubscription(subscriptionId, purchaseToken);
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.status === 410) {
        return null; // Subscription not found or expired
      }
      throw error;
    }
  }

  /**
   * Get subscription details from Google Play
   */
  async getSubscription(
    subscriptionId: string,
    purchaseToken: string
  ): Promise<GooglePlaySubscription> {
    const accessToken = await this.getAccessToken();

    const url = `${this.baseUrl}/applications/${this.packageName}/purchases/subscriptions/${subscriptionId}/tokens/${purchaseToken}`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  }

  /**
   * Acknowledge a subscription purchase
   */
  async acknowledgeSubscription(subscriptionId: string, purchaseToken: string): Promise<void> {
    const accessToken = await this.getAccessToken();

    const url = `${this.baseUrl}/applications/${this.packageName}/purchases/subscriptions/${subscriptionId}/tokens/${purchaseToken}:acknowledge`;

    await axios.post(
      url,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, purchaseToken: string): Promise<void> {
    const accessToken = await this.getAccessToken();

    const url = `${this.baseUrl}/applications/${this.packageName}/purchases/subscriptions/${subscriptionId}/tokens/${purchaseToken}:cancel`;

    await axios.post(
      url,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  /**
   * Defer a subscription (extend the expiration)
   */
  async deferSubscription(
    subscriptionId: string,
    purchaseToken: string,
    newExpiryTime: Date
  ): Promise<void> {
    const accessToken = await this.getAccessToken();

    const url = `${this.baseUrl}/applications/${this.packageName}/purchases/subscriptions/${subscriptionId}/tokens/${purchaseToken}:defer`;

    await axios.post(
      url,
      {
        deferralInfo: {
          expectedExpiryTimeMillis: newExpiryTime.getTime().toString(),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  /**
   * Get access token for Google Play API
   */
  private async getAccessToken(): Promise<string> {
    const client = await this.auth.getClient();
    const tokenResponse = await client.getAccessToken();

    if (!tokenResponse.token) {
      throw new Error('Failed to get Google Play access token');
    }

    return tokenResponse.token;
  }
}

export const googlePlayService = new GooglePlayService();
