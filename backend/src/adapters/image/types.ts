export interface ImageAdapter {
  generate(prompt: string): Promise<string>; // возвращает URL изображения
}
