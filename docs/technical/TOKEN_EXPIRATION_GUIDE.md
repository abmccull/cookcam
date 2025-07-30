# Token Expiration Handling Guide

## Overview
This guide describes the automatic token refresh and expiration handling implementation in the CookCam mobile app.

## Features Implemented

### 1. Automatic Token Refresh
- Tokens are automatically refreshed 5 minutes before expiration
- Prevents users from being logged out during active sessions
- Handles refresh failures gracefully

### 2. Token Manager Service
Located at: `src/services/tokenManager.ts`

Key features:
- Singleton service that manages token lifecycle
- Automatic scheduling of token refresh
- Handles concurrent refresh requests
- Integrates with Supabase auth

### 3. API Client Integration
- Automatically uses valid tokens for all API requests
- Retries failed requests with refreshed tokens
- Handles 401 responses by attempting token refresh

### 4. Session Monitoring Hook
Located at: `src/hooks/useTokenExpiration.ts`

Usage:
```typescript
import { useTokenExpiration } from '../hooks/useTokenExpiration';

function MyComponent() {
  const { checkTokenValidity, refreshToken } = useTokenExpiration();
  
  // Manually check token validity
  await checkTokenValidity();
  
  // Force token refresh
  await refreshToken();
}
```

### 5. Protected Route Wrapper
Located at: `src/components/ProtectedRoute.tsx`

Usage:
```typescript
import { ProtectedRoute } from '../components/ProtectedRoute';

function MyScreen() {
  return (
    <ProtectedRoute>
      {/* Your protected content */}
    </ProtectedRoute>
  );
}
```

## How It Works

### Token Lifecycle
1. User logs in → Token stored securely
2. TokenManager schedules refresh for 5 minutes before expiry
3. When refresh time arrives, new token is obtained
4. All API calls automatically use the fresh token
5. If refresh fails, user is prompted to re-authenticate

### API Request Flow
1. API client requests token from TokenManager
2. TokenManager checks if current token is valid
3. If expiring soon (< 5 minutes), refreshes automatically
4. Returns valid token for the request
5. If 401 response, attempts refresh and retries

### Session Monitoring
- Active screens check token validity every 5 minutes
- Expired sessions show alert and redirect to login
- Prevents user frustration from unexpected logouts

## Implementation Details

### Token Storage
- Access tokens stored in SecureStore
- Refresh tokens stored securely
- Automatic cleanup on logout

### Error Handling
- Network failures during refresh are retried
- Invalid refresh tokens trigger re-authentication
- User is always informed of session expiration

### Biometric Login Integration
- Biometric credentials updated with fresh tokens
- Seamless experience for biometric users
- Fallback to password login if needed

## Usage in Components

### Basic Usage
No changes needed for most components - token handling is automatic.

### Manual Token Check
```typescript
import { useTokenExpiration } from '../hooks/useTokenExpiration';

function MyComponent() {
  const { checkTokenValidity } = useTokenExpiration();
  
  const handleSensitiveAction = async () => {
    // Ensure token is valid before sensitive action
    await checkTokenValidity();
    // Proceed with action...
  };
}
```

### Protected Screens
Wrap screens that require authentication:
```typescript
export function ProfileScreen() {
  return (
    <ProtectedRoute>
      <View>
        {/* Profile content */}
      </View>
    </ProtectedRoute>
  );
}
```

## Testing

### Manual Testing
1. Log in to the app
2. Wait for token to expire (or adjust token expiry time for testing)
3. Verify automatic refresh occurs
4. Test API calls continue working
5. Test logout clears all tokens

### Simulating Token Expiration
```typescript
// In development, force token expiration
const tokenManager = TokenManager.getInstance();
await tokenManager.forceRefresh();
```

## Troubleshooting

### "Session Expired" Alert Appears
- User's refresh token is invalid
- Network connectivity issues during refresh
- Backend authentication service is down

### API Calls Failing with 401
- Check TokenManager is initialized in AuthContext
- Verify API client uses getValidToken()
- Ensure refresh endpoint is accessible

### Tokens Not Refreshing
- Check Supabase auth configuration
- Verify refresh token is stored correctly
- Check network connectivity

## Best Practices

1. **Don't Store Tokens Manually**
   - Always use TokenManager for token operations
   - Let the system handle refresh automatically

2. **Handle Network Failures**
   - Implement retry logic for critical operations
   - Show appropriate error messages to users

3. **Test Edge Cases**
   - App backgrounding/foregrounding
   - Network disconnection during refresh
   - Multiple concurrent API calls

4. **Monitor Token Expiration**
   - Log token refresh events
   - Track refresh failures
   - Alert on repeated failures

## Security Considerations

1. Tokens are stored in SecureStore (encrypted)
2. Refresh tokens have limited lifetime
3. All tokens cleared on logout
4. No tokens in memory longer than necessary
5. Automatic cleanup of expired tokens

## Future Enhancements

1. Offline token refresh queue
2. Predictive refresh based on user activity
3. Token expiration warnings
4. Configurable refresh intervals
5. Analytics on token lifecycle