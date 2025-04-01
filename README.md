# MyEid - AI-Generated Eid Greeting Cards

An application that allows users to create personalized Eid greeting cards using AI technology.

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

- **Automatic Eid greeting card generation** with **guaranteed "EID MUBARAK!" text**
- **Perfect identity preservation** when uploading photos - your face and features remain unchanged
- **Elaborate decorative elements** including gold crescents, stars, and Islamic-inspired patterns
- **Personalized Eid messages** generated with AI that perfectly complement your greeting card
- **Optimized layout with text placement** that ensures visibility while preserving your photo
- **Easy sharing** via social media, email, or download
- **Advanced AI technology** using Stability AI's image-to-image generation with specialized text placement

## Implementation Details

- **Stability AI-powered image generation** with optimized parameters for text rendering
- **Strategic image composition** that creates dedicated space for text while preserving identity
- **Enhanced prompt engineering** that guarantees "EID MUBARAK!" text appears prominently
- **Specialized aspect ratio (1152x896)** proven to provide better text rendering results
- **Personalized Eid greetings** generated using OpenAI's advanced language models
- **Optimized parameters** for balancing identity preservation with decorative elements

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Deployment Instructions

### Deploying to Linux Servers

When deploying to Linux servers, you may encounter issues with the Sharp image processing library. The application has been configured to automatically handle this during the build process, but if you encounter the error:

```
Error: Could not load the "sharp" module using the linux-x64 runtime
```

You can resolve it using one of these methods:

1. **Use the built-in fix**: The package.json includes a `postinstall` script that should automatically install Sharp with its optional dependencies.

2. **Manual installation**: If the automatic fix doesn't work, run this command on your server:
   ```bash
   npm install --include=optional sharp
   ```

3. **For Vercel deployments**: Add the following environment variable in your Vercel project settings:
   ```
   NPM_FLAGS=--include=optional
   ```

4. **For Docker deployments**: Make sure your Dockerfile includes the necessary build tools:
   ```dockerfile
   # Install dependencies for Sharp
   RUN apt-get update && apt-get install -y \
       build-essential \
       python3
   ```

### Other Deployment Considerations

- Ensure your server has at least 1GB of RAM for image processing
- The application requires outbound internet access to connect to the OpenAI and Stability AI APIs
- Configure appropriate timeouts for your server as image generation can take several seconds
