import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { supabase } from '../index';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

interface CookingSession {
  id: string;
  hostId: string;
  recipeId: string;
  title: string;
  participants: string[];
  currentStep: number;
  totalSteps: number;
  isActive: boolean;
  createdAt: Date;
}

interface LiveRecipeShare {
  id: string;
  userId: string;
  recipeId: string;
  title: string;
  description: string;
  timestamp: Date;
}

export class RealTimeService {
  private io: SocketIOServer;
  private activeSessions: Map<string, CookingSession> = new Map();
  private userConnections: Map<string, string> = new Map(); // userId -> socketId

  constructor(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupAuthentication();
    this.setupEventHandlers();
    
    logger.info('🔄 Real-time service initialized with WebSocket support');
  }

  private setupAuthentication() {
    this.io.use((socket: AuthenticatedSocket, next: (err?: Error) => void) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        socket.userId = decoded.id;
        socket.user = {
          id: decoded.id,
          email: decoded.email,
          name: decoded.name
        };

        logger.info('🔐 User authenticated for WebSocket', { userId: decoded.id });
        next();
      } catch (error) {
        logger.error('❌ WebSocket authentication failed', { error });
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info('🔌 User connected to WebSocket', { 
        userId: socket.userId, 
        socketId: socket.id 
      });

      // Track user connection
      if (socket.userId) {
        this.userConnections.set(socket.userId, socket.id);
      }

      // Send initial connection confirmation
      socket.emit('connected', {
        message: 'Connected to CookCam real-time service',
        userId: socket.userId,
        timestamp: new Date().toISOString()
      });

      // Cooking Session Events
      socket.on('create_cooking_session', (data: any) => this.handleCreateCookingSession(socket, data));
      socket.on('join_cooking_session', (data: any) => this.handleJoinCookingSession(socket, data));
      socket.on('leave_cooking_session', (data: any) => this.handleLeaveCookingSession(socket, data));
      socket.on('update_cooking_step', (data: any) => this.handleUpdateCookingStep(socket, data));
      socket.on('cooking_session_message', (data: any) => this.handleCookingMessage(socket, data));

      // Recipe Sharing Events
      socket.on('share_recipe_live', (data: any) => this.handleLiveRecipeShare(socket, data));
      socket.on('like_live_recipe', (data: any) => this.handleLiveLike(socket, data));
      socket.on('comment_live_recipe', (data: any) => this.handleLiveComment(socket, data));

      // Ingredient Discovery Events
      socket.on('share_scan_result', (data: any) => this.handleLiveScanShare(socket, data));
      socket.on('request_recipe_collab', (data: any) => this.handleRecipeCollabRequest(socket, data));

      // User Status Events
      socket.on('update_cooking_status', (data: any) => this.handleCookingStatusUpdate(socket, data));

      // Disconnect handling
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  // Cooking Session Management
  private async handleCreateCookingSession(socket: AuthenticatedSocket, data: {
    recipeId: string;
    title: string;
    isPublic?: boolean;
  }) {
    try {
      if (!socket.userId) {return;}

      // Verify recipe exists and user has access
      const { data: recipe, error } = await supabase
        .from('recipes')
        .select('id, title, instructions')
        .eq('id', data.recipeId)
        .single();

      if (error || !recipe) {
        socket.emit('error', { message: 'Recipe not found' });
        return;
      }

      const sessionId = `session_${Date.now()}_${socket.userId}`;
      const session: CookingSession = {
        id: sessionId,
        hostId: socket.userId,
        recipeId: data.recipeId,
        title: data.title,
        participants: [socket.userId],
        currentStep: 0,
        totalSteps: recipe.instructions?.length || 0,
        isActive: true,
        createdAt: new Date()
      };

      this.activeSessions.set(sessionId, session);

      // Join the session room
      socket.join(sessionId);

      // Store session in database for persistence
      await supabase
        .from('cooking_sessions')
        .insert({
          id: sessionId,
          host_id: socket.userId,
          recipe_id: data.recipeId,
          title: data.title,
          is_public: data.isPublic || false,
          current_step: 0,
          total_steps: session.totalSteps
        });

      socket.emit('cooking_session_created', {
        session,
        message: 'Cooking session created successfully'
      });

      logger.info('🍳 Cooking session created', { sessionId, hostId: socket.userId });

    } catch (error) {
      logger.error('❌ Failed to create cooking session', { error });
      socket.emit('error', { message: 'Failed to create cooking session' });
    }
  }

  private async handleJoinCookingSession(socket: AuthenticatedSocket, data: {
    sessionId: string;
  }) {
    try {
      if (!socket.userId) {return;}

      const session = this.activeSessions.get(data.sessionId);
      if (!session || !session.isActive) {
        socket.emit('error', { message: 'Cooking session not found or inactive' });
        return;
      }

      // Add user to session
      if (!session.participants.includes(socket.userId)) {
        session.participants.push(socket.userId);
      }

      // Join the session room
      socket.join(data.sessionId);

      // Notify other participants
      socket.to(data.sessionId).emit('user_joined_session', {
        userId: socket.userId,
        userName: socket.user?.name,
        participantCount: session.participants.length
      });

      // Send current session state to new participant
      socket.emit('cooking_session_joined', {
        session,
        message: 'Joined cooking session successfully'
      });

      logger.info('👥 User joined cooking session', { 
        sessionId: data.sessionId, 
        userId: socket.userId 
      });

    } catch (error) {
      logger.error('❌ Failed to join cooking session', { error });
      socket.emit('error', { message: 'Failed to join cooking session' });
    }
  }

  private async handleUpdateCookingStep(socket: AuthenticatedSocket, data: {
    sessionId: string;
    newStep: number;
    stepNotes?: string;
  }) {
    try {
      if (!socket.userId) {return;}

      const session = this.activeSessions.get(data.sessionId);
      if (!session || session.hostId !== socket.userId) {
        socket.emit('error', { message: 'Only session host can update cooking steps' });
        return;
      }

      // Update session step
      session.currentStep = data.newStep;

      // Broadcast to all participants
      this.io.to(data.sessionId).emit('cooking_step_updated', {
        sessionId: data.sessionId,
        currentStep: data.newStep,
        totalSteps: session.totalSteps,
        stepNotes: data.stepNotes,
        updatedBy: socket.user?.name
      });

      // Update database
      await supabase
        .from('cooking_sessions')
        .update({ current_step: data.newStep })
        .eq('id', data.sessionId);

      logger.info('📋 Cooking step updated', { 
        sessionId: data.sessionId, 
        step: data.newStep 
      });

    } catch (error) {
      logger.error('❌ Failed to update cooking step', { error });
    }
  }

  private async handleLiveRecipeShare(socket: AuthenticatedSocket, data: {
    recipeId: string;
    title: string;
    description: string;
    tags?: string[];
  }) {
    try {
      if (!socket.userId) {return;}

      const shareId = `share_${Date.now()}_${socket.userId}`;
      const liveShare: LiveRecipeShare = {
        id: shareId,
        userId: socket.userId,
        recipeId: data.recipeId,
        title: data.title,
        description: data.description,
        timestamp: new Date()
      };

      // Broadcast to all connected users (global recipe feed)
      this.io.emit('live_recipe_shared', {
        ...liveShare,
        userName: socket.user?.name,
        tags: data.tags || []
      });

      // Store in database for persistence
      await supabase
        .from('live_recipe_shares')
        .insert({
          id: shareId,
          user_id: socket.userId,
          recipe_id: data.recipeId,
          title: data.title,
          description: data.description
        });

      logger.info('📢 Recipe shared live', { shareId, userId: socket.userId });

    } catch (error) {
      logger.error('❌ Failed to share recipe live', { error });
    }
  }

  private async handleLiveScanShare(socket: AuthenticatedSocket, data: {
    ingredients: string[];
    confidence: number;
    imageUrl?: string;
  }) {
    try {
      if (!socket.userId) {return;}

      // Broadcast to interested users (could be filtered by preferences)
      this.io.emit('live_scan_shared', {
        userId: socket.userId,
        userName: socket.user?.name,
        ingredients: data.ingredients,
        confidence: data.confidence,
        imageUrl: data.imageUrl,
        timestamp: new Date().toISOString()
      });

      logger.info('🔍 Scan result shared live', { 
        userId: socket.userId, 
        ingredients: data.ingredients.length 
      });

    } catch (error) {
      logger.error('❌ Failed to share scan result', { error });
    }
  }

  private async handleCookingMessage(socket: AuthenticatedSocket, data: {
    sessionId: string;
    message: string;
    messageType?: 'text' | 'image' | 'timer' | 'help';
  }) {
    try {
      if (!socket.userId) {return;}

      const session = this.activeSessions.get(data.sessionId);
      if (!session || !session.participants.includes(socket.userId)) {
        return;
      }

      // Broadcast message to session participants
      this.io.to(data.sessionId).emit('cooking_message', {
        sessionId: data.sessionId,
        userId: socket.userId,
        userName: socket.user?.name,
        message: data.message,
        messageType: data.messageType || 'text',
        timestamp: new Date().toISOString()
      });

      logger.info('💬 Cooking session message', { 
        sessionId: data.sessionId, 
        userId: socket.userId 
      });

    } catch (error) {
      logger.error('❌ Failed to send cooking message', { error });
    }
  }

  private handleCookingStatusUpdate(socket: AuthenticatedSocket, data: {
    status: 'cooking' | 'planning' | 'shopping' | 'idle';
    recipeId?: string;
    currentStep?: number;
  }) {
    try {
      if (!socket.userId) {return;}

      // Broadcast status to interested followers (future feature)
      socket.broadcast.emit('user_status_updated', {
        userId: socket.userId,
        userName: socket.user?.name,
        status: data.status,
        recipeId: data.recipeId,
        currentStep: data.currentStep,
        timestamp: new Date().toISOString()
      });

      logger.info('📍 User status updated', { 
        userId: socket.userId, 
        status: data.status 
      });

    } catch (error) {
      logger.error('❌ Failed to update status', { error });
    }
  }

  private handleLeaveCookingSession(socket: AuthenticatedSocket, data: {
    sessionId: string;
  }) {
    try {
      if (!socket.userId) {return;}

      const session = this.activeSessions.get(data.sessionId);
      if (session) {
        session.participants = session.participants.filter(id => id !== socket.userId);
        
        // If host leaves, end the session
        if (session.hostId === socket.userId) {
          session.isActive = false;
          this.io.to(data.sessionId).emit('cooking_session_ended', {
            sessionId: data.sessionId,
            reason: 'Host left the session'
          });
        } else {
          // Notify remaining participants
          socket.to(data.sessionId).emit('user_left_session', {
            userId: socket.userId,
            participantCount: session.participants.length
          });
        }
      }

      socket.leave(data.sessionId);

      logger.info('👋 User left cooking session', { 
        sessionId: data.sessionId, 
        userId: socket.userId 
      });

    } catch (error) {
      logger.error('❌ Failed to leave cooking session', { error });
    }
  }

  private handleDisconnect(socket: AuthenticatedSocket) {
    if (socket.userId) {
      this.userConnections.delete(socket.userId);
      
      // Remove from all active sessions
      this.activeSessions.forEach((session, sessionId) => {
        if (session.participants.includes(socket.userId!)) {
          this.handleLeaveCookingSession(socket, { sessionId });
        }
      });

      logger.info('🔌 User disconnected from WebSocket', { userId: socket.userId });
    }
  }

  private handleLiveLike(socket: AuthenticatedSocket, data: { shareId: string }) {
    // Broadcast like to all users
    this.io.emit('live_recipe_liked', {
      shareId: data.shareId,
      likedBy: socket.userId,
      userName: socket.user?.name,
      timestamp: new Date().toISOString()
    });
  }

  private handleLiveComment(socket: AuthenticatedSocket, data: { 
    shareId: string; 
    comment: string 
  }) {
    // Broadcast comment to all users
    this.io.emit('live_recipe_commented', {
      shareId: data.shareId,
      comment: data.comment,
      commentBy: socket.userId,
      userName: socket.user?.name,
      timestamp: new Date().toISOString()
    });
  }

  private handleRecipeCollabRequest(socket: AuthenticatedSocket, data: {
    targetUserId: string;
    recipeId: string;
    message: string;
  }) {
    const targetSocketId = this.userConnections.get(data.targetUserId);
    if (targetSocketId) {
      this.io.to(targetSocketId).emit('recipe_collab_request', {
        fromUserId: socket.userId,
        fromUserName: socket.user?.name,
        recipeId: data.recipeId,
        message: data.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Public methods for external use
  public notifyUser(userId: string, event: string, data: any) {
    const socketId = this.userConnections.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  public broadcastToAll(event: string, data: any) {
    this.io.emit(event, data);
  }

  public getActiveSessionsForUser(userId: string): CookingSession[] {
    return Array.from(this.activeSessions.values()).filter(
      session => session.participants.includes(userId)
    );
  }

  public getConnectionCount(): number {
    return this.userConnections.size;
  }
}

let realTimeService: RealTimeService;

export function initializeRealTimeService(httpServer: HttpServer): RealTimeService {
  realTimeService = new RealTimeService(httpServer);
  return realTimeService;
}

export function getRealTimeService(): RealTimeService {
  return realTimeService;
}

export default RealTimeService; 