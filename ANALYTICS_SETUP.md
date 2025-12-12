# Analytics & Conversion Tracking Setup

This document explains how to configure analytics and ad conversion tracking for the Travel Bids platform.

## Environment Variables

Add these to your `.env.local` file (and production environment):

```bash
# Google Analytics 4
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Google Ads (optional - for conversion tracking)
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL=AW-XXXXXXX/XXXXXXXXXXX

# Meta/Facebook Pixel (optional)
NEXT_PUBLIC_META_PIXEL_ID=XXXXXXXXXXXXXXX
```

## 1. Google Analytics 4 Setup

### Create GA4 Property

1. Go to [Google Analytics](https://analytics.google.com/)
2. Click "Admin" (bottom left)
3. Create a new property (or use existing)
4. Under "Data Streams", click "Add stream" → "Web"
5. Enter your website URL
6. Copy the **Measurement ID** (format: G-XXXXXXXXXX)
7. Add to `.env.local` as `NEXT_PUBLIC_GA_MEASUREMENT_ID`

### Events Tracked

The following events are automatically tracked:

- **Page views** - All route changes
- **Search** - Hotel search submissions
- **Hotel clicks** - When users click on hotel details
- **Purchase** - Completed bookings with transaction details

## 2. Google Ads Conversion Tracking

### Create Conversion Action

1. Go to [Google Ads](https://ads.google.com/)
2. Click "Tools & Settings" → "Conversions"
3. Click "+" to create new conversion action
4. Select "Website"
5. Choose "Purchase" as conversion goal
6. Set up conversion details:
   - Name: "Hotel Booking"
   - Value: Use transaction-specific value
   - Count: Every conversion
7. Click "Create and Continue"
8. Choose "Use Google tag" (we're using gtag.js)
9. Copy the **Conversion Label** (format: AW-XXXXXXX/XXXXXXXXXXX)
10. Add to `.env.local` as `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL`

### Conversion Tracking

Conversions are automatically tracked on the booking confirmation page when a booking has status `confirmed`.

## 3. Meta/Facebook Pixel Setup

### Create Facebook Pixel

1. Go to [Meta Events Manager](https://business.facebook.com/events_manager)
2. Click "Connect Data Sources" → "Web"
3. Click "Get Started"
4. Name your pixel (e.g., "Travel Bids")
5. Enter your website URL
6. Click "Continue"
7. Choose "Manually Install Code Yourself"
8. Copy the **Pixel ID** (just the numbers, e.g., 123456789012345)
9. Add to `.env.local` as `NEXT_PUBLIC_META_PIXEL_ID`

### Events Tracked

The following events are automatically sent to Meta:

- **PageView** - All page loads and route changes
- **Purchase** - Completed bookings with value and currency

## 4. Testing Analytics

### Test in Development

1. Install the browser extensions:
   - [Google Analytics Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger)
   - [Meta Pixel Helper](https://chrome.google.com/webstore/detail/facebook-pixel-helper)

2. Open your dev site and check the browser console
3. Navigate through the site and verify events are firing

### Test Page Views

```bash
# Start dev server
npm run dev

# Open http://localhost:3001 in browser
# Open browser console
# Navigate to different pages
# You should see gtag events in console (with GA Debugger enabled)
```

### Test Conversions

1. Complete a test booking flow
2. Get to the confirmation page
3. Check console for `purchase` event
4. Verify in Google Analytics: Realtime → Events
5. Verify in Meta Events Manager: Events (may take a few minutes)

## 5. Verify in Production

### Google Analytics

1. Go to [Google Analytics](https://analytics.google.com/)
2. Select your property
3. Go to "Realtime" → "Overview"
4. Visit your production site in another tab
5. You should see active users

### Google Ads

1. Go to [Google Ads](https://ads.google.com/)
2. Tools & Settings → Conversions
3. Find your "Hotel Booking" conversion
4. Complete a test purchase
5. Check conversion appears (may take up to 24 hours)

### Meta Pixel

1. Go to [Meta Events Manager](https://business.facebook.com/events_manager)
2. Select your pixel
3. Click "Test Events"
4. Enter your website URL
5. Complete actions on your site
6. Events should appear in real-time

## 6. Additional Event Tracking

You can track custom events anywhere in your app:

```typescript
import { trackEvent } from '@/components/Analytics/GoogleAnalytics'
import { trackMetaEvent } from '@/components/Analytics/MetaPixel'

// Track custom event
trackEvent('button_click', {
  button_name: 'Subscribe Newsletter',
  location: 'Homepage'
})

// Track Meta event
trackMetaEvent('Lead', {
  content_name: 'Newsletter Signup'
})
```

## Privacy & GDPR Compliance

**Important**: This implementation tracks users without consent. For GDPR compliance, you should:

1. Add a cookie consent banner
2. Only load tracking scripts after user consent
3. Provide opt-out options
4. Update your privacy policy

Consider using a consent management platform like:
- [Cookiebot](https://www.cookiebot.com/)
- [OneTrust](https://www.onetrust.com/)
- [Osano](https://www.osano.com/)

## Troubleshooting

### No events showing in GA4

- Check Measurement ID is correct in `.env.local`
- Ensure environment variable starts with `NEXT_PUBLIC_`
- Restart dev server after adding env variables
- Check browser console for errors
- Verify scripts are loading in Network tab

### Conversions not tracking

- Verify `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL` is set
- Check booking status is `confirmed` on confirmation page
- Test with Google Tag Assistant
- Allow up to 24 hours for conversions to appear in Google Ads

### Meta Pixel not firing

- Check Pixel ID is correct
- Use Meta Pixel Helper browser extension
- Check browser console for fbq errors
- Verify noscript fallback image is loading
