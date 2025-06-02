import { supabase } from '../index';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export class EmailService {
  private defaultFrom: string;
  
  constructor() {
    this.defaultFrom = process.env.EMAIL_FROM || 'noreply@cookcam.app';
  }
  
  // Welcome email for new users
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const template = this.getWelcomeTemplate(name);
    
    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }
  
  // Password reset email
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetLink = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
    const template = this.getPasswordResetTemplate(resetLink);
    
    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }
  
  // Recipe shared notification
  async sendRecipeSharedEmail(
    recipientEmail: string, 
    senderName: string, 
    recipeTitle: string,
    recipeId: string
  ): Promise<void> {
    const recipeLink = `${process.env.APP_URL}/recipe/${recipeId}`;
    const template = this.getRecipeSharedTemplate(senderName, recipeTitle, recipeLink);
    
    await this.sendEmail({
      to: recipientEmail,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }
  
  // Achievement unlocked email
  async sendAchievementEmail(
    email: string, 
    achievementName: string, 
    xpReward: number
  ): Promise<void> {
    const template = this.getAchievementTemplate(achievementName, xpReward);
    
    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }
  
  // Weekly digest email
  async sendWeeklyDigest(
    email: string,
    stats: {
      recipesCreated: number;
      scansCompleted: number;
      xpEarned: number;
      currentStreak: number;
    }
  ): Promise<void> {
    const template = this.getWeeklyDigestTemplate(stats);
    
    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }
  
  // Core email sending function (mock implementation)
  private async sendEmail(options: EmailOptions): Promise<void> {
    // In production, integrate with SendGrid, AWS SES, or similar
    console.log('📧 Sending email:', {
      to: options.to,
      subject: options.subject,
      from: options.from || this.defaultFrom
    });
    
    // Log email activity
    try {
      await supabase
        .from('email_logs')
        .insert({
          recipient: options.to,
          subject: options.subject,
          type: this.getEmailType(options.subject),
          sent_at: new Date().toISOString(),
          status: 'sent'
        });
    } catch (error) {
      console.error('Email logging error:', error);
    }
    
    // TODO: Implement actual email sending
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({
    //   to: options.to,
    //   from: options.from || this.defaultFrom,
    //   subject: options.subject,
    //   text: options.text,
    //   html: options.html,
    // });
  }
  
  // Email templates
  private getWelcomeTemplate(name: string): EmailTemplate {
    return {
      subject: 'Welcome to CookCam! 🎉',
      html: `
        <h1>Welcome to CookCam, ${name}!</h1>
        <p>We're excited to have you join our community of food lovers.</p>
        <p>Here's what you can do with CookCam:</p>
        <ul>
          <li>📸 Scan ingredients with your camera</li>
          <li>🍳 Get AI-powered recipe suggestions</li>
          <li>🏆 Earn XP and unlock achievements</li>
          <li>👥 Share recipes with friends</li>
        </ul>
        <p>Start by scanning your first ingredients!</p>
        <a href="${process.env.APP_URL}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Open CookCam</a>
      `,
      text: `Welcome to CookCam, ${name}! We're excited to have you join our community. Start by scanning your first ingredients!`
    };
  }
  
  private getPasswordResetTemplate(resetLink: string): EmailTemplate {
    return {
      subject: 'Reset your CookCam password',
      html: `
        <h1>Password Reset Request</h1>
        <p>We received a request to reset your password.</p>
        <p>Click the button below to create a new password:</p>
        <a href="${resetLink}" style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
      text: `Password reset requested. Visit this link to reset: ${resetLink}. This link expires in 1 hour.`
    };
  }
  
  private getRecipeSharedTemplate(senderName: string, recipeTitle: string, recipeLink: string): EmailTemplate {
    return {
      subject: `${senderName} shared a recipe with you!`,
      html: `
        <h1>${senderName} thinks you'll love this recipe!</h1>
        <h2>${recipeTitle}</h2>
        <p>Check out this delicious recipe on CookCam.</p>
        <a href="${recipeLink}" style="background-color: #FF9800; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Recipe</a>
      `,
      text: `${senderName} shared "${recipeTitle}" with you. View it here: ${recipeLink}`
    };
  }
  
  private getAchievementTemplate(achievementName: string, xpReward: number): EmailTemplate {
    return {
      subject: `🏆 Achievement Unlocked: ${achievementName}!`,
      html: `
        <h1>Congratulations! 🎉</h1>
        <p>You've unlocked a new achievement:</p>
        <h2>${achievementName}</h2>
        <p>You earned <strong>${xpReward} XP</strong>!</p>
        <p>Keep cooking to unlock more achievements!</p>
      `,
      text: `Congratulations! You unlocked "${achievementName}" and earned ${xpReward} XP!`
    };
  }
  
  private getWeeklyDigestTemplate(stats: any): EmailTemplate {
    return {
      subject: `Your CookCam Weekly Digest 📊`,
      html: `
        <h1>Your Week in CookCam</h1>
        <p>Here's what you accomplished this week:</p>
        <ul>
          <li>🍳 Created ${stats.recipesCreated} recipes</li>
          <li>📸 Completed ${stats.scansCompleted} scans</li>
          <li>⭐ Earned ${stats.xpEarned} XP</li>
          <li>🔥 Current streak: ${stats.currentStreak} days</li>
        </ul>
        <p>Keep up the great work!</p>
      `,
      text: `Your week: ${stats.recipesCreated} recipes, ${stats.scansCompleted} scans, ${stats.xpEarned} XP, ${stats.currentStreak} day streak!`
    };
  }
  
  private getEmailType(subject: string): string {
    if (subject.includes('Welcome')) {return 'welcome';}
    if (subject.includes('Password')) {return 'password_reset';}
    if (subject.includes('shared')) {return 'recipe_shared';}
    if (subject.includes('Achievement')) {return 'achievement';}
    if (subject.includes('Digest')) {return 'weekly_digest';}
    return 'other';
  }
}

export const emailService = new EmailService(); 