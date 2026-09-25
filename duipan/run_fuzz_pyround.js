#!/usr/bin/env node
/**
 * `pyRound` 模糊测试的 **JS 侧**：从 stdin 读 `[[x, nd], …]`，把每个结果按 IEEE754 的
 * **16 位十六进制**写到 stdout（`[[hex, …], …]`）。
 *
 * 为什么要出十六进制而不是十进制：比的是**逐位相同**，不是「看起来一样」。
 * 十进制打印会把 -0 变 0、也会把两个相邻 double 印成同一个串。
 *
 * 用法（一般由 duipan/fuzz_pyround.py 调用，不必手跑）：
 *     echo '[[8.35,1],[0.95,1]]' | node duipan/run_fuzz_pyround.js
 */
'use strict';

const F = require(require('path').join(__dirname, '..', 'build/backend/paipan/bazi_fortune.js'));

const HEX = new DataView(new ArrayBuffer(8));
function hex(v) {
  HEX.setFloat64(0, v);
  let s = '';
  for (let i = 0; i < 8; i++) s += HEX.getUint8(i).toString(16).padStart(2, '0');
  return s;
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  const cases = JSON.parse(raw);
  const out = cases.map(([x, nd]) => hex(F.pyRound(x, nd)));
  process.stdout.write(JSON.stringify(out));
});
