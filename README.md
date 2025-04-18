# Bundler.Space

The Ultimate Degen Toolkit for Solana with Integrated Authentication

## Authentication Features

This project includes authentication using:
- Email login
- Google OAuth
- Solana wallet connection
- Automatic creation of a Solana wallet after sign-in

## Setup Instructions

1. **Install dependencies**
   ```bash
   npm install
   # or
   yarn
   # or
   pnpm install
   ```

2. **Configure environment variables**
   Create a `.env.local` file at the root of the project with the following variables:

   ```
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_BASE_URL=https://api.turnkey.com
   
   # Replace these with your actual values from Turnkey
   # Get these from https://turnkey.io/
   NEXT_PUBLIC_ORGANIZATION_ID=your-turnkey-organization-id
   NEXT_PUBLIC_RP_ID=localhost
   
   # OAuth credentials
   # Get from https://console.cloud.google.com/apis/credentials
   NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=your-google-oauth-client-id
   
   # Solana connection
   NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   
   # For wallet and authentication
   # Get from https://dashboard.alchemy.com/
   NEXT_PUBLIC_ALCHEMY_API_KEY=your-alchemy-api-key
   ```

3. **Google OAuth Setup**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Set Application Type to "Web application"
   - Add JavaScript origins: `http://localhost:3000` (and your production URL)
   - Add redirect URIs: `http://localhost:3000` (and your production URL)
   - Copy the Client ID and add it to your `.env.local` file

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Authentication Flow

1. Users can sign in using:
   - Email (simulated in this demo)
   - Google OAuth
   - Connect a Solana wallet

2. After successful authentication:
   - A Solana wallet will be created for the user
   - The user will be redirected to the dashboard
   - The dashboard displays user info and wallet address

3. Users can log out from any authentication method

## Implementation Details

The authentication is powered by several components:

- `AuthProvider`: Manages authentication state and user sessions
- `GoogleAuth`: Integrates with Google OAuth
- `EmailAuth`: Handles email-based authentication 
- `AuthModal`: Provides the UI for authentication options
- `UserInfo`: Displays user information and wallet details

For a full production implementation, you would need to integrate with:
- [Turnkey](https://turnkey.io/) for secure wallet management
- A backend service for email verification
- A database to store user information

## Dashboard

The dashboard shows:
- User email
- User ID
- Wallet address
- Authentication method

You can copy the wallet address to clipboard with one click.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
