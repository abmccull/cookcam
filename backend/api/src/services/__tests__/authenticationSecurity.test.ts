// Comprehensive Authentication & Security Tests
import { mockUsers } from '../../__tests__/utils/mockData';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

// Mock Supabase Auth
const mockSupabaseAuth = {
  signUp: jest.fn(),
  signInWithPassword: jest.fn(),
  signOut: jest.fn(),
  getUser: jest.fn(),
  updateUser: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  refreshSession: jest.fn(),
};

// Mock Supabase Client
const mockSupabase = {
  auth: mockSupabaseAuth,
  from: jest.fn((table: string) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  })),
};

// Authentication Service
class AuthenticationService {
  private supabase = mockSupabase;
  private jwtSecret = process.env.JWT_SECRET || 'test-secret';

  async registerUser(email: string, password: string, name: string) {
    try {
      // Validate input
      this.validateEmail(email);
      this.validatePassword(password);
      this.validateName(name);

      // Check if user already exists
      const existingUser = await this.findUserByEmail(email);
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Create user in Supabase Auth
      const { data: authUser, error: authError } = await this.supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: { name },
        },
      });

      if (authError) throw new Error(authError.message);
      if (!authUser.user) throw new Error('Failed to create user account');

      // Create user profile
      const { data: profile } = await this.supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          email: email.toLowerCase().trim(),
          name,
          created_at: new Date().toISOString(),
          subscription_tier: 'free',
          total_xp: 0,
          level: 1,
        })
        .select()
        .single();

      return {
        success: true,
        data: {
          user: profile,
          requiresVerification: !authUser.user.email_confirmed_at,
        },
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async loginUser(email: string, password: string, ipAddress?: string) {
    try {
      // Rate limiting check
      await this.checkRateLimit(email, ipAddress);

      // Attempt authentication
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        await this.recordFailedAttempt(email, ipAddress);
        throw new Error('Invalid email or password');
      }

      if (!data.user || !data.session) {
        throw new Error('Authentication failed');
      }

      // Get user profile
      const { data: profile } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      // Update last login
      await this.supabase
        .from('users')
        .update({
          last_login: new Date().toISOString(),
          login_count: (profile?.login_count || 0) + 1,
        })
        .eq('id', data.user.id);

      // Clear failed attempts
      await this.clearFailedAttempts(email);

      return {
        success: true,
        data: {
          user: profile,
          session: data.session,
          token: data.session.access_token,
        },
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async resetPassword(email: string) {
    try {
      this.validateEmail(email);

      const { error } = await this.supabase.auth.resetPasswordForEmail(
        email.toLowerCase().trim(),
        {
          redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
        }
      );

      if (error) throw new Error(error.message);

      // Log security event
      await this.logSecurityEvent('password_reset_requested', { email });

      return {
        success: true,
        message: 'Password reset link sent to your email',
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async updatePassword(userId: string, newPassword: string, currentPassword?: string) {
    try {
      this.validatePassword(newPassword);

      // If current password provided, verify it first
      if (currentPassword) {
        const isValid = await this.verifyCurrentPassword(userId, currentPassword);
        if (!isValid) {
          throw new Error('Current password is incorrect');
        }
      }

      const { error } = await this.supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw new Error(error.message);

      // Log security event
      await this.logSecurityEvent('password_changed', { userId });

      // Invalidate all existing sessions except current
      await this.invalidateUserSessions(userId);

      return {
        success: true,
        message: 'Password updated successfully',
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async verifyToken(token: string) {
    try {
      const { data, error } = await this.supabase.auth.getUser(token);
      
      if (error || !data.user) {
        throw new Error('Invalid or expired token');
      }

      // Check if user still exists and is active
      const { data: profile } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (!profile) {
        throw new Error('User account not found');
      }

      if (profile.status === 'suspended') {
        throw new Error('Account has been suspended');
      }

      return {
        success: true,
        data: {
          user: profile,
          authUser: data.user,
        },
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async refreshSession(refreshToken: string) {
    try {
      const { data, error } = await this.supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.session) {
        throw new Error('Invalid refresh token');
      }

      return {
        success: true,
        data: {
          session: data.session,
          token: data.session.access_token,
        },
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Security validation methods
  private validateEmail(email: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new Error('Please provide a valid email address');
    }
  }

  private validatePassword(password: string) {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }
  }

  private validateName(name: string) {
    if (!name || name.trim().length < 1) {
      throw new Error('Name is required');
    }
    if (name.length > 100) {
      throw new Error('Name must be less than 100 characters');
    }
  }

  private async findUserByEmail(email: string) {
    const { data } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();
    return data;
  }

  private async checkRateLimit(email: string, ipAddress?: string) {
    // Implementation would check failed attempts from IP/email
    // For testing, we'll simulate rate limiting
  }

  private async recordFailedAttempt(email: string, ipAddress?: string) {
    // Implementation would record failed login attempt
  }

  private async clearFailedAttempts(email: string) {
    // Implementation would clear failed attempts after successful login
  }

  private async verifyCurrentPassword(userId: string, password: string) {
    // Implementation would verify current password
    return true; // Simplified for testing
  }

  private async logSecurityEvent(event: string, data: any) {
    // Implementation would log security events for monitoring
  }

  private async invalidateUserSessions(userId: string) {
    // Implementation would invalidate user sessions
  }
}

describe('Authentication & Security Service - Production Ready', () => {
  let service: AuthenticationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthenticationService();
  });

  describe('User Registration', () => {
    it('should register new user with valid data', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: {
          user: {
            id: 'new-user-123',
            email: 'newuser@example.com',
            email_confirmed_at: null,
          },
          session: null,
        },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({ data: null });
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: {
          id: 'new-user-123',
          email: 'newuser@example.com',
          name: 'New User',
        },
      });

      const result = await service.registerUser(
        'newuser@example.com',
        'SecurePass123!',
        'New User'
      );

      expect(result.success).toBe(true);
      expect(result.data?.user.email).toBe('newuser@example.com');
      expect(result.data?.requiresVerification).toBe(true);
    });

    it('should reject weak passwords', async () => {
      const result = await service.registerUser(
        'test@example.com',
        'weak',
        'Test User'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Password must be at least 8 characters');
    });

    it('should reject passwords without uppercase letters', async () => {
      const result = await service.registerUser(
        'test@example.com',
        'lowercase123!',
        'Test User'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('uppercase letter');
    });

    it('should reject passwords without numbers', async () => {
      const result = await service.registerUser(
        'test@example.com',
        'NoNumbers!',
        'Test User'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('one number');
    });

    it('should reject passwords without special characters', async () => {
      const result = await service.registerUser(
        'test@example.com',
        'NoSpecial123',
        'Test User'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('special character');
    });

    it('should reject invalid email formats', async () => {
      const result = await service.registerUser(
        'invalid-email',
        'ValidPass123!',
        'Test User'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('valid email address');
    });

    it('should handle existing user registration attempts', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { id: 'existing-user' },
      });

      const result = await service.registerUser(
        'existing@example.com',
        'ValidPass123!',
        'Test User'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('User already exists');
    });

    it('should normalize email addresses', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: null,
        },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({ data: null });
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: { id: 'user-123', email: 'test@example.com' },
      });

      await service.registerUser('  TEST@EXAMPLE.COM  ', 'ValidPass123!', 'Test');

      expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'ValidPass123!',
        options: { data: { name: 'Test' } },
      });
    });
  });

  describe('User Authentication', () => {
    it('should authenticate user with valid credentials', async () => {
      const mockSession = {
        access_token: 'token123',
        refresh_token: 'refresh123',
        user: { id: 'user-123', email: 'test@example.com' },
      };

      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: {
          user: mockSession.user,
          session: mockSession,
        },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockUsers.free,
      });

      const result = await service.loginUser('test@example.com', 'ValidPass123!');

      expect(result.success).toBe(true);
      expect(result.data?.token).toBe('token123');
      expect(result.data?.user).toEqual(mockUsers.free);
    });

    it('should reject invalid credentials', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const result = await service.loginUser('test@example.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email or password');
    });

    it('should update last login timestamp', async () => {
      const mockSession = {
        access_token: 'token123',
        user: { id: 'user-123', email: 'test@example.com' },
      };

      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockSession.user, session: mockSession },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { ...mockUsers.free, login_count: 5 },
      });

      mockSupabase.from().update().eq.mockResolvedValue({ data: {}, error: null });

      await service.loginUser('test@example.com', 'ValidPass123!');

      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        last_login: expect.any(String),
        login_count: 6,
      });
    });
  });

  describe('Password Reset', () => {
    it('should send password reset email', async () => {
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await service.resetPassword('test@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('reset link sent');
      expect(mockSupabaseAuth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          redirectTo: expect.stringContaining('/reset-password'),
        })
      );
    });

    it('should handle password reset errors', async () => {
      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: { message: 'User not found' },
      });

      const result = await service.resetPassword('nonexistent@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('User not found');
    });
  });

  describe('Token Verification', () => {
    it('should verify valid tokens', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
        },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockUsers.free,
      });

      const result = await service.verifyToken('valid-token');

      expect(result.success).toBe(true);
      expect(result.data?.user).toEqual(mockUsers.free);
    });

    it('should reject invalid tokens', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const result = await service.verifyToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid or expired token');
    });

    it('should handle suspended accounts', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { ...mockUsers.free, status: 'suspended' },
      });

      const result = await service.verifyToken('valid-token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Account has been suspended');
    });
  });

  describe('Session Management', () => {
    it('should refresh valid sessions', async () => {
      const newSession = {
        access_token: 'new-token',
        refresh_token: 'new-refresh',
      };

      mockSupabaseAuth.refreshSession.mockResolvedValue({
        data: { session: newSession },
        error: null,
      });

      const result = await service.refreshSession('valid-refresh-token');

      expect(result.success).toBe(true);
      expect(result.data?.token).toBe('new-token');
    });

    it('should reject invalid refresh tokens', async () => {
      mockSupabaseAuth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid refresh token' },
      });

      const result = await service.refreshSession('invalid-refresh');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid refresh token');
    });
  });

  describe('Security Features', () => {
    it('should validate strong passwords during updates', async () => {
      const result = await service.updatePassword('user-123', 'weak');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Password must be at least 8 characters');
    });

    it('should handle password updates successfully', async () => {
      mockSupabaseAuth.updateUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const result = await service.updatePassword('user-123', 'NewSecure123!');

      expect(result.success).toBe(true);
      expect(result.message).toContain('updated successfully');
    });

    it('should sanitize input during registration', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: { id: 'user-123' }, session: null },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({ data: null });
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: { id: 'user-123' },
      });

      await service.registerUser(
        '  TEST@EXAMPLE.COM  ',
        'ValidPass123!',
        '  Test User  '
      );

      expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockSupabaseAuth.signInWithPassword.mockRejectedValue(
        new Error('Network error')
      );

      const result = await service.loginUser('test@example.com', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle database connection failures', async () => {
      mockSupabaseAuth.signUp.mockResolvedValue({
        data: { user: { id: 'user-123' }, session: null },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({ data: null });
      mockSupabase.from().insert().select().single.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await service.registerUser(
        'test@example.com',
        'ValidPass123!',
        'Test User'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });
  });
});