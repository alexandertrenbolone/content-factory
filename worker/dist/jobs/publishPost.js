"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishPost = publishPost;
const client_1 = require("@prisma/client");
const crypto_1 = require("../crypto");
const social_1 = require("../adapters/social");
const storage_1 = require("../services/storage");
const prisma = new client_1.PrismaClient();
async function publishPost(data) {
    const post = await prisma.post.findUnique({
        where: { id: data.postId },
        include: { topic: { include: { socialAccount: true } } },
    });
    if (!post) {
        console.warn(`[publishPost] Post ${data.postId} not found (already deleted) — skipping`);
        return;
    }
    if (post.status === 'published')
        return;
    const { socialAccount } = post.topic;
    const creds = JSON.parse((0, crypto_1.decrypt)(socialAccount.encryptedCreds));
    const adapter = (0, social_1.createSocialAdapter)(socialAccount.platform, creds);
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
            const dateStr = publishedAt.toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = publishedAt.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
            const safeTitle = post.sourceTitle.replace(/[\\/:*?"<>|]/g, '').slice(0, 60);
            const fileName = `${publishedAt.toISOString().slice(0, 10)} ${timeStr.replace(':', '-')} — ${safeTitle}.txt`;
            const fileContent = Buffer.from(`Новость: ${post.sourceTitle}\nИсточник: ${post.sourceUrl}\nОпубликовано: ${dateStr} в ${timeStr}\nПлатформа: ${socialAccount.platform}\n\n---\n\n${post.generatedText}`, 'utf8');
            for (const conn of storageConns) {
                try {
                    const platform = socialAccount.platform;
                    if (conn.provider === 'google') {
                        await (0, storage_1.uploadToGoogleDrive)((0, crypto_1.decrypt)(conn.encryptedAccessToken), conn.encryptedRefreshToken ? (0, crypto_1.decrypt)(conn.encryptedRefreshToken) : '', platform, topicName, fileName, fileContent);
                    }
                    else if (conn.provider === 'yandex') {
                        await (0, storage_1.uploadToYandexDisk)((0, crypto_1.decrypt)(conn.encryptedAccessToken), conn.encryptedRefreshToken ? (0, crypto_1.decrypt)(conn.encryptedRefreshToken) : null, platform, topicName, fileName, fileContent, prisma, conn.id);
                    }
                    console.log(`[publishPost] Saved to ${conn.provider}: ${platform}/${topicName}/${fileName}`);
                }
                catch (storageErr) {
                    const detail = storageErr.response?.data
                        ? JSON.stringify(storageErr.response.data)
                        : storageErr.message;
                    console.error(`[publishPost] Storage upload FAILED for ${conn.provider}: ${detail}`);
                }
            }
        }
    }
    catch (e) {
        await prisma.post.update({
            where: { id: post.id },
            data: { status: 'failed', error: e.message },
        });
        throw e;
    }
}
