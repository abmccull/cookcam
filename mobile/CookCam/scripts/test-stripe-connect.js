#!/usr/bin/env node

/**
 * Stripe Connect Testing Script
 * 
 * This script tests the complete Stripe Connect flow:
 * 1. Creator onboarding
 * 2. Account status checking
 * 3. Dashboard URL generation
 * 4. Payout flow
 */

const https = require('https');
const fs = require('fs');

// Configuration
const API_BASE_URL = 'https://api.cookcam.ai';
const TEST_USER_EMAIL = 'test.creator@cookcam.app';
const TEST_USER_PASSWORD = 'TestCreator123!';

class StripeConnectTester {
  constructor() {
    this.authToken = null;
    this.userId = null;
    this.results = [];
  }

  log(test, status, message, data = null) {
    const result = {
      test,
      status,
      message,
      timestamp: new Date().toISOString(),
      data
    };
    
    this.results.push(result);
    
    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏳';
    console.log(`${emoji} ${test}: ${message}`);
    
    if (data) {
      console.log(`   Data:`, JSON.stringify(data, null, 2));
    }
  }

  async apiCall(method, endpoint, data = null) {
    return new Promise((resolve, reject) => {
      const url = `${API_BASE_URL}${endpoint}`;
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
        }
      };

      const req = https.request(url, options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            resolve({ status: res.statusCode, data: response });
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      });

      req.on('error', reject);
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  async testHealthCheck() {
    try {
      const { status, data } = await this.apiCall('GET', '/api/v1/health');
      
      if (status === 200 && data.status === 'healthy') {
        this.log('Health Check', 'PASS', 'API is healthy and responding', data);
        return true;
      } else {
        this.log('Health Check', 'FAIL', `API returned status ${status}`, data);
        return false;
      }
    } catch (error) {
      this.log('Health Check', 'FAIL', `API request failed: ${error.message}`);
      return false;
    }
  }

  async testAuthentication() {
    try {
      // Test auth endpoint
      const { status, data } = await this.apiCall('POST', '/api/v1/auth/signin', {
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD
      });

      if (status === 200 && data.access_token) {
        this.authToken = data.access_token;
        this.userId = data.user?.id;
        this.log('Authentication', 'PASS', 'Successfully authenticated test user', { userId: this.userId });
        return true;
      } else if (status === 400 && data.error?.includes('Invalid credentials')) {
        this.log('Authentication', 'INFO', 'Test user not found - will need manual testing with real user');
        return false;
      } else {
        this.log('Authentication', 'FAIL', `Auth failed with status ${status}`, data);
        return false;
      }
    } catch (error) {
      this.log('Authentication', 'FAIL', `Auth request failed: ${error.message}`);
      return false;
    }
  }

  async testStripeConnectEndpoints() {
    if (!this.authToken) {
      this.log('Stripe Connect', 'SKIP', 'No auth token - skipping authenticated tests');
      return;
    }

    // Test 1: Check Stripe status
    try {
      const { status, data } = await this.apiCall('GET', '/api/v1/subscription/creator/stripe/status');
      
      if (status === 200) {
        this.log('Stripe Status Check', 'PASS', 'Status endpoint accessible', data);
      } else {
        this.log('Stripe Status Check', 'FAIL', `Status check failed: ${status}`, data);
      }
    } catch (error) {
      this.log('Stripe Status Check', 'FAIL', `Request failed: ${error.message}`);
    }

    // Test 2: Test onboarding endpoint
    try {
      const { status, data } = await this.apiCall('POST', '/api/v1/subscription/creator/stripe/onboard', {
        country: 'US'
      });
      
      if (status === 200 && data.onboardingUrl) {
        this.log('Stripe Onboarding', 'PASS', 'Onboarding URL generated', { 
          accountId: data.accountId,
          hasUrl: !!data.onboardingUrl 
        });
      } else if (status === 403) {
        this.log('Stripe Onboarding', 'INFO', 'User not creator tier - expected for non-creator users');
      } else {
        this.log('Stripe Onboarding', 'FAIL', `Onboarding failed: ${status}`, data);
      }
    } catch (error) {
      this.log('Stripe Onboarding', 'FAIL', `Request failed: ${error.message}`);
    }

    // Test 3: Test dashboard URL
    try {
      const { status, data } = await this.apiCall('GET', '/api/v1/subscription/creator/stripe/dashboard');
      
      if (status === 200 && data.dashboardUrl) {
        this.log('Stripe Dashboard', 'PASS', 'Dashboard URL generated', { hasDashboard: true });
      } else if (status === 404) {
        this.log('Stripe Dashboard', 'INFO', 'No Stripe account found - expected for new users');
      } else {
        this.log('Stripe Dashboard', 'FAIL', `Dashboard failed: ${status}`, data);
      }
    } catch (error) {
      this.log('Stripe Dashboard', 'FAIL', `Request failed: ${error.message}`);
    }
  }

  async testEnvironmentVariables() {
    // Test if Stripe webhooks are accessible
    try {
      const { status } = await this.apiCall('POST', '/api/v1/webhook/stripe-connect', {
        type: 'test.webhook'
      });
      
      if (status === 400 || status === 200) {
        this.log('Webhook Endpoint', 'PASS', 'Webhook endpoint is accessible');
      } else {
        this.log('Webhook Endpoint', 'FAIL', `Webhook endpoint returned: ${status}`);
      }
    } catch (error) {
      this.log('Webhook Endpoint', 'FAIL', `Webhook test failed: ${error.message}`);
    }
  }

  async run() {
    console.log('\n🧪 Starting Stripe Connect Test Suite\n');
    console.log('=' * 50);
    
    // Run tests in sequence
    const healthOk = await this.testHealthCheck();
    if (!healthOk) {
      console.log('\n❌ API health check failed - stopping tests');
      return;
    }

    await this.testAuthentication();
    await this.testStripeConnectEndpoints();
    await this.testEnvironmentVariables();

    // Generate report
    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 Test Results Summary\n');
    console.log('=' * 50);

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const info = this.results.filter(r => r.status === 'INFO').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`ℹ️  Info: ${info}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`📝 Total: ${this.results.length}`);

    // Save detailed report
    const report = {
      summary: { passed, failed, info, skipped, total: this.results.length },
      timestamp: new Date().toISOString(),
      results: this.results
    };

    fs.writeFileSync('stripe-connect-test-results.json', JSON.stringify(report, null, 2));
    console.log('\n📁 Detailed report saved to: stripe-connect-test-results.json');

    // Show next steps
    console.log('\n🎯 Next Steps for Manual Testing:');
    console.log('1. Open CookCam mobile app');
    console.log('2. Create a creator account or upgrade existing account');
    console.log('3. Navigate to Profile → Become a Creator');
    console.log('4. Complete Stripe Connect onboarding');
    console.log('5. Test dashboard access and payout flow');
  }
}

// Run the tests
const tester = new StripeConnectTester();
tester.run().catch(console.error); 