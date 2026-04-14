import {
  PlatformService,
  CreateContainerParams,
  CreateContainerResult,
  ContainerStatus,
  PublishResult,
} from "../types";
import { IG_GRAPH_BASE_URL } from "./instagram.constants";
import type {
  InstagramGraphApiResponse,
  InstagramStatusResponse,
} from "./instagram.types";

export class InstagramApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public apiError?: unknown
  ) {
    super(message);
    this.name = "InstagramApiError";
  }
}

export class InstagramService implements PlatformService {
  constructor(
    private accountId: string,
    private accessToken: string
  ) {}

  async createContainer(
    params: CreateContainerParams
  ): Promise<CreateContainerResult> {
    switch (params.post_type) {
      case "image":
        return this.createImageContainer(params);
      case "story_image":
        return this.createStoryImageContainer(params);
      case "story_video":
        return this.createStoryVideoContainer(params);
      case "reel":
        return this.createReelContainer(params);
      case "carousel":
        return this.createCarouselContainer(params);
      default:
        throw new Error(`Unsupported post type: ${params.post_type}`);
    }
  }

  async checkStatus(containerId: string): Promise<ContainerStatus> {
    const res = await this.graphGet<InstagramStatusResponse>(
      `/${containerId}`,
      { fields: "status_code" }
    );
    return {
      statusCode: res.status_code,
      isReady: res.status_code === "FINISHED",
    };
  }

  async publish(containerId: string): Promise<PublishResult> {
    const res = await this.graphPost<InstagramGraphApiResponse>(
      `/${this.accountId}/media_publish`,
      { creation_id: containerId }
    );
    return { mediaId: res.id };
  }

  // --- Private container creation methods ---

  private async createImageContainer(
    params: CreateContainerParams
  ): Promise<CreateContainerResult> {
    const res = await this.graphPost<InstagramGraphApiResponse>(
      `/${this.accountId}/media`,
      {
        image_url: params.media_urls[0],
        caption: params.caption ?? "",
      }
    );
    return { containerId: res.id };
  }

  private async createStoryImageContainer(
    params: CreateContainerParams
  ): Promise<CreateContainerResult> {
    const res = await this.graphPost<InstagramGraphApiResponse>(
      `/${this.accountId}/media`,
      {
        media_type: "STORIES",
        image_url: params.media_urls[0],
      }
    );
    return { containerId: res.id };
  }

  private async createStoryVideoContainer(
    params: CreateContainerParams
  ): Promise<CreateContainerResult> {
    const res = await this.graphPost<InstagramGraphApiResponse>(
      `/${this.accountId}/media`,
      {
        media_type: "STORIES",
        video_url: params.media_urls[0],
      }
    );
    return { containerId: res.id };
  }

  private async createReelContainer(
    params: CreateContainerParams
  ): Promise<CreateContainerResult> {
    const queryParams: Record<string, string> = {
      media_type: "REELS",
      video_url: params.media_urls[0],
      caption: params.caption ?? "",
    };
    if (params.cover_url) queryParams.cover_url = params.cover_url;
    if (params.audio_name) queryParams.audio_name = params.audio_name;

    const res = await this.graphPost<InstagramGraphApiResponse>(
      `/${this.accountId}/media`,
      queryParams
    );
    return { containerId: res.id };
  }

  private async createCarouselContainer(
    params: CreateContainerParams
  ): Promise<CreateContainerResult> {
    // Step 1: Create child containers in parallel
    const childIds = await Promise.all(
      params.media_urls.map((url) =>
        this.graphPost<InstagramGraphApiResponse>(
          `/${this.accountId}/media`,
          { image_url: url, is_carousel_item: "true" }
        ).then((r) => r.id)
      )
    );

    // Step 2: Create carousel container with children
    const res = await this.graphPost<InstagramGraphApiResponse>(
      `/${this.accountId}/media`,
      {
        media_type: "CAROUSEL",
        children: childIds.join(","),
        caption: params.caption ?? "",
      }
    );

    return { containerId: res.id };
  }

  // --- Graph API helpers ---

  private async graphPost<T>(
    path: string,
    params: Record<string, string>
  ): Promise<T> {
    const url = new URL(`${IG_GRAPH_BASE_URL}${path}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new InstagramApiError(
        data.error?.message ?? "Instagram API error",
        res.status,
        data
      );
    }
    return data as T;
  }

  private async graphGet<T>(
    path: string,
    params: Record<string, string>
  ): Promise<T> {
    const url = new URL(`${IG_GRAPH_BASE_URL}${path}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new InstagramApiError(
        data.error?.message ?? "Instagram API error",
        res.status,
        data
      );
    }
    return data as T;
  }
}
