// Утилиты валидации — используются во всех роутах

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Возвращает строку ошибки или null если всё ок */
export function validateString(
  value: unknown,
  field: string,
  opts: { min?: number; max?: number; required?: boolean } = {},
): string | null {
  const { min = 1, max = 500, required = true } = opts;
  if (value === undefined || value === null || value === '') {
    return required ? `Поле "${field}" обязательно` : null;
  }
  if (typeof value !== 'string') return `Поле "${field}" должно быть строкой`;
  const trimmed = value.trim();
  if (required && trimmed.length === 0) return `Поле "${field}" не может быть пустым`;
  if (trimmed.length < min) return `Поле "${field}" слишком короткое (минимум ${min} символов)`;
  if (trimmed.length > max) return `Поле "${field}" слишком длинное (максимум ${max} символов)`;
  return null;
}

export function validateInt(
  value: unknown,
  field: string,
  opts: { min?: number; max?: number; required?: boolean } = {},
): string | null {
  const { min, max, required = true } = opts;
  if (value === undefined || value === null) {
    return required ? `Поле "${field}" обязательно` : null;
  }
  const n = parseInt(String(value), 10);
  if (isNaN(n)) return `Поле "${field}" должно быть числом`;
  if (min !== undefined && n < min) return `Поле "${field}" должно быть не меньше ${min}`;
  if (max !== undefined && n > max) return `Поле "${field}" должно быть не больше ${max}`;
  return null;
}

export function validateEnum(
  value: unknown,
  field: string,
  allowed: string[],
  required = true,
): string | null {
  if (value === undefined || value === null || value === '') {
    return required ? `Поле "${field}" обязательно` : null;
  }
  if (!allowed.includes(String(value))) {
    return `Поле "${field}" должно быть одним из: ${allowed.join(', ')}`;
  }
  return null;
}

/** Собирает все ошибки и кидает первую найденную (или null) */
export function firstError(...errors: (string | null)[]): string | null {
  return errors.find((e) => e !== null) ?? null;
}
