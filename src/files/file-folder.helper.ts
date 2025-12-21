export const BASE_FOLDER_MAP: Record<string, string> = {
  post: 'posts',
  avatar: 'users/avatars',
  story: 'stories',
  group: 'groups',
  chat: 'chats',
};

export function resolveCloudinaryFolder(
  folderType: string,
  mimetype: string,
): { folder: string; resourceType: 'image' | 'video' } {
  const baseFolder = BASE_FOLDER_MAP[folderType] ?? 'misc';

  if (mimetype.startsWith('video/')) {
    return {
      folder: `${baseFolder}/videos`,
      resourceType: 'video',
    };
  }

  return {
    folder: `${baseFolder}/images`,
    resourceType: 'image',
  };
}
