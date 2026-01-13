import { getRequestConfig } from 'next-intl/server';

export const locales = ['pt-BR', 'en'];
export const defaultLocale = 'pt-BR';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default
}));
