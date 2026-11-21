// The app's sources import siblings without extensions ('./dates'), which Vite resolves and
// Node does not. This hook retries such relative imports with '.ts' so tests can load them.
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (e) {
      const relative = specifier.startsWith('./') || specifier.startsWith('../');
      if (e?.code === 'ERR_MODULE_NOT_FOUND' && relative && !/\.[cm]?[jt]sx?$/.test(specifier)) {
        return next(`${specifier}.ts`, context);
      }
      throw e;
    }
  },
});
