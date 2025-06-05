# CookCam App Flow Document

## Onboarding and Sign-In/Sign-Up

When a brand-new user opens the CookCam app for the first time, they are greeted with a three-card carousel that highlights the app’s playful, tech-savvy personality. Each card briefly explains how snapping a photo of ingredients turns into a gamified cooking journey. After swiping through these value-prop screens, the user taps the Get Started button to begin account creation.

CookCam uses Supabase’s email-based OAuth flow for sign-up and sign-in. In the sign-up screen, the user enters their email address and chooses a password. They also see a checkbox to opt into push notifications for streak reminders, XP milestones, and customized recipe ideas. If the user wishes to become a creator, they can tap a secondary prompt labeled Become a Creator, which immediately launches the Stripe Connect onboarding in a secure web view. When Stripe onboarding completes successfully, the app stores the new user’s referral code and returns to the main flow.

If a returning user opens the app, they land on the sign-in screen. They enter their email and password and tap Sign In. Should they forget their password, they can tap Forgot Password, enter their email, and receive a recovery link by email. Clicking that link opens a reset-password view within the app, where they set a new password and then return to the sign-in screen. Once signed in, the app transitions to the Home tab automatically.

The user can sign out at any time by navigating to their Profile tab, tapping Settings, and choosing Sign Out. This action clears local data and brings the user back to the initial onboarding carousel.

## Main Dashboard or Home Page

After successful login, the user lands on the Home tab, which features a full-screen live camera preview. A circular shutter button sits at the bottom center. Just above it, a small gallery chip shows recent photos for quick re-scans. The default view uses the brand’s dark Eggplant Midnight background, with the shutter button accented by the Spice Orange gradient.

Across the bottom of the screen, the app displays a fixed tab bar with four icons labeled Home, Favorites, Leaderboard, and Profile. Tapping any of these icons instantly switches the main view. The user can move fluidly between snapping ingredients, reviewing saved recipes, checking their rank among peers, and managing their profile or creator dashboard.

## Detailed Feature Flows and Page Transitions

When the user taps the shutter button or selects a photo from the gallery chip, the camera shutter animates with a brief bounce. The app then sends the image to the `/scan` endpoint. As soon as the response arrives, the view animates into the Ingredient Review screen.

On the Ingredient Review screen, detected items appear as pill-shaped chips with eggplant-colored text on a pepper-gray background. Each chip sports a check icon on the right to confirm or an X icon to remove. Tapping the check or X triggers a spring animation. A floating Add button in the bottom right corner lets the user type to include any missing ingredient. A faded pantry-staple hint appears below the list to speed up manual selection.

Once happy with their list, the user swipes up on a handle at the bottom to open the Filters Drawer. This bottom sheet shows filter pills for diet type, cuisine, skill level, cooking time, and calorie range. After tapping filters, the user hits Generate Recipes. The button animates in Fresh Basil green and fades the drawer away as three recipe cards slide into view.

The Recipes List presents three horizontally scrollable cards, each with a hero image, title, cook-time badge, and macro summary. A pull-to-refresh gesture reloads the stack. Tapping a card takes the user to Recipe Detail. Long-pressing a card instantly saves it to Favorites and triggers a satisfying haptic pulse.

The Recipe Detail view has three tabs labeled Steps, Macros, and Tips. Headlines use Poppins SemiBold, body text uses Inter, and Lucide-react icons animate in duotone when active. A star icon in the top right lets the user toggle saving. Below, a Cook button invites the user to begin guided cooking.

Tapping Cook transitions to Cook Mode, a full-screen, dark-themed step panel. Each instruction appears centered on the screen with a progress dot indicator at the top. The user taps anywhere to advance to the next step, accompanied by a light haptic impact. Optionally, each step may read aloud via voice-over labels. When the final step is complete, a confetti Lottie animation erupts, the electric lime XP bar sweeps across the bottom, and the amber streak flame pulses to show streak progress. This triggers the Finish & Share screen.

On the Finish & Share screen, the user sees a summary of earned XP and the updated streak count. A toggle offers to save the completed recipe to Favorites if it isn’t already saved. Share buttons for TikTok, Instagram, X, or a direct link appear below. Captions auto-append the user’s unique referral code link (cookcam.app/r/XXXXXX) and the FTC tag. After sharing or copying the link, the user taps Done to return to the Home camera view and start a new loop.

The Favorites tab arranges all saved recipes in a masonry grid. A dropdown filter at the top lets the user sort by date or cook time. Long-pressing any recipe pops an animated removal confirmation, and tapping opens the full Recipe Detail.

The Leaderboard tab displays user rankings by XP. A segmented control across the top allows switching between daily, weekly, monthly, yearly, and all-time leaderboards. Each list shows avatars, usernames, and current XP for friendly competition.

In the Profile tab, users see their avatar, level bar with Poppins numerals, current streak count, and a horizontal carousel of unlocked badges. Below, a creator earnings card appears for those who completed Stripe Connect onboarding. It shows month-to-date and lifetime earnings, with a Copy Code button to share the referral code manually. A Become a Creator button shows for non-creators, repeating the Stripe onboarding flow. At the bottom, a Settings button navigates to the account settings page.

## Settings and Account Management

The Settings page begins with subscription status. Here the user can subscribe for $3.99 per month or cancel their existing plan through Stripe’s secure checkout interface. Next are notification preferences, where the user toggles push notifications for streak reminders, XP milestones, and recipe suggestions. Finally, links to the Privacy Policy, Terms of Service, and Attributions appear. At the bottom of Settings, the user finds Sign Out.

Users can return to any primary tab at any time by tapping the bottom navigation bar. Exiting Settings always takes them back to the Profile view.

## Error States and Alternate Paths

If the user’s image upload fails or the server cannot detect ingredients, the app shows a full-screen error message with a Retry button. Tapping Retry returns the user to the camera view. If network connectivity is lost at any point, a persistent banner appears at the top indicating offline mode, and favorite recipes remain viewable from cache while scans and recipe generation are disabled.

Should no recipes match the selected filters, the Recipes List page displays a friendly message suggesting filter adjustments and offers a Back button to return to the filters drawer. Unauthorized API responses automatically redirect the user to the sign-in screen. Errors during Stripe Connect onboarding show a descriptive alert and let the user retry or skip creator registration.

## Conclusion and Overall App Journey

A new user begins with a simple sign-up and optional push-notification and creator onboarding. They immediately land in the camera view, snap a photo of ingredients, edit the detected list, apply dietary filters, and discover three AI-generated recipes. Selecting a recipe launches step-by-step cook mode, culminating in XP and streak rewards followed by an engaging share experience that fuels referrals. Alongside a growing collection of favorites, users track their progress in a gamified profile and climb friendly leaderboards. Creators connect with Stripe to earn revenue share seamlessly, and all account details, notifications, subscriptions, and legal pages are managed in Settings. Every screen links fluidly, ensuring users never lose their place in CookCam’s core ingredient-scan to cook-to-share loop.