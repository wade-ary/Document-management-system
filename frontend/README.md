This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## API Configuration

This frontend is configured to work with different backend environments:

### Environment Variables

- **Development**: Uses `http://127.0.0.1:5000` (local Flask backend)
- **Production**: Uses `https://sih-25254-8xgca.ondigitalocean.app` (deployed backend)

### Configuration Files

- **`.env.local`**: Development environment settings
- **`.env.production`**: Production environment settings  
- **`src/config/api.ts`**: Centralized API configuration

### Switching Environments

The backend URL is automatically selected based on:

1. **Environment Variable**: `NEXT_PUBLIC_API_BASE_URL` (highest priority)
2. **NODE_ENV**: Falls back to production URL if `NODE_ENV=production`
3. **Default**: Local development URL (`http://127.0.0.1:5000`)

### Development Setup

1. **Local Development**: 
   ```bash
   # Uses .env.local - points to http://127.0.0.1:5000
   npm run dev
   ```

2. **Production Build**:
   ```bash
   # Uses .env.production - points to https://sih-25254-8xgca.ondigitalocean.app
   npm run build
   npm start
   ```

3. **Testing Production URL Locally**:
   ```bash
   # Set environment variable to test production API
   NEXT_PUBLIC_API_BASE_URL=https://sih-25254-8xgca.ondigitalocean.app npm run dev
   ```

### Vercel Deployment

When deploying to Vercel, the production environment variables from `.env.production` will be used automatically. You can also set these in the Vercel dashboard:

- `NEXT_PUBLIC_API_BASE_URL=https://sih-25254-8xgca.ondigitalocean.app`
- `NEXT_PUBLIC_EXTERNAL_API_BASE_URL=https://sih-25254-8xgca.ondigitalocean.app`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
