import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendReportEmail = async (toEmail: string, htmlContent: string) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Skipping email send.");
    return;
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Your DataGist Report</title>
        <style>
          body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          h2 { color: #2563eb; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 30px; }
          ul { padding-left: 20px; }
          li { margin-bottom: 8px; }
          .header { text-align: center; margin-bottom: 40px; }
          .footer { margin-top: 50px; font-size: 12px; color: #666; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>DataGist</h1>
        </div>
        
        ${htmlContent}
        
        <div class="footer">
          <p>You are receiving this email because you subscribed to DataGist reports.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">View Dashboard</a></p>
        </div>
      </body>
    </html>
  `;

  try {
    const data = await resend.emails.send({
      from: "DataGist <onboarding@resend.dev>", // Use verified domain in prod
      to: toEmail,
      subject: "Your Weekly Analytics Insight",
      html: emailHtml,
    });

    console.log("Email sent successfully:", data);
    return data;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
};
