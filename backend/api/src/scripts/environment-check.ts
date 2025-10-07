import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface EnvironmentCheck {
  name: string;
  required: boolean;
  present: boolean;
  critical: boolean;
  description: string;
  value?: string;
}

async function checkEnvironmentVariables() {
  console.log('🔍 CookCam Environment Variables Check\n');

  const checks: EnvironmentCheck[] = [
    // Critical Core Variables
    {
      name: 'SUPABASE_URL',
      required: true,
      present: !!process.env.SUPABASE_URL,
      critical: true,
      description: 'Supabase project URL',
      value: process.env.SUPABASE_URL?.substring(0, 30) + '...',
    },
    {
      name: 'SUPABASE_ANON_KEY',
      required: true,
      present: !!process.env.SUPABASE_ANON_KEY,
      critical: true,
      description: 'Supabase anonymous key',
      value: process.env.SUPABASE_ANON_KEY?.substring(0, 20) + '...',
    },
    {
      name: 'SUPABASE_SERVICE_KEY',
      required: true,
      present: !!process.env.SUPABASE_SERVICE_KEY,
      critical: true,
      description: 'Supabase service key (for admin operations)',
      value: process.env.SUPABASE_SERVICE_KEY?.substring(0, 20) + '...',
    },
    {
      name: 'OPENAI_API_KEY',
      required: true,
      present: !!process.env.OPENAI_API_KEY,
      critical: true,
      description: 'OpenAI API key for ingredient detection',
      value: process.env.OPENAI_API_KEY?.substring(0, 15) + '...',
    },
    {
      name: 'JWT_SECRET',
      required: true,
      present: !!process.env.JWT_SECRET,
      critical: true,
      description: 'JWT signing secret',
      value: process.env.JWT_SECRET ? '[PRESENT]' : '[MISSING]',
    },
    {
      name: 'JWT_REFRESH_SECRET',
      required: true,
      present: !!process.env.JWT_REFRESH_SECRET,
      critical: true,
      description: 'JWT refresh token secret',
      value: process.env.JWT_REFRESH_SECRET ? '[PRESENT]' : '[MISSING]',
    },

    // Important Non-Critical Variables
    {
      name: 'USDA_API_KEY',
      required: false,
      present: !!process.env.USDA_API_KEY,
      critical: false,
      description: 'USDA Food Data API key (for nutrition data)',
      value: process.env.USDA_API_KEY?.substring(0, 15) + '...',
    },
    {
      name: 'NODE_ENV',
      required: true,
      present: !!process.env.NODE_ENV,
      critical: false,
      description: 'Node environment (development/production)',
      value: process.env.NODE_ENV,
    },
    {
      name: 'PORT',
      required: false,
      present: !!process.env.PORT,
      critical: false,
      description: 'Server port number',
      value: process.env.PORT || '3000 (default)',
    },
    {
      name: 'CORS_ORIGIN',
      required: false,
      present: !!process.env.CORS_ORIGIN,
      critical: false,
      description: 'CORS origin for frontend',
      value: process.env.CORS_ORIGIN,
    },

    // Subscription/Payment Variables
    {
      name: 'STRIPE_SECRET_KEY',
      required: false,
      present: !!process.env.STRIPE_SECRET_KEY,
      critical: false,
      description: 'Stripe secret key for payments',
      value: process.env.STRIPE_SECRET_KEY?.substring(0, 15) + '...',
    },
    {
      name: 'APP_STORE_SHARED_SECRET',
      required: false,
      present: !!process.env.APP_STORE_SHARED_SECRET,
      critical: false,
      description: 'App Store shared secret for iOS subscriptions',
      value: process.env.APP_STORE_SHARED_SECRET ? '[PRESENT]' : '[MISSING]',
    },
    {
      name: 'GOOGLE_SERVICE_ACCOUNT_KEY',
      required: false,
      present: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      critical: false,
      description: 'Google service account for Android subscriptions',
      value: process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? '[PRESENT]' : '[MISSING]',
    },

    // Push Notifications
    {
      name: 'FCM_SERVER_KEY',
      required: false,
      present: !!process.env.FCM_SERVER_KEY,
      critical: false,
      description: 'Firebase Cloud Messaging server key',
      value: process.env.FCM_SERVER_KEY?.substring(0, 15) + '...',
    },
    {
      name: 'APNS_KEY_ID',
      required: false,
      present: !!process.env.APNS_KEY_ID,
      critical: false,
      description: 'Apple Push Notification Service key ID',
      value: process.env.APNS_KEY_ID,
    },

    // Optional Services
    {
      name: 'REDIS_URL',
      required: false,
      present: !!process.env.REDIS_URL,
      critical: false,
      description: 'Redis URL for caching',
      value: process.env.REDIS_URL?.substring(0, 25) + '...',
    },
    {
      name: 'DATABASE_URL',
      required: false,
      present: !!process.env.DATABASE_URL,
      critical: false,
      description: 'Direct PostgreSQL connection (for USDA seeding)',
      value: process.env.DATABASE_URL?.substring(0, 25) + '...',
    },
  ];

  // Check critical variables
  const criticalMissing = checks.filter((check) => check.critical && !check.present);
  const requiredMissing = checks.filter((check) => check.required && !check.present);

  console.log('🔧 Critical Variables Status:');
  console.log('================================');

  checks
    .filter((check) => check.critical)
    .forEach((check) => {
      const status = check.present ? '✅' : '❌';
      console.log(`${status} ${check.name.padEnd(25)} - ${check.description}`);
      if (check.present && check.value) {
        console.log(`   Value: ${check.value}`);
      }
    });

  console.log('\n📋 All Variables Status:');
  console.log('========================');

  checks.forEach((check) => {
    const status = check.present ? '✅' : check.required ? '❌' : '⚠️';
    const criticality = check.critical
      ? '[CRITICAL]'
      : check.required
        ? '[REQUIRED]'
        : '[OPTIONAL]';
    console.log(
      `${status} ${check.name.padEnd(25)} ${criticality.padEnd(12)} - ${check.description}`
    );
  });

  console.log('\n📊 Summary:');
  console.log('===========');
  console.log(`Total Variables: ${checks.length}`);
  console.log(`Present: ${checks.filter((c) => c.present).length}`);
  console.log(`Missing: ${checks.filter((c) => !c.present).length}`);
  console.log(`Critical Missing: ${criticalMissing.length}`);
  console.log(`Required Missing: ${requiredMissing.length}`);

  if (criticalMissing.length > 0) {
    console.log('\n🚨 CRITICAL VARIABLES MISSING:');
    console.log('==============================');
    criticalMissing.forEach((check) => {
      console.log(`❌ ${check.name} - ${check.description}`);
    });
    console.log('\n⚠️  The application CANNOT run in production without these variables!');
  }

  if (requiredMissing.length > 0 && criticalMissing.length === 0) {
    console.log('\n⚠️  REQUIRED VARIABLES MISSING:');
    console.log('===============================');
    requiredMissing.forEach((check) => {
      console.log(`❌ ${check.name} - ${check.description}`);
    });
    console.log('\n⚠️  The application may not function correctly without these variables.');
  }

  const productionReadiness = criticalMissing.length === 0 && requiredMissing.length === 0;

  console.log('\n🎯 Production Readiness:');
  console.log('========================');
  if (productionReadiness) {
    console.log('✅ READY FOR PRODUCTION DEPLOYMENT');
    console.log('   All critical and required environment variables are configured.');
  } else {
    console.log('❌ NOT READY FOR PRODUCTION');
    console.log(
      `   Missing ${criticalMissing.length} critical and ${requiredMissing.length - criticalMissing.length} required variables.`
    );
  }

  return {
    productionReady: productionReadiness,
    criticalMissing: criticalMissing.length,
    requiredMissing: requiredMissing.length,
    totalMissing: checks.filter((c) => !c.present).length,
  };
}

// Run the environment check
checkEnvironmentVariables()
  .then((result) => {
    console.log('\n✅ Environment check completed!');
    if (!result.productionReady) {
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Environment check failed:', error);
    process.exit(1);
  });
