# Social Media Posting Platform (Built with Claude Code)

## What this project is about

This project is a practical example of how far you can go with Claude Code to build a real, usable product.

At a high level, it is a social media posting platform where a user can:
- sign in,
- connect their Instagram credentials,
- upload media (image/video),
- create different kinds of posts,
- track post status from creation to publish.

The core idea for the video is simple: **you do not need to build everything manually from scratch anymore**. With the right prompting and product direction, Claude Code can help you build production-style tools quickly.

## Main story for the long-form video

The video should feel like a "build journey" and not a deep engineering lecture.

Suggested narrative:
1. Start with the problem: posting workflows are repetitive and fragmented.
2. Show the opportunity: using Claude Code to turn an idea into a full platform.
3. Walk through what was built (auth, upload, create post, history, settings).
4. Explain the Instagram publishing flow in plain language.
5. End with future scope: multi-platform expansion and API-first product direction.

Keep the tone practical and creator-friendly: this is about what is possible today with AI-assisted development.

## Technologies used (simple, non-technical explanation)

- **Next.js + TypeScript**: for building the web app interface and backend routes.
- **Supabase**: for authentication, database, and media file storage.
- **Instagram Graph API (via Meta)**: for creating and publishing Instagram posts.
- **Claude Code**: used as the AI coding partner to speed up implementation and reduce development friction.

This stack is modern, scalable, and suitable for turning a creator tool into a real SaaS product.

## How the Instagram API flow works (casual explanation)

In simple terms, Instagram publishing is a 3-step process:

1. **Create a container**  
   You send media details (image/video, caption, post type) to Instagram through the API.

2. **Wait until media is processed**  
   Instagram processes the uploaded media in the background.  
   The app keeps checking the status.

3. **Publish when ready**  
   Once processing is complete, the app triggers the publish call and updates the post history/status.

This is why the app has a "status tracking" concept instead of instant publish every single time.

## Why this project is a good Claude Code example

- It is not a toy project; it includes auth, data, file upload, API integrations, and real-world workflow states.
- It proves Claude Code can help build across frontend + backend + integration layers.
- It shows how a solo creator/developer can ship faster with AI while still controlling architecture and product decisions.

## Future scope

This project is intentionally built with expansion in mind.

Planned directions:
- Support more platforms (Facebook, LinkedIn, YouTube, X, etc.).
- Build a cleaner scheduling layer (plan posts in advance).
- Add analytics and performance tracking for published posts.
- Improve team workflows (multi-user roles, collaboration).
- Expose the posting engine as a standalone API product.

The bigger vision: evolve from an Instagram posting tool into a multi-platform social publishing infrastructure.

## One-line positioning for your video

"I used Claude Code to build a real social media posting platform with Instagram API integration, and this is how you can do it too."
