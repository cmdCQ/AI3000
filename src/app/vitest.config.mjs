import { defineConfig } from 'vitest/config'

// 只跑 `*.test.mjs`。Playwright 的 `*.spec.mjs` 也在 `tests/` 下，
// 不隔开的话 Vitest 的默认 include 会把它们一起收进来（然后因为找不到
// `@playwright/test` 的 test 上下文而报一堆莫名其妙的错）。
export default defineConfig({
  test: {
    include: ['tests/**/*.test.mjs'],
    environment: 'node',
  },
})
