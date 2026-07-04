import emailjs from '@emailjs/browser';

// EmailJS configuration
const EMAILJS_SERVICE_ID = 'service_testnotify'; // You'll need to create this in EmailJS
const EMAILJS_TEMPLATE_ID = 'template_testnotify'; // You'll need to create this in EmailJS
const EMAILJS_PUBLIC_KEY = 'your_public_key_here'; // You'll need to get this from EmailJS

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

interface TestNotificationData {
  recipientEmail: string;
  recipientName: string;
  testTitle: string;
  testDescription: string;
  testLink: string;
  startTime: string;
  endTime: string;
  duration: number;
  senderEmail?: string;
}

export class EmailService {
  private static instance: EmailService;

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private constructor() {}

  async sendTestNotification(data: TestNotificationData): Promise<{ success: boolean; message: string }> {
    try {
      // Prepare template parameters for EmailJS
      const templateParams = {
        to_email: data.recipientEmail,
        to_name: data.recipientName,
        from_name: 'CKCET Test Platform',
        from_email: data.senderEmail || 'shyiam05ck@gmail.com',
        test_title: data.testTitle,
        test_description: data.testDescription,
        test_link: data.testLink,
        start_time: new Date(data.startTime).toLocaleString(),
        end_time: new Date(data.endTime).toLocaleString(),
        duration: data.duration,
        reply_to: data.senderEmail || 'shyiam05ck@gmail.com',
        subject: `Test Invitation: ${data.testTitle}`,
        message: this.generateEmailBody(data)
      };

      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams
      );

      if (response.status === 200) {
        return {
          success: true,
          message: `Test notification sent successfully to ${data.recipientEmail}`
        };
      } else {
        throw new Error(`EmailJS returned status: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Email sending failed:', error);
      return {
        success: false,
        message: `Failed to send email to ${data.recipientEmail}: ${error.message || 'Unknown error'}`
      };
    }
  }

  async sendBulkTestNotifications(
    recipients: Array<{email: string; name: string}>,
    testData: Omit<TestNotificationData, 'recipientEmail' | 'recipientName'>
  ): Promise<{ success: number; failed: number; results: Array<{email: string; success: boolean; message: string}> }> {
    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      const result = await this.sendTestNotification({
        ...testData,
        recipientEmail: recipient.email,
        recipientName: recipient.name
      });

      results.push({
        email: recipient.email,
        success: result.success,
        message: result.message
      });

      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
      success: successCount,
      failed: failedCount,
      results
    };
  }

  private generateEmailBody(data: TestNotificationData): string {
    return `
Dear ${data.recipientName},

You have been invited to take a test on the CKCET Test Platform.

📝 Test Details:
• Title: ${data.testTitle}
• Description: ${data.testDescription}
• Start Time: ${new Date(data.startTime).toLocaleString()}
• End Time: ${new Date(data.endTime).toLocaleString()}
• Duration: ${data.duration} minutes

🔗 Test Link: ${data.testLink}

📋 Instructions:
1. Click on the test link above to access the test
2. Make sure you have a stable internet connection
3. Complete the test within the allocated time limit
4. Your progress will be automatically saved

⚠️ Important Notes:
• The test must be completed within the specified time window
• Once you start the test, you have ${data.duration} minutes to complete it
• Make sure your browser allows notifications for the best experience
• Do not refresh or close the browser during the test

If you have any questions or technical issues, please contact the administrator.

Good luck with your test!

Best regards,
CKCET Test Platform Team
    `.trim();
  }

  // Method to validate email configuration
  public static isConfigured(): boolean {
    return EMAILJS_SERVICE_ID !== 'service_testnotify' && 
           EMAILJS_TEMPLATE_ID !== 'template_testnotify' && 
           EMAILJS_PUBLIC_KEY !== 'your_public_key_here';
  }

  // Method to send email verification code for email change
  async sendEmailVerificationCode(data: {
    recipientEmail: string;
    recipientName: string;
    verificationCode: string;
    expiresInMinutes: number;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const templateParams = {
        to_email: data.recipientEmail,
        to_name: data.recipientName,
        from_name: 'CKCET Test Platform',
        from_email: 'ckcettest@gmail.com',
        verification_code: data.verificationCode,
        expires_in: data.expiresInMinutes,
        reply_to: 'ckcettesy@gmail.com',
        subject: 'Email Verification Code - CKCET Test Platform',
        message: `Your email verification code is: ${data.verificationCode}\n\nThis code will expire in ${data.expiresInMinutes} minutes.\n\nIf you did not request this code, please ignore this email.`
      };

      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams
      );

      if (response.status === 200) {
        return {
          success: true,
          message: `Verification code sent successfully to ${data.recipientEmail}`
        };
      } else {
        throw new Error(`EmailJS returned status: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Email sending failed:', error);
      return {
        success: false,
        message: `Failed to send email to ${data.recipientEmail}: ${error.message || 'Unknown error'}`
      };
    }
  }

  // Method to get configuration instructions
  public static getConfigurationInstructions(): string {
    return `
To configure email notifications:

1. Go to https://www.emailjs.com/ and create a free account
2. Create a new email service (Gmail recommended for deliverability)
3. Create an email template with these variables:
   - {{to_email}} - Recipient email
   - {{to_name}} - Recipient name
   - {{from_name}} - Sender name
   - {{test_title}} - Test title
   - {{test_description}} - Test description
   - {{test_link}} - Test link
   - {{start_time}} - Test start time
   - {{end_time}} - Test end time
   - {{duration}} - Test duration
   - {{message}} - Full email body
   - {{subject}} - Email subject

4. Update the configuration in src/services/emailService.ts:
   - EMAILJS_SERVICE_ID: Your service ID
   - EMAILJS_TEMPLATE_ID: Your template ID
   - EMAILJS_PUBLIC_KEY: Your public key

5. For best deliverability, use Gmail as your email service and ensure:
   - Enable 2-factor authentication
   - Use an app-specific password
   - Configure SPF and DKIM records if using custom domain
    `;
  }
}

export default EmailService.getInstance();
