# Social Login Setup Guide

This guide explains how to configure Google and Apple social login providers for your Clerk authentication system.

## Prerequisites

- Clerk account with your application configured
- Access to your Clerk Dashboard
- For Apple: Apple Developer account (required for production)

## Google Social Login Setup

### Option 1: Using Clerk's Shared Credentials (Recommended for Development)

1. **Navigate to Clerk Dashboard**
   - Go to [Clerk Dashboard](https://dashboard.clerk.com/)
   - Select your application
   - Navigate to **User & Authentication** → **Social Connections**

2. **Enable Google**
   - Find "Google" in the list of providers
   - Toggle the switch to enable it
   - For development, you can use Clerk's shared credentials

### Option 2: Using Custom Google Credentials (Recommended for Production)

1. **Create Google OAuth Application**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Navigate to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client ID**

2. **Configure OAuth Application**
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:3000` (for development)
   - Authorized redirect URIs: Use the redirect URI provided by Clerk in the social connection settings

3. **Configure in Clerk Dashboard**
   - In your Google social connection settings
   - Toggle **Use custom credentials**
   - Enter your **Client ID** and **Client Secret**

## Apple Social Login Setup

### Development Environment

1. **Navigate to Clerk Dashboard**
   - Go to **User & Authentication** → **Social Connections**
   - Find "Apple" and enable it
   - For development instances, Clerk provides shared credentials

### Production Environment (Required for Live Apps)

Apple requires custom credentials for production applications.

1. **Apple Developer Portal Setup**
   
   **Step 1: Register App ID**
   - Go to [Apple Developer Portal](https://developer.apple.com/)
   - Navigate to **Certificates, IDs & Profiles** → **Identifiers**
   - Register a new App ID
   - Enable "Sign In with Apple" capability
   - Note your **Apple Team ID** (App ID Prefix)

   **Step 2: Register Service ID**
   - Create a new Service ID
   - Configure with your domain (e.g., `your-domain.com`)
   - Add the return URL provided by Clerk

   **Step 3: Create Private Key**
   - Navigate to **Keys** section
   - Create a new key with "Sign In with Apple" capability
   - Download the `.p8` private key file (can only be downloaded once!)
   - Note the **Key ID**

2. **Configure in Clerk Dashboard**
   - Navigate to **SSO Connections** → **Add Apple**
   - Enable **Use custom credentials**
   - Enter the following:
     - **Apple Services ID**: Your Service ID
     - **Apple Team ID**: Your Team ID
     - **Apple Key ID**: Your Key ID
     - **Apple Private Key**: Contents of the `.p8` file

## Testing Social Login

1. **Start your development server**
   ```bash
   npm run dev
   ```

2. **Navigate to sign-in page**
   - Go to `http://localhost:3000/sign-in`
   - You should see Google and Apple login buttons

3. **Test the flow**
   - Click on a social provider button
   - Complete the OAuth flow
   - Verify you're redirected back to your application

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI" error**
   - Ensure the redirect URI in your OAuth provider matches exactly what Clerk provides
   - Check for trailing slashes and protocol (http vs https)

2. **Social buttons not appearing**
   - Verify the providers are enabled in Clerk Dashboard
   - Check that your environment variables are set correctly
   - Ensure you've restarted your development server after adding environment variables

3. **Apple login not working in development**
   - Apple's shared credentials in Clerk should work for development
   - If issues persist, try using custom credentials even for development

### Environment Variables Checklist

Ensure these are set in your `.env.local`:

```env
# Required Clerk variables
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# URL configuration (keeps auth on localhost)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

## Security Notes

- Never commit your `.env.local` file to version control
- Use different OAuth applications for development and production
- Regularly rotate your API keys and secrets
- For production, always use custom credentials rather than shared ones

## Additional Resources

- [Clerk Social Connections Documentation](https://clerk.com/docs/authentication/social-connections)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
