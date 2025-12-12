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
 *
 * NOTE: In Resend sandbox mode, emails only go to verified email addresses (ms122r4@gmail.com).
 * To send to actual guest emails in production:
 * 1. Verify a domain at https://resend.com/domains
 * 2. Update the 'from' address below to use your verified domain
 * 3. Example: 'Travel Bids <noreply@travelbids.com>'
 */
export async function sendBookingConfirmation(booking: BookingConfirmationData) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Hotel Reservation Portal <noreply@resend.dev>', // TODO: Change to verified domain (e.g., noreply@hotel-reservation-portal.com)
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

export interface CancellationConfirmationData {
  bookingId: string
  guestEmail: string
  guestName: string
  hotelName: string
  checkInDate: string
  checkOutDate: string
  refundAmount: number
  refundPercentage: number
  requiresManualProcessing?: boolean
}

export interface PendingCancellationData {
  bookingId: string
  guestEmail: string
  guestName: string
  hotelName: string
  checkInDate: string
  checkOutDate: string
  estimatedRefundAmount: number
}

/**
 * Send pending cancellation email to guest
 */
export async function sendPendingCancellationEmail(data: PendingCancellationData) {
  try {
    const { data: result, error } = await resend.emails.send({
      from: 'Hotel Reservation Portal <noreply@resend.dev>', // TODO: Change to verified domain
      to: data.guestEmail,
      subject: `Cancellation Request Received - ${data.hotelName}`,
      html: generatePendingCancellationEmailHTML(data),
    })

    if (error) {
      console.error('[Email] Failed to send pending cancellation email:', error)
      throw error
    }

    console.log('[Email] Pending cancellation email sent:', result?.id)
    return { success: true, emailId: result?.id }
  } catch (error) {
    console.error('[Email] Error sending pending cancellation email:', error)
    return { success: false, error }
  }
}

/**
 * Send cancellation confirmation email to guest
 */
