import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { redisConnection } from '../redis';
import { decrypt } from '../crypto';
import { createLlmAdapter } from '../adapters/llm';
import { createImageAdapter } from '../adapters/image';

const prisma = new PrismaClient();
const publishQueue = new Queue('publishPost', { connection: redisConnection });

interface GenerateJobData {
  companyId: string;
  topicId: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceContent: string;
}

function stripLlmPreamble(text: string): string {
  const preambleRe = /^(вот\s+(вариант\s+)?поста?[^:]*:|конечно[^:]*:|пост[^:]*:|here[^:]*:)\s*/im;
  const match = text.match(preambleRe);
  if (match) return text.slice(match.index! + match[0].length).trim();
  return text.trim();
}

export async function generatePost(data: GenerateJobData): Promise<void> {
  const { companyId, topicId, sourceUrl, sourceTitle, sourceContent } = data;

  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic) throw new Error(`Topic ${topicId} not found`);

  const llmKey = await prisma.llmKey.findUnique({
    where: { companyId_provider: { companyId, provider: topic.llmProvider } },
  });
  if (!llmKey) throw new Error(`LLM key for ${topic.llmProvider} not found`);

  const apiKey = decrypt(llmKey.encryptedKey);
  const adapter = createLlmAdapter(topic.llmProvider, apiKey);

  const prompt = `Новость: ${sourceTitle}\n\n${sourceContent}\n\nНапиши пост. Только текст поста — никаких вступлений, пояснений, заголовков типа "Вот пост:" или "Конечно!".`;
  const raw = await adapter.generate(prompt, topic.systemPrompt);
  const generatedText = stripLlmPreamble(raw);

  // Генерация изображения (если задан imageProvider)
  let imageUrl: string | undefined;
  if (topic.imageProvider) {
    try {
      const FREE_IMAGE_PROVIDERS = ['pollinations'];
      let imgApiKey = '';

      if (!FREE_IMAGE_PROVIDERS.includes(topic.imageProvider)) {
        const imageKey = await prisma.imageKey.findUnique({
          where: { companyId_provider: { companyId, provider: topic.imageProvider } },
        });
        if (!imageKey) {
          console.warn(`[generatePost] No image key for ${topic.imageProvider}, skipping image`);
        } else {
          imgApiKey = decrypt(imageKey.encryptedKey);
        }
      }

      if (FREE_IMAGE_PROVIDERS.includes(topic.imageProvider) || imgApiKey) {
        const imgAdapter = createImageAdapter(topic.imageProvider, imgApiKey);
        const rawUrl = await imgAdapter.generate(`Illustration for: ${sourceTitle}`);
        // Скачиваем байты сразу — URL OpenAI/FAL временные (~1 час).
        // Храним как data URL чтобы публикация не зависела от внешних ссылок.
        const imgRes = await axios.get(rawUrl, { responseType: 'arraybuffer', timeout: 60000 });
        // Определяем реальный MIME тип из заголовков (Pollinations/OpenAI/FAL возвращают PNG)
        const contentType = (imgRes.headers['content-type'] as string | undefined)?.split(';')[0].trim() || 'image/jpeg';
        imageUrl = `data:${contentType};base64,${Buffer.from(imgRes.data).toString('base64')}`;
        console.log(`[generatePost] Image cached (${topic.imageProvider}, ${contentType}, ${Math.round(imgRes.data.byteLength / 1024)} KB)`);
      }
    } catch (imgErr: any) {
      console.warn(`[generatePost] Image generation failed (non-fatal): ${imgErr.message}`);
    }
  }

  const post = await prisma.post.create({
    data: {
      companyId,
      topicId,
      sourceUrl,
      sourceTitle,
      generatedText,
      imageUrl: imageUrl ?? null,
      status: 'pending',
    },
  });

  if (topic.autoPublish) {
    const now = Date.now();
    const lastSlot = topic.nextPublishAt ? topic.nextPublishAt.getTime() : now;
    const nextSlot = Math.max(now, lastSlot) + topic.scheduleMinutes * 60 * 1000;
    const delay = nextSlot - now;

    await prisma.topic.update({
      where: { id: topicId },
      data: { nextPublishAt: new Date(nextSlot) },
    });

    await publishQueue.add('publishPost', { postId: post.id }, { delay });
    console.log(`[generatePost] Post ${post.id} scheduled in ${Math.round(delay / 60000)} min`);
  } else {
    console.log(`[generatePost] Post ${post.id} awaiting manual approval`);
  }

  // Пауза 3 сек между генерациями чтобы не превышать rate limit
  await new Promise((r) => setTimeout(r, 3000));

  console.log(`[generatePost] Created post ${post.id} for topic "${topic.name}"`);
}
