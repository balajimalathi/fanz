import { Resend } from "resend";
import { env } from "@/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export interface ServiceOrderEmailData {
  creatorEmail: string;
  creatorName: string;
  fanName: string;
  serviceName: string;
  serviceType: "chat" | "audio_call" | "video_call";
  duration: number | null; // Duration in minutes
  orderId: string;
  inboxUrl: string;
}

/**
 * Send email notification to creator when a fan purchases a service order
 */
export async function sendServiceOrderEmail(data: ServiceOrderEmailData): Promise<boolean> {
  if (!resend) {
    console.warn("[Email] Resend API key not configured. Skipping email send.");
    return false;
  }

  try {
    const durationText = data.duration 
      ? `${data.duration} minute${data.duration > 1 ? 's' : ''}`
      : 'time-based';
    
    const serviceTypeText = {
      chat: 'Chat',
      audio_call: 'Audio Call',
      video_call: 'Video Call',
    }[data.serviceType];

    const subject = `New Service Order: ${data.fanName} wants to ${serviceTypeText.toLowerCase()} with you`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Service Order</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">New Service Order</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${data.creatorName},</p>
            <p style="font-size: 16px; margin-bottom: 20px;">
              <strong>${data.fanName}</strong> has purchased a <strong>${serviceTypeText}</strong> service from you.
            </p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Service:</strong> ${data.serviceName}</p>
              <p style="margin: 5px 0;"><strong>Type:</strong> ${serviceTypeText}</p>
              <p style="margin: 5px 0;"><strong>Duration:</strong> ${durationText}</p>
              <p style="margin: 5px 0;"><strong>Customer:</strong> ${data.fanName}</p>
            </div>
            <p style="font-size: 16px; margin-bottom: 30px;">
              You can now activate this service order and start the session from your inbox.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.inboxUrl}" 
                 style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; font-size: 16px;">
                View Inbox
              </a>
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
              This is an automated notification. Please log in to your account to manage service orders.
            </p>
          </div>
        </body>
      </html>
    `;

    const textContent = `
New Service Order

Hi ${data.creatorName},

${data.fanName} has purchased a ${serviceTypeText} service from you.

Service: ${data.serviceName}
Type: ${serviceTypeText}
Duration: ${durationText}
Customer: ${data.fanName}

You can now activate this service order and start the session from your inbox.

View Inbox: ${data.inboxUrl}

This is an automated notification. Please log in to your account to manage service orders.
    `.trim();

    const result = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL || "noreply@yourdomain.com",
      to: data.creatorEmail,
      subject,
      html: htmlContent,
      text: textContent,
    });

    if (result.error) {
      console.error("[Email] Error sending service order email:", result.error);
      return false;
    }

    console.log(`[Email] Service order email sent to ${data.creatorEmail}`);
    return true;
  } catch (error) {
    console.error("[Email] Error sending service order email:", error);
    return false;
  }
}

