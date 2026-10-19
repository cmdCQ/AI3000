/** `register_css_stub.mjs` 注册的钩子本体：把 `.css` 解析成空 ESM 模块。 */
const EMPTY_CSS_MODULE = 'data:text/javascript,export default {}';

export async function resolve(specifier, context, nextResolve) {
  if (/\.css(\?.*)?$/.test(specifier)) {
    return { url: EMPTY_CSS_MODULE, shortCircuit: true, format: 'module' };
  }
  return nextResolve(specifier, context);
}
