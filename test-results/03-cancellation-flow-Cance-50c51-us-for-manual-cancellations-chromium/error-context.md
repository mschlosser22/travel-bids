# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - navigation [ref=e2]:
    - generic [ref=e4]:
      - link "Travel Bids" [ref=e5] [cursor=pointer]:
        - /url: /
      - link "Sign In" [ref=e7] [cursor=pointer]:
        - /url: /login
  - generic [ref=e9]:
    - generic [ref=e10]:
      - img [ref=e12]
      - heading "Booking Confirmed!" [level=1] [ref=e14]
      - paragraph [ref=e15]: Your reservation has been confirmed. Check your email for full details.
    - generic [ref=e16]:
      - paragraph [ref=e17]: Booking Reference
      - paragraph [ref=e18]: 338e35b7-01fe
    - generic [ref=e19]:
      - generic [ref=e20]:
        - generic [ref=e21]: Hotel
        - generic [ref=e22]: Manual Cancellation Hotel
      - generic [ref=e23]:
        - generic [ref=e24]: Check-in
        - generic [ref=e25]: Dec 13, 2025
      - generic [ref=e26]:
        - generic [ref=e27]: Check-out
        - generic [ref=e28]: Dec 14, 2025
    - generic [ref=e29]:
      - paragraph [ref=e30]: Sign in to view full details, modify, or cancel your booking.
      - link "Sign in to your account" [ref=e31] [cursor=pointer]:
        - /url: /login?next=/booking/338e35b7-01fe-465d-b974-37b61d5591e9
  - generic [ref=e32]:
    - img [ref=e34]
    - button "Open Tanstack query devtools" [ref=e82] [cursor=pointer]:
      - img [ref=e83]
  - button "Open Next.js Dev Tools" [ref=e136] [cursor=pointer]:
    - img [ref=e137]
  - alert [ref=e140]
```