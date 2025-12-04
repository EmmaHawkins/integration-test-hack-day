export interface SitemapJob {
  jobId: string;
  websiteId: string;
  status: 'pernding' | 'processing' | 'complete' | 'failed';
  createdAt: string;
  updatedAt: string;
  s3Key?: string;
  s3Url?: string;
  errorMessage?: string;
  urlCount?: number;
}

export interface GenerateSitemapRequest {
  websiteId: string;
  urls: string[];
  priority?: number;
  changefreq?: 'always' | 'hourly' | 'daily' | 'monthly' | 'yearly' | 'never';
}

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}