export async function sendCancellationConfirmation(data: CancellationConfirmationData) {
  try {
    const { data: result, error } = await resend.emails.send({
      from: 'Hotel Reservation Portal <noreply@resend.dev>', // TODO: Change to verified domain
      to: data.guestEmail,
      subject: `Booking Cancelled - ${data.hotelName}`,
      html: generateCancellationEmailHTML(data),
    })

    if (error) {
      console.error('[Email] Failed to send cancellation confirmation:', error)
      throw error
    }

    console.log('[Email] Cancellation confirmation sent:', result?.id)
    return { success: true, emailId: result?.id }
  } catch (error) {
    console.error('[Email] Error sending cancellation confirmation:', error)
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
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Hotel Reservation Portal</h1>
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

          <!-- Create Account CTA -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #eff6ff; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; text-align: center;">
                <h3 style="margin: 0 0 8px; color: #1e40af; font-size: 18px; font-weight: 600;">Create Your Account</h3>
                <p style="margin: 0 0 16px; color: #1e3a8a; font-size: 14px; line-height: 1.5;">
                  Get instant access to view, modify, or cancel your bookings anytime!
                </p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/login"
                   style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 15px; font-weight: 600; margin-bottom: 12px;">
                  Sign In / Create Account
                </a>
                <p style="margin: 0; color: #3b82f6; font-size: 12px;">
                  No password needed - we'll send you a magic link!
                </p>
              </div>
            </td>
          </tr>

          <!-- View Booking Button -->
          <tr>
            <td style="padding: 0 32px 32px; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/booking/${booking.bookingId}"
                 style="display: inline-block; background-color: #6b7280; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600;">
                View Booking Confirmation
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
                © ${new Date().getFullYear()} Hotel Reservation Portal. All rights reserved.
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

/**
 * Generate HTML email template for cancellation confirmation
 */
function generateCancellationEmailHTML(data: CancellationConfirmationData): string {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const refundTimeline = data.refundAmount > 0
    ? 'Your refund will be processed within 5-10 business days to your original payment method.'
    : 'No refund is applicable for this cancellation based on the cancellation policy.'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Cancelled</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: #dc2626; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Hotel Reservation Portal</h1>
            </td>
          </tr>

          <!-- Cancellation Icon -->
          <tr>
            <td style="padding: 40px 32px 24px; text-align: center;">
              <div style="display: inline-block; background-color: #fee2e2; border-radius: 50%; padding: 16px; margin-bottom: 16px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2">
                  <circle cx="12" cy="12" r="10" stroke-linecap="round"/>
                  <path d="M15 9l-6 6M9 9l6 6" stroke-linecap="round"/>
                </svg>
              </div>
              <h2 style="margin: 0 0 8px; color: #111827; font-size: 24px; font-weight: bold;">Booking Cancelled</h2>
              <p style="margin: 0; color: #6b7280; font-size: 16px;">Your reservation has been successfully cancelled</p>
            </td>
          </tr>

          <!-- Booking Reference -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center;">
                <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Booking Reference</p>
                <p style="margin: 0; color: #111827; font-size: 20px; font-weight: bold; font-family: 'Courier New', monospace;">${data.bookingId}</p>
              </div>
            </td>
          </tr>

          <!-- Refund Information -->
          ${data.refundAmount > 0 ? `
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #d1fae5; border: 2px solid #059669; border-radius: 8px; padding: 20px; text-align: center;">
                <p style="margin: 0 0 8px; color: #065f46; font-size: 14px; font-weight: 600;">Refund Amount</p>
                <p style="margin: 0 0 4px; color: #065f46; font-size: 32px; font-weight: bold;">$${data.refundAmount.toFixed(2)}</p>
                <p style="margin: 0; color: #047857; font-size: 13px;">${data.refundPercentage}% refund applied</p>
              </div>
            </td>
          </tr>
          ` : `
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; text-align: center;">
                <p style="margin: 0 0 8px; color: #92400e; font-size: 14px; font-weight: 600;">No Refund Available</p>
                <p style="margin: 0; color: #78350f; font-size: 13px; line-height: 1.5;">
                  Based on the cancellation policy, this booking is non-refundable.
                </p>
              </div>
            </td>
          </tr>
          `}

          <!-- Cancelled Booking Details -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <h3 style="margin: 0 0 16px; color: #111827; font-size: 18px; font-weight: 600;">Cancelled Booking Details</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Hotel</p>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">${data.hotelName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Check-in</p>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <p style="margin: 0; color: #111827; font-size: 14px;">${formatDate(data.checkInDate)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Check-out</p>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <p style="margin: 0; color: #111827; font-size: 14px;">${formatDate(data.checkOutDate)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Guest</p>
                  </td>
                  <td style="padding: 12px 0; text-align: right;">
                    <p style="margin: 0; color: #111827; font-size: 14px;">${data.guestName}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Refund Timeline -->
          ${data.refundAmount > 0 ? `
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; border-radius: 4px;">
                <p style="margin: 0 0 8px; color: #1e40af; font-size: 14px; font-weight: 600;">Refund Processing</p>
                <p style="margin: 0; color: #1e3a8a; font-size: 13px; line-height: 1.5;">
                  ${refundTimeline}
                </p>
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Manual Processing Notice -->
          ${data.requiresManualProcessing ? `
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px;">
                <p style="margin: 0 0 8px; color: #92400e; font-size: 14px; font-weight: 600;">Additional Processing Required</p>
                <p style="margin: 0; color: #78350f; font-size: 13px; line-height: 1.5;">
                  Your refund has been processed, but we need to manually cancel your reservation with the hotel.
                  Our team will handle this within 24 hours and send you a confirmation.
                </p>
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- View Booking Button -->
          <tr>
            <td style="padding: 0 32px 32px; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/booking/${data.bookingId}"
                 style="display: inline-block; background-color: #6b7280; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600;">
                View Cancellation Details
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
                © ${new Date().getFullYear()} Hotel Reservation Portal. All rights reserved.
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


/**
 * Generate HTML email template for pending cancellation
 */
function generatePendingCancellationEmailHTML(data: PendingCancellationData): string {
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
  <title>Cancellation Request Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background-color: #f59e0b; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Hotel Reservation Portal</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 32px 24px; text-align: center;">
              <div style="display: inline-block; background-color: #fef3c7; border-radius: 50%; padding: 16px; margin-bottom: 16px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2" stroke-linecap="round"/>
                </svg>
              </div>
              <h2 style="margin: 0 0 8px; color: #111827; font-size: 24px; font-weight: bold;">Cancellation Request Received</h2>
              <p style="margin: 0; color: #6b7280; font-size: 16px;">We're processing your cancellation request</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center;">
                <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Booking Reference</p>
                <p style="margin: 0; color: #111827; font-size: 20px; font-weight: bold; font-family: 'Courier New', monospace;">${data.bookingId}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #eff6ff; border: 2px solid #2563eb; border-radius: 8px; padding: 20px;">
                <h3 style="margin: 0 0 12px; color: #1e40af; font-size: 18px; font-weight: 600;">What Happens Next?</h3>
                <ol style="margin: 0; padding-left: 20px; color: #1e3a8a; font-size: 14px; line-height: 1.8;">
                  <li>Our team will confirm the cancellation with the hotel</li>
                  <li>Once confirmed, we'll process your refund</li>
                  <li>You'll receive a confirmation email with refund details</li>
                  <li>The refund will appear in your account within 5-10 business days</li>
                </ol>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 12px 0;">
                      <p style="margin: 0; color: #6b7280; font-size: 14px;">Estimated Refund Amount</p>
                    </td>
                    <td style="padding: 12px 0; text-align: right;">
                      <p style="margin: 0; color: #111827; font-size: 20px; font-weight: bold;">$${data.estimatedRefundAmount.toFixed(2)}</p>
                    </td>
                  </tr>
                </table>
                <p style="margin: 12px 0 0; color: #6b7280; font-size: 12px; font-style: italic;">
                  *Final refund amount will be confirmed after hotel verification
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px;">
              <h3 style="margin: 0 0 16px; color: #111827; font-size: 18px; font-weight: 600;">Booking Details</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Hotel</p>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">${data.hotelName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Check-in</p>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <p style="margin: 0; color: #111827; font-size: 14px;">${formatDate(data.checkInDate)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Check-out</p>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    <p style="margin: 0; color: #111827; font-size: 14px;">${formatDate(data.checkOutDate)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Guest</p>
                  </td>
                  <td style="padding: 12px 0; text-align: right;">
                    <p style="margin: 0; color: #111827; font-size: 14px;">${data.guestName}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px;">
                <p style="margin: 0 0 8px; color: #92400e; font-size: 14px; font-weight: 600;">Expected Timeline</p>
                <p style="margin: 0; color: #78350f; font-size: 13px; line-height: 1.5;">
                  We'll process your cancellation within <strong>24 hours</strong>. You'll receive another email once the cancellation is confirmed and your refund has been processed.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 32px; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/booking/${data.bookingId}"
                 style="display: inline-block; background-color: #6b7280; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600;">
                View Booking Details
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px; text-align: center;">
                Questions? Contact us at <a href="mailto:support@travelbids.com" style="color: #2563eb; text-decoration: none;">support@travelbids.com</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} Hotel Reservation Portal. All rights reserved.
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

