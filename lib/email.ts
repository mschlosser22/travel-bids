import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface BookingConfirmationData {
  bookingId: string
  guestName: string
  guestEmail: string
  hotelName: string
  checkInDate: string
  checkOutDate: string
  guestCount: number
  roomCount: number
  totalPrice: number
  hotelAddress?: string
  specialRequests?: string
}

/**
 * Send booking confirmation email to guest
 */
export async function sendBookingConfirmation(booking: BookingConfirmationData) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Travel Bids <noreply@resend.dev>', // TODO: Change to verified domain
      to: booking.guestEmail,
      subject: `Booking Confirmed - ${booking.hotelName}`,
      html: generateBookingConfirmationHTML(booking),
    })

    if (error) {
      console.error('[Email] Failed to send booking confirmation:', error)
      throw error
    }

    console.log('[Email] Booking confirmation sent:', data?.id)
    return { success: true, emailId: data?.id }
  } catch (error) {
    console.error('[Email] Error sending booking confirmation:', error)
    // Don't throw - email failure shouldn't block booking confirmation
    return { success: false, error }
  }
}

/**
 * Generate HTML email template for booking confirmation
 */
function generateBookingConfirmationHTML(booking: BookingConfirmationData): string {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: #2563eb; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Travel Bids</h1>
            </td>
          </tr>

          <!-- Success Icon -->
          <tr>
            <td style="padding: 40px 32px 24px; text-align: center;">
              <div style="display: inline-block; background-color: #d1fae5; border-radius: 50%; padding: 16px; margin-bottom: 16px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2">
                  <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h2 style="margin: 0 0 8px; color: #111827; font-size: 24px; font-weight: bold;">Booking Confirmed!</h2>
              <p style="margin: 0; color: #6b7280; font-size: 16px;">Your reservation has been successfully confirmed</p>
            </td>
          </tr>

          <!-- Booking Reference -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center;">
                <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Booking Reference</p>
                <p style="margin: 0; color: #111827; font-size: 20px; font-weight: bold; font-family: 'Courier New', monospace;">${booking.bookingId}</p>
              </div>
            </td>
          </tr>

          <!-- Hotel Details -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <h3 style="margin: 0 0 16px; color: #111827; font-size: 18px; font-weight: 600;">Hotel Details</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Hotel</p>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">${booking.hotelName}</p>
                  </td>
                </tr>
                ${booking.hotelAddress ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Address</p>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <p style="margin: 0; color: #111827; font-size: 14px;">${booking.hotelAddress}</p>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Check-in</p>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">${formatDate(booking.checkInDate)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Check-out</p>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">${formatDate(booking.checkOutDate)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Guests</p>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <p style="margin: 0; color: #111827; font-size: 14px;">${booking.guestCount}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Rooms</p>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <p style="margin: 0; color: #111827; font-size: 14px;">${booking.roomCount}</p>
                  </td>
                </tr>
                ${booking.specialRequests ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Special Requests</p>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <p style="margin: 0; color: #111827; font-size: 14px;">${booking.specialRequests}</p>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 16px 0 0;">
                    <p style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">Total Price</p>
                  </td>
                  <td style="padding: 16px 0 0; text-align: right;">
                    <p style="margin: 0; color: #111827; font-size: 24px; font-weight: bold;">$${booking.totalPrice.toFixed(2)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Guest Info -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h3 style="margin: 0 0 16px; color: #111827; font-size: 18px; font-weight: 600;">Guest Information</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 12px 0;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Name</p>
                  </td>
                  <td style="padding: 12px 0; text-align: right;">
                    <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">${booking.guestName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Email</p>
                  </td>
                  <td style="padding: 12px 0; text-align: right;">
                    <p style="margin: 0; color: #111827; font-size: 14px;">${booking.guestEmail}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Important Info -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px;">
                <p style="margin: 0 0 8px; color: #92400e; font-size: 14px; font-weight: 600;">Important Information</p>
                <p style="margin: 0; color: #78350f; font-size: 13px; line-height: 1.5;">
                  Please present this booking reference at check-in. Your payment has been processed successfully.
                  You can cancel or modify your booking anytime before check-in at no charge.
                </p>
              </div>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 32px 32px; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/booking/${booking.bookingId}"
                 style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                View Booking Details
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px; text-align: center;">
                Need help? Contact us at <a href="mailto:support@travelbids.com" style="color: #2563eb; text-decoration: none;">support@travelbids.com</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} Travel Bids. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
