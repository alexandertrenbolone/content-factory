export interface PostContent {
  text: string;
  imageUrl?: string;
}

export interface SocialAdapter {
  publish(content: PostContent): Promise<string>; // возвращает URL опубликованного поста
  verify(): Promise<boolean>; // проверить что credentials рабочие
}
