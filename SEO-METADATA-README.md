# SEO Metadata Implementation Guide for Bundler.Space

This document explains how to add SEO metadata to new and existing pages in the Bundler.Space website.

## Overview

We've implemented a modern SEO structure using Next.js 13+ metadata API. This allows us to:

1. Define base metadata for the entire site in the root layout
2. Override metadata on a per-section or per-page basis
3. Support proper sharing on social media with Open Graph and Twitter cards

## ⚠️ Important: Client vs Server Components

In Next.js 13+, metadata can only be exported from server components, not from client components. 

- The `metadata` export must be in a server component (no 'use client' directive).
- Files with 'use client' directive cannot export metadata.
- Use layout.tsx files for metadata instead of metadata.ts files, as layout.tsx has priority.

## Recommended Approach: Using layout.tsx

The most reliable way to define metadata is through `layout.tsx` files:

```typescript
// app/your-section/layout.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your Section Title',
  description: 'Description of your section (150-160 characters)',
  keywords: 'keyword1, keyword2, keyword3, Solana, Bundler',
  openGraph: {
    title: 'Your Section Title - Bundler.Space',
    description: 'Description of your section (150-160 characters)',
    url: 'https://bundler.space/your-section',
    images: [
      {
        url: '/og-your-section.jpg', 
        width: 1200,
        height: 630,
        alt: 'Your Section on Bundler.Space',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Your Section Title - Bundler.Space',
    description: 'Description of your section (150-160 characters)',
    images: ['/og-your-section.jpg'],
  },
};

export default function YourSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

## For Client Components

If your page component is a client component (using 'use client' directive), create a server component wrapper:

```typescript
// app/your-section/page.tsx (server component)
import YourSectionClient from './your-section-client';

export default function YourSectionPage() {
  return <YourSectionClient />;
}
```

```typescript
// app/your-section/your-section-client.tsx (client component)
'use client';
import React from 'react';

const YourSectionClient = () => {
  return (
    <div>
      {/* Your client component content */}
    </div>
  );
};

export default YourSectionClient;
```

## Best Practices

1. **Title Length**: Keep titles under 60 characters
2. **Description Length**: Keep descriptions between 150-160 characters
3. **Keywords**: Include 5-10 relevant keywords, including "Solana" and "Bundler"
4. **Images**: Create OpenGraph images at 1200x630 pixels for optimal sharing
5. **URLs**: Always include the full URL including the domain in the OpenGraph url field
6. **Use layout.tsx**: Prefer layout.tsx over metadata.ts for more reliable metadata generation

## Images

Social media preview images (Open Graph images) should be:
- Stored in the `/public` directory
- Named consistently (e.g., `og-your-page.jpg`)
- 1200x630 pixels for optimal display on all platforms
- Less than 5MB in size
- Include your page title and the Bundler.Space logo

## Testing

You can test your OpenGraph metadata implementation with:
- [OpenGraph.xyz](https://www.opengraph.xyz/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)

## Help

If you need assistance with implementing metadata for your page, please refer to:
1. The examples in existing sections
2. The Next.js documentation on [Metadata Files](https://nextjs.org/docs/app/api-reference/file-conventions/metadata) 