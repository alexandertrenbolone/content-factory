"use strict";
// Утилиты валидации — используются во всех роутах
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidEmail = isValidEmail;
exports.isValidUrl = isValidUrl;
exports.validateString = validateString;
exports.validateInt = validateInt;
exports.validateEnum = validateEnum;
exports.firstError = firstError;
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
function isValidUrl(url) {
    try {
        const u = new URL(url);
        return u.protocol === 'http:' || u.protocol === 'https:';
    }
    catch {
        return false;
    }
}
/** Возвращает строку ошибки или null если всё ок */
function validateString(value, field, opts = {}) {
    const { min = 1, max = 500, required = true } = opts;
    if (value === undefined || value === null || value === '') {
        return required ? `Поле "${field}" обязательно` : null;
    }
    if (typeof value !== 'string')
        return `Поле "${field}" должно быть строкой`;
    const trimmed = value.trim();
    if (required && trimmed.length === 0)
        return `Поле "${field}" не может быть пустым`;
    if (trimmed.length < min)
        return `Поле "${field}" слишком короткое (минимум ${min} символов)`;
    if (trimmed.length > max)
        return `Поле "${field}" слишком длинное (максимум ${max} символов)`;
    return null;
}
function validateInt(value, field, opts = {}) {
    const { min, max, required = true } = opts;
    if (value === undefined || value === null) {
        return required ? `Поле "${field}" обязательно` : null;
    }
    const n = parseInt(String(value), 10);
    if (isNaN(n))
        return `Поле "${field}" должно быть числом`;
    if (min !== undefined && n < min)
        return `Поле "${field}" должно быть не меньше ${min}`;
    if (max !== undefined && n > max)
        return `Поле "${field}" должно быть не больше ${max}`;
    return null;
}
function validateEnum(value, field, allowed, required = true) {
    if (value === undefined || value === null || value === '') {
        return required ? `Поле "${field}" обязательно` : null;
    }
    if (!allowed.includes(String(value))) {
        return `Поле "${field}" должно быть одним из: ${allowed.join(', ')}`;
    }
    return null;
}
/** Собирает все ошибки и кидает первую найденную (или null) */
function firstError(...errors) {
    return errors.find((e) => e !== null) ?? null;
}
