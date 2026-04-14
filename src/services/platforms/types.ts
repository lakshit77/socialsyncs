export interface CreateContainerParams {
  post_type: string;
  caption?: string;
  media_urls: string[];
  cover_url?: string;
  audio_name?: string;
}

export interface CreateContainerResult {
  containerId: string;
}

export interface ContainerStatus {
  statusCode: string;
  isReady: boolean;
}

export interface PublishResult {
  mediaId: string;
}

export interface PlatformService {
  createContainer(params: CreateContainerParams): Promise<CreateContainerResult>;
  checkStatus(containerId: string): Promise<ContainerStatus>;
  publish(containerId: string): Promise<PublishResult>;
}

export interface PlatformCredentials {
  access_token: string;
  account_id: string;
}
