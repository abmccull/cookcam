import { Server as HttpServer } from 'http';
import { RealTimeService, initializeRealTimeService, getRealTimeService } from '../realTimeService';
import { Server as SocketIOServer } from 'socket.io';
import { Client as SocketIOClient } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('socket.io');
jest.mock('jsonwebtoken');
jest.mock('../../utils/logger');
jest.mock('../../index', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  },
}));

const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('RealTimeService', () => {
  let mockHttpServer: HttpServer;
  let mockIo: jest.Mocked<SocketIOServer>;
  let mockSocket: any;
  let realTimeService: RealTimeService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock HTTP server
    mockHttpServer = {} as HttpServer;

    // Mock socket
    mockSocket = {
      id: 'socket123',
      userId: 'user123',
      user: {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
      },
      handshake: {
        auth: { token: 'valid-token' },
        headers: {},
      },
      emit: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      broadcast: { emit: jest.fn() },
      join: jest.fn(),
      leave: jest.fn(),
      on: jest.fn(),
    };

    // Mock Socket.IO server
    mockIo = {
      use: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    } as any;

    (SocketIOServer as jest.MockedClass<typeof SocketIOServer>).mockImplementation(() => mockIo);

    // Mock JWT
    mockJwt.verify.mockReturnValue({
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
    } as any);

    process.env.JWT_SECRET = 'test-secret';
    process.env.CORS_ORIGIN = 'http://localhost:3000';
  });

  describe('Initialization', () => {
    it('should initialize real-time service with proper configuration', () => {
      realTimeService = new RealTimeService(mockHttpServer);

      expect(SocketIOServer).toHaveBeenCalledWith(mockHttpServer, {
        cors: {
          origin: 'http://localhost:3000',
          methods: ['GET', 'POST'],
          credentials: true,
        },
        transports: ['websocket', 'polling'],
      });

      expect(mockIo.use).toHaveBeenCalled();
      expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith('🔄 Real-time service initialized with WebSocket support');
    });

    it('should setup authentication middleware', () => {
      realTimeService = new RealTimeService(mockHttpServer);

      const authMiddleware = (mockIo.use as jest.Mock).mock.calls[0][0];
      const next = jest.fn();

      // Test successful authentication
      authMiddleware(mockSocket, next);

      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(mockSocket.userId).toBe('user123');
      expect(mockSocket.user).toEqual({
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject authentication without token', () => {
      realTimeService = new RealTimeService(mockHttpServer);

      const authMiddleware = (mockIo.use as jest.Mock).mock.calls[0][0];
      const next = jest.fn();
      const socketWithoutToken = { ...mockSocket, handshake: { auth: {}, headers: {} } };

      authMiddleware(socketWithoutToken, next);

      expect(next).toHaveBeenCalledWith(new Error('Authentication token required'));
    });

    it('should reject authentication with invalid token', () => {
      realTimeService = new RealTimeService(mockHttpServer);
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const authMiddleware = (mockIo.use as jest.Mock).mock.calls[0][0];
      const next = jest.fn();

      authMiddleware(mockSocket, next);

      expect(next).toHaveBeenCalledWith(new Error('Authentication failed'));
      expect(mockLogger.error).toHaveBeenCalledWith('❌ WebSocket authentication failed', { error: expect.any(Error) });
    });
  });

  describe('Connection Handling', () => {
    beforeEach(() => {
      realTimeService = new RealTimeService(mockHttpServer);
    });

    it('should handle user connection properly', () => {
      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      expect(mockLogger.info).toHaveBeenCalledWith('🔌 User connected to WebSocket', {
        userId: 'user123',
        socketId: 'socket123',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('connected', {
        message: 'Connected to CookCam real-time service',
        userId: 'user123',
        timestamp: expect.any(String),
      });
    });

    it('should setup all event listeners on connection', () => {
      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      const expectedEvents = [
        'create_cooking_session',
        'join_cooking_session',
        'leave_cooking_session',
        'update_cooking_step',
        'cooking_session_message',
        'share_recipe_live',
        'like_live_recipe',
        'comment_live_recipe',
        'share_scan_result',
        'request_recipe_collab',
        'update_cooking_status',
        'disconnect',
      ];

      expectedEvents.forEach((event) => {
        expect(mockSocket.on).toHaveBeenCalledWith(event, expect.any(Function));
      });
    });
  });

  describe('Cooking Session Management', () => {
    beforeEach(() => {
      realTimeService = new RealTimeService(mockHttpServer);
      // Get the connection handler and simulate connection
      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);
    });

    it('should create cooking session successfully', async () => {
      const { supabase } = require('../../index');
      supabase.from().select().eq().single.mockResolvedValue({
        data: { id: 'recipe123', title: 'Test Recipe', instructions: ['step1', 'step2'] },
        error: null,
      });

      // Get the create session handler
      const createSessionCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'create_cooking_session'
      );
      const createSessionHandler = createSessionCall[1];

      await createSessionHandler({
        recipeId: 'recipe123',
        title: 'Test Cooking Session',
        isPublic: true,
      });

      expect(mockSocket.join).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('cooking_session_created', {
        session: expect.objectContaining({
          hostId: 'user123',
          recipeId: 'recipe123',
          title: 'Test Cooking Session',
          participants: ['user123'],
          currentStep: 0,
          totalSteps: 2,
          isActive: true,
        }),
        message: 'Cooking session created successfully',
      });

      expect(supabase.from).toHaveBeenCalledWith('cooking_sessions');
    });

    it('should handle recipe not found when creating session', async () => {
      const { supabase } = require('../../index');
      supabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Recipe not found' },
      });

      const createSessionCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'create_cooking_session'
      );
      const createSessionHandler = createSessionCall[1];

      await createSessionHandler({
        recipeId: 'nonexistent',
        title: 'Test Session',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { message: 'Recipe not found' });
    });

    it('should join existing cooking session', async () => {
      // First create a session
      const sessionId = 'test-session-123';
      (realTimeService as any).activeSessions.set(sessionId, {
        id: sessionId,
        hostId: 'host123',
        recipeId: 'recipe123',
        title: 'Test Session',
        participants: ['host123'],
        currentStep: 1,
        totalSteps: 5,
        isActive: true,
        createdAt: new Date(),
      });

      const joinSessionCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'join_cooking_session'
      );
      const joinSessionHandler = joinSessionCall[1];

      await joinSessionHandler({ sessionId });

      expect(mockSocket.join).toHaveBeenCalledWith(sessionId);
      expect(mockSocket.to).toHaveBeenCalledWith(sessionId);
      expect(mockSocket.emit).toHaveBeenCalledWith('cooking_session_joined', {
        session: expect.objectContaining({
          participants: ['host123', 'user123'],
        }),
        message: 'Joined cooking session successfully',
      });
    });

    it('should handle joining non-existent session', async () => {
      const joinSessionCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'join_cooking_session'
      );
      const joinSessionHandler = joinSessionCall[1];

      await joinSessionHandler({ sessionId: 'nonexistent' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { 
        message: 'Cooking session not found or inactive' 
      });
    });

    it('should update cooking step (host only)', async () => {
      const sessionId = 'test-session-123';
      (realTimeService as any).activeSessions.set(sessionId, {
        id: sessionId,
        hostId: 'user123', // Current user is host
        recipeId: 'recipe123',
        title: 'Test Session',
        participants: ['user123'],
        currentStep: 1,
        totalSteps: 5,
        isActive: true,
        createdAt: new Date(),
      });

      const updateStepCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'update_cooking_step'
      );
      const updateStepHandler = updateStepCall[1];

      await updateStepHandler({
        sessionId,
        newStep: 3,
        stepNotes: 'Added extra seasoning',
      });

      expect(mockIo.to).toHaveBeenCalledWith(sessionId);
      expect((realTimeService as any).activeSessions.get(sessionId).currentStep).toBe(3);
    });

    it('should reject step updates from non-host users', async () => {
      const sessionId = 'test-session-123';
      (realTimeService as any).activeSessions.set(sessionId, {
        id: sessionId,
        hostId: 'other-user', // Different host
        recipeId: 'recipe123',
        title: 'Test Session',
        participants: ['other-user', 'user123'],
        currentStep: 1,
        totalSteps: 5,
        isActive: true,
        createdAt: new Date(),
      });

      const updateStepCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'update_cooking_step'
      );
      const updateStepHandler = updateStepCall[1];

      await updateStepHandler({
        sessionId,
        newStep: 3,
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { 
        message: 'Only session host can update cooking steps' 
      });
    });

    it('should leave cooking session gracefully', () => {
      const sessionId = 'test-session-123';
      (realTimeService as any).activeSessions.set(sessionId, {
        id: sessionId,
        hostId: 'other-user',
        recipeId: 'recipe123',
        title: 'Test Session',
        participants: ['other-user', 'user123'],
        currentStep: 1,
        totalSteps: 5,
        isActive: true,
        createdAt: new Date(),
      });

      const leaveSessionCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'leave_cooking_session'
      );
      const leaveSessionHandler = leaveSessionCall[1];

      leaveSessionHandler({ sessionId });

      expect(mockSocket.leave).toHaveBeenCalledWith(sessionId);
      expect(mockSocket.to).toHaveBeenCalledWith(sessionId);
      
      const session = (realTimeService as any).activeSessions.get(sessionId);
      expect(session.participants).not.toContain('user123');
    });

    it('should end session when host leaves', () => {
      const sessionId = 'test-session-123';
      (realTimeService as any).activeSessions.set(sessionId, {
        id: sessionId,
        hostId: 'user123', // Current user is host
        recipeId: 'recipe123',
        title: 'Test Session',
        participants: ['user123', 'other-user'],
        currentStep: 1,
        totalSteps: 5,
        isActive: true,
        createdAt: new Date(),
      });

      const leaveSessionCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'leave_cooking_session'
      );
      const leaveSessionHandler = leaveSessionCall[1];

      leaveSessionHandler({ sessionId });

      expect(mockIo.to).toHaveBeenCalledWith(sessionId);
      const session = (realTimeService as any).activeSessions.get(sessionId);
      expect(session.isActive).toBe(false);
    });
  });

  describe('Recipe Sharing', () => {
    beforeEach(() => {
      realTimeService = new RealTimeService(mockHttpServer);
      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);
    });

    it('should share recipe live to all users', async () => {
      const shareRecipeCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'share_recipe_live'
      );
      const shareRecipeHandler = shareRecipeCall[1];

      await shareRecipeHandler({
        recipeId: 'recipe123',
        title: 'Amazing Pasta',
        description: 'Delicious pasta recipe',
        tags: ['italian', 'pasta'],
      });

      expect(mockIo.emit).toHaveBeenCalledWith('live_recipe_shared', {
        id: expect.any(String),
        userId: 'user123',
        recipeId: 'recipe123',
        title: 'Amazing Pasta',
        description: 'Delicious pasta recipe',
        timestamp: expect.any(Date),
        userName: 'Test User',
        tags: ['italian', 'pasta'],
      });
    });

    it('should handle live recipe likes', () => {
      const likeRecipeCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'like_live_recipe'
      );
      const likeRecipeHandler = likeRecipeCall[1];

      likeRecipeHandler({ shareId: 'share123' });

      expect(mockIo.emit).toHaveBeenCalledWith('live_recipe_liked', {
        shareId: 'share123',
        likedBy: 'user123',
        userName: 'Test User',
        timestamp: expect.any(String),
      });
    });

    it('should handle live recipe comments', () => {
      const commentRecipeCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'comment_live_recipe'
      );
      const commentRecipeHandler = commentRecipeCall[1];

      commentRecipeHandler({
        shareId: 'share123',
        comment: 'Looks delicious!',
      });

      expect(mockIo.emit).toHaveBeenCalledWith('live_recipe_commented', {
        shareId: 'share123',
        comment: 'Looks delicious!',
        commentBy: 'user123',
        userName: 'Test User',
        timestamp: expect.any(String),
      });
    });
  });

  describe('Scan Result Sharing', () => {
    beforeEach(() => {
      realTimeService = new RealTimeService(mockHttpServer);
      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);
    });

    it('should share scan results live', async () => {
      const shareScanCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'share_scan_result'
      );
      const shareScanHandler = shareScanCall[1];

      await shareScanHandler({
        ingredients: ['tomato', 'onion', 'garlic'],
        confidence: 0.95,
        imageUrl: 'https://example.com/image.jpg',
      });

      expect(mockIo.emit).toHaveBeenCalledWith('live_scan_shared', {
        userId: 'user123',
        userName: 'Test User',
        ingredients: ['tomato', 'onion', 'garlic'],
        confidence: 0.95,
        imageUrl: 'https://example.com/image.jpg',
        timestamp: expect.any(String),
      });
    });
  });

  describe('Messaging', () => {
    beforeEach(() => {
      realTimeService = new RealTimeService(mockHttpServer);
      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);
    });

    it('should send cooking session messages', async () => {
      const sessionId = 'test-session-123';
      (realTimeService as any).activeSessions.set(sessionId, {
        id: sessionId,
        hostId: 'host123',
        participants: ['host123', 'user123'],
        isActive: true,
      });

      const messageCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'cooking_session_message'
      );
      const messageHandler = messageCall[1];

      await messageHandler({
        sessionId,
        message: 'This looks great!',
        messageType: 'text',
      });

      expect(mockIo.to).toHaveBeenCalledWith(sessionId);
    });

    it('should reject messages from non-participants', async () => {
      const sessionId = 'test-session-123';
      (realTimeService as any).activeSessions.set(sessionId, {
        id: sessionId,
        hostId: 'host123',
        participants: ['host123'], // user123 not included
        isActive: true,
      });

      const messageCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'cooking_session_message'
      );
      const messageHandler = messageCall[1];

      await messageHandler({
        sessionId,
        message: 'This looks great!',
        messageType: 'text',
      });

      expect(mockIo.to).not.toHaveBeenCalled();
    });
  });

  describe('Status Updates', () => {
    beforeEach(() => {
      realTimeService = new RealTimeService(mockHttpServer);
      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);
    });

    it('should broadcast cooking status updates', () => {
      const statusCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'update_cooking_status'
      );
      const statusHandler = statusCall[1];

      statusHandler({
        status: 'cooking',
        recipeId: 'recipe123',
        currentStep: 2,
      });

      expect(mockSocket.broadcast.emit).toHaveBeenCalledWith('user_status_updated', {
        userId: 'user123',
        userName: 'Test User',
        status: 'cooking',
        recipeId: 'recipe123',
        currentStep: 2,
        timestamp: expect.any(String),
      });
    });
  });

  describe('Collaboration Requests', () => {
    beforeEach(() => {
      realTimeService = new RealTimeService(mockHttpServer);
      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);
    });

    it('should send collaboration requests to target users', () => {
      // Set up target user connection
      (realTimeService as any).userConnections.set('target-user', 'target-socket-123');

      const collabCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'request_recipe_collab'
      );
      const collabHandler = collabCall[1];

      collabHandler({
        targetUserId: 'target-user',
        recipeId: 'recipe123',
        message: 'Want to cook this together?',
      });

      expect(mockIo.to).toHaveBeenCalledWith('target-socket-123');
    });

    it('should handle collaboration requests to offline users', () => {
      const collabCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'request_recipe_collab'
      );
      const collabHandler = collabCall[1];

      collabHandler({
        targetUserId: 'offline-user',
        recipeId: 'recipe123',
        message: 'Want to cook this together?',
      });

      // Should not throw error, just silently not send
      expect(mockIo.to).not.toHaveBeenCalled();
    });
  });

  describe('Disconnect Handling', () => {
    beforeEach(() => {
      realTimeService = new RealTimeService(mockHttpServer);
      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);
    });

    it('should clean up user connections on disconnect', () => {
      const disconnectCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'disconnect'
      );
      const disconnectHandler = disconnectCall[1];

      // Set up user connection
      (realTimeService as any).userConnections.set('user123', 'socket123');

      disconnectHandler();

      expect((realTimeService as any).userConnections.has('user123')).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('🔌 User disconnected from WebSocket', { 
        userId: 'user123' 
      });
    });

    it('should remove user from active sessions on disconnect', () => {
      const sessionId = 'test-session-123';
      (realTimeService as any).activeSessions.set(sessionId, {
        id: sessionId,
        hostId: 'other-user',
        participants: ['other-user', 'user123'],
        isActive: true,
      });

      const disconnectCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'disconnect'
      );
      const disconnectHandler = disconnectCall[1];

      disconnectHandler();

      const session = (realTimeService as any).activeSessions.get(sessionId);
      expect(session.participants).not.toContain('user123');
    });
  });

  describe('Public Methods', () => {
    beforeEach(() => {
      realTimeService = new RealTimeService(mockHttpServer);
    });

    it('should notify specific users', () => {
      (realTimeService as any).userConnections.set('user123', 'socket123');

      realTimeService.notifyUser('user123', 'test_event', { message: 'test' });

      expect(mockIo.to).toHaveBeenCalledWith('socket123');
    });

    it('should broadcast to all users', () => {
      realTimeService.broadcastToAll('global_event', { message: 'global test' });

      expect(mockIo.emit).toHaveBeenCalledWith('global_event', { message: 'global test' });
    });

    it('should get active sessions for user', () => {
      const session1 = {
        id: 'session1',
        hostId: 'user123',
        participants: ['user123', 'user456'],
        isActive: true,
      };
      const session2 = {
        id: 'session2',
        hostId: 'user456',
        participants: ['user456'],
        isActive: true,
      };

      (realTimeService as any).activeSessions.set('session1', session1);
      (realTimeService as any).activeSessions.set('session2', session2);

      const userSessions = realTimeService.getActiveSessionsForUser('user123');

      expect(userSessions).toHaveLength(1);
      expect(userSessions[0]?.id).toBe('session1');
    });

    it('should get connection count', () => {
      (realTimeService as any).userConnections.set('user1', 'socket1');
      (realTimeService as any).userConnections.set('user2', 'socket2');
      (realTimeService as any).userConnections.set('user3', 'socket3');

      const count = realTimeService.getConnectionCount();

      expect(count).toBe(3);
    });
  });

  describe('Module Functions', () => {
    it('should initialize and return real-time service', () => {
      const service = initializeRealTimeService(mockHttpServer);

      expect(service).toBeInstanceOf(RealTimeService);
      expect(getRealTimeService()).toBe(service);
    });

    it('should return existing service instance', () => {
      const service1 = initializeRealTimeService(mockHttpServer);
      const service2 = getRealTimeService();

      expect(service1).toBe(service2);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      realTimeService = new RealTimeService(mockHttpServer);
      const connectionHandler = (mockIo.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);
    });

    it('should handle database errors during session creation', async () => {
      const { supabase } = require('../../index');
      supabase.from().select().eq().single.mockRejectedValue(new Error('Database error'));

      const createSessionCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'create_cooking_session'
      );
      const createSessionHandler = createSessionCall[1];

      await createSessionHandler({
        recipeId: 'recipe123',
        title: 'Test Session',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', { 
        message: 'Failed to create cooking session' 
      });
      expect(mockLogger.error).toHaveBeenCalledWith('❌ Failed to create cooking session', { 
        error: expect.any(Error) 
      });
    });

    it('should handle events without user authentication', async () => {
      const unauthenticatedSocket = { ...mockSocket, userId: undefined };

      const createSessionCall = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'create_cooking_session'
      );
      
      // Manually call handler with unauthenticated socket
      const handler = createSessionCall[1];
      await handler.call({ userId: undefined }, {
        recipeId: 'recipe123',
        title: 'Test Session',
      });

      // Should handle gracefully without crashing
      expect(mockSocket.emit).not.toHaveBeenCalledWith('cooking_session_created', expect.any(Object));
    });
  });
});