import { PrismaClient } from '@prisma/client';
import { decrypt } from '../crypto';
import { createSocialAdapter } from '../adapters/social';
import { uploadToGoogleDrive, uploadToYandexDisk } from '../services/storage';

const prisma = new PrismaClient();

export async function publishPost(data: { postId: string }): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: data.postId },
    include: { topic: { include: { socialAccount: true } } },
  });
  if (!post) {
    console.warn(`[publishPost] Post ${data.postId} not found (already deleted) — skipping`);
    return;
  }
  if (post.status === 'published') return;

  const { socialAccount } = post.topic;
  const creds = JSON.parse(decrypt(socialAccount.encryptedCreds));
  const adapter = createSocialAdapter(socialAccount.platform, creds);

  try {
    const publishedUrl = await adapter.publish({
      text: post.generatedText,
      imageUrl: post.imageUrl || undefined,
    });

    const publishedAt = new Date();
    await prisma.post.update({
      where: { id: post.id },
      data: { status: 'published', publishedUrl, publishedAt },
    });

    console.log(`[publishPost] Published post ${post.id} → ${publishedUrl}`);

    // Сохранить в облако (non-fatal, каждое хранилище независимо)
    const storageConns = await prisma.storageConnection.findMany({
      where: { companyId: post.companyId },
    });
    if (storageConns.length > 0) {
      const topicName = post.topic.name;
      const MSK = { timeZone: 'Europe/Moscow' } as const;
      const dateStr = publishedAt.toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: 'numeric', ...MSK });
      const timeStr = publishedAt.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit', ...MSK });
      const mskDate = publishedAt.toLocaleDateString('sv', MSK); // sv locale → YYYY-MM-DD
      const safeTitle = post.sourceTitle.replace(/[\\/:*?"<>|]/g, '').slice(0, 60);
      const fileName = `${mskDate} ${timeStr.replace(':', '-')} — ${safeTitle}.txt`;
      const fileContent = Buffer.from(
        `Новость: ${post.sourceTitle}\nИсточник: ${post.sourceUrl}\nОпубликовано: ${dateStr} в ${timeStr} МСК\nПлатформа: ${socialAccount.platform}\n\n---\n\n${post.generatedText}`,
        'utf8',
      );
      for (const conn of storageConns) {
        try {
          const platform = socialAccount.platform;
          if (conn.provider === 'google') {
            await uploadToGoogleDrive(
              decrypt(conn.encryptedAccessToken),
              conn.encryptedRefreshToken ? decrypt(conn.encryptedRefreshToken) : '',
              platform, topicName, fileName, fileContent,
            );
          } else if (conn.provider === 'yandex') {
            await uploadToYandexDisk(
              decrypt(conn.encryptedAccessToken),
              conn.encryptedRefreshToken ? decrypt(conn.encryptedRefreshToken) : null,
              platform, topicName, fileName, fileContent,
              prisma, conn.id,
            );
          }
          console.log(`[publishPost] Saved to ${conn.provider}: ${platform}/${topicName}/${fileName}`);
        } catch (storageErr: any) {
          const detail = (storageErr as any).response?.data
            ? JSON.stringify((storageErr as any).response.data)
            : storageErr.message;
          console.error(`[publishPost] Storage upload FAILED for ${conn.provider}: ${detail}`);
        }
      }
    }
  } catch (e: any) {
    await prisma.post.update({
      where: { id: post.id },
      data: { status: 'failed', error: e.message },
    });
    throw e;
  }
}
