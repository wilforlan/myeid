This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Environment Setup

1. Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

2. Add your API keys to the `.env.local` file:

```
OPENAI_API_KEY=your_openai_api_key
STABILITY_API_KEY=your_stability_api_key
```

⚠️ **Important API Requirements:**
- For OpenAI: Your OpenAI API key must have access to the DALL-E API for image generation
- For Stability AI: Your Stability API key can be obtained from [platform.stability.ai](https://platform.stability.ai/)
- Both services require a paid account as image generation is not available with free tier accounts
- Both APIs have rate limits that may affect usage during high traffic
- Stability AI generally provides better quality Eid greeting images

### Image Requirements

For optimal results with the Eid greeting generator:
- **Photo content**: Upload clear photos of people's faces (preferably with neutral backgrounds)
- **Image quality**: Higher quality images produce better results
- **File formats**: JPEG, PNG, or GIF formats are supported
- **File size limits**: 
  - When using Stability AI: Maximum file size is 10MB
  - When using OpenAI: Maximum file size is 4MB
- **Dimensions**: 
  - Images will be automatically resized to 1024x1024 when using Stability AI
  - Images will be processed to meet API requirements for both services
- **Privacy**: Face images are processed through the selected AI API and not stored permanently

#### Troubleshooting Image Issues

If you encounter issues with image generation:

1. **"Image too large"**: Try compressing your image before uploading
2. **Format issues**: Convert your image to JPEG or PNG using an image editor
3. **Content policy**: Ensure your image doesn't contain inappropriate content
4. **Processing errors**: Try a different photo with a clearer face and simpler background
5. **API limits**: If you see rate limit errors, wait a few minutes and try again

### Running the Application

Run the development server:

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

## Features

- Upload your photo and create AI-generated Eid greeting cards with high-quality results
- Stability AI-powered image generation with elaborate decorative elements
- **Guaranteed large, bold "EID MUBARAK!" text** with gold/metallic embellishments
- Rich Islamic-inspired design elements including crescents, stars, and arabesques
- Custom personalized Eid messages in elegant typography
- Easy sharing options for social media
- Responsive design for mobile and desktop

## Implementation Details

- Next.js 13 App Router
- Server-side API routes for secure API integration
- Advanced Stability AI image transformation with:
  - Perfect identity preservation technology
  - Enhanced text rendering with optimized parameters for clear, legible text
  - Enhanced decorative elements with vibrant festive colors
  - Elegant Islamic patterns and ornate gold/silver elements
  - Optimized parameters for balancing identity preservation with creative elements
- Responsive UI with Tailwind CSS
- Modern, beautiful design for Eid celebrations

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
