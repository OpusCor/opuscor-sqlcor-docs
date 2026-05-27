import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import { useTranslations } from '@astrojs/starlight/internal';

/**
 * Sync Starlight chrome with the per-page `?lang=uk` query param used by
 * our custom document router. Pagination stays English via src/content/i18n/uk.json.
 */
export const onRequest = defineRouteMiddleware((context) => {
  if (context.url.searchParams.get('lang') !== 'uk') return;

  context.locals.t = useTranslations('uk');

  const route = context.locals.starlightRoute;
  if (!route) return;

  route.lang = 'uk';
  route.entryMeta.lang = 'uk';
});
