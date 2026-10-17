import { environment } from '../../../environments/environment';

const SERVER_FILE_PREFIX = '/files/';

export function fileUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  return url.startsWith(SERVER_FILE_PREFIX) ? environment.apiHost + url : url;
}
