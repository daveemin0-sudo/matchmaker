#!/usr/bin/env node
/* Removes legacy CSS rules that reference given classes, so a redesigned
 * component's old styles cannot fight the new ones.
 *
 *   node tools/css-prune.js list  <regex> [files...]      classes matching regex + where used
 *   node tools/css-prune.js prune <file> <regex> [--subject]  rewrite <file> without rules for matching classes/ids
 *        --subject: only look at the element the selector styles (last compound), so
 *        '.app-shell .card' survives a prune of app-shell
 *   node tools/css-prune.js dead  [files...]              classes defined in CSS but never referenced
 *
 * A selector is dropped when it mentions a matching class; a rule is dropped when
 * none of its selectors remain. At-rules (@media/@supports) are processed
 * recursively and removed when emptied; @keyframes are kept unless named by regex
 * via  --keyframes <regex>. Only run `prune` after `list` shows the classes are used
 * by nothing but the component being replaced.
 */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const SRC = ['index.html', 'script.js', 'firebase-config.js', 'admin.html', 'sw.js'];

function splitTop(s, sep) {
  const out = []; let depth = 0, cur = '', q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { cur += c; if (c === q && s[i - 1] !== '\\') q = null; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '(' || c === '[') depth++;
    if (c === ')' || c === ']') depth--;
    if (c === sep && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}

/* Parse a stylesheet body into nodes: {type:'comment'|'rule'|'at', text, prelude, body(children)} */
function parse(src) {
  const nodes = []; let i = 0;
  while (i < src.length) {
    if (/\s/.test(src[i])) { let j = i; while (j < src.length && /\s/.test(src[j])) j++; nodes.push({ type: 'ws', text: src.slice(i, j) }); i = j; continue; }
    if (src.startsWith('/*', i)) { const j = src.indexOf('*/', i + 2); const e = j < 0 ? src.length : j + 2; nodes.push({ type: 'comment', text: src.slice(i, e) }); i = e; continue; }
    // read prelude up to { or ;
    let j = i, q = null, par = 0;
    for (; j < src.length; j++) {
      const c = src[j];
      if (q) { if (c === q && src[j - 1] !== '\\') q = null; continue; }
      if (c === '"' || c === "'") { q = c; continue; }
      if (c === '(') par++; if (c === ')') par--;
      if ((c === '{' || c === ';') && par === 0) break;
    }
    const prelude = src.slice(i, j);
    if (src[j] === ';' || j >= src.length) { nodes.push({ type: 'stmt', text: src.slice(i, Math.min(j + 1, src.length)) }); i = j + 1; continue; }
    // find matching }
    let depth = 1, k = j + 1; q = null;
    for (; k < src.length && depth > 0; k++) {
      const c = src[k];
      if (q) { if (c === q && src[k - 1] !== '\\') q = null; continue; }
      if (c === '"' || c === "'") { q = c; continue; }
      if (src.startsWith('/*', k)) { const e = src.indexOf('*/', k + 2); k = e < 0 ? src.length : e + 1; continue; }
      if (c === '{') depth++; if (c === '}') depth--;
    }
    const body = src.slice(j + 1, k - 1);
    const p = prelude.trim();
    if (p.startsWith('@')) nodes.push({ type: 'at', prelude: p, body, nested: /^@(media|supports|layer|container|document)/.test(p) });
    else nodes.push({ type: 'rule', prelude: p, body });
    i = k;
  }
  return nodes;
}

/* Last compound selector (the element the rule actually styles), e.g.
 * ".app-shell[data-theme=light] .foo:hover" -> ".foo:hover" */
function subjectOf(sel) {
  const s = sel.trim(); let depth = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    const c = s[i];
    if (c === ')' || c === ']') depth++;
    else if (c === '(' || c === '[') depth--;
    else if (depth === 0 && /[\s>+~]/.test(c)) return s.slice(i + 1);
  }
  return s;
}

function prune(src, re, kfRe, subjectOnly) {
  const classRe = /[.#](-?[A-Za-z_][\w-]*)/g;
  let removed = 0;
  const walk = (text) => {
    const out = [];
    for (const n of parse(text)) {
      if (n.type === 'rule') {
        const sels = splitTop(n.prelude, ',');
        const keep = sels.filter((s) => { const t = subjectOnly ? subjectOf(s) : s; for (const m of t.replace(/\[[^\]]*\]|\([^)]*\)/g, '').matchAll(classRe)) if (re.test(m[1])) return false; return true; });
        removed += sels.length - keep.length;
        if (keep.length) out.push({ type: 'text', text: `${keep.map((s) => s.trim()).join(',\n')} {${n.body}}` });
        else out.push({ type: 'removed' });
      } else if (n.type === 'at') {
        if (n.nested) {
          const inner = walk(n.body);
          if (inner.trim()) out.push({ type: 'text', text: `${n.prelude} {\n${inner}\n}` });
          else out.push({ type: 'removed' });
        } else if (kfRe && /^@(-webkit-)?keyframes\s+/.test(n.prelude) && kfRe.test(n.prelude.replace(/^@(-webkit-)?keyframes\s+/, '').trim())) { out.push({ type: 'removed' }); removed++; }
        else out.push({ type: 'text', text: `${n.prelude} {${n.body}}` });
      } else if (n.type === 'comment') out.push({ type: 'comment', text: n.text });
      else if (n.type === 'ws') out.push({ type: 'ws', text: n.text });
      else out.push({ type: 'text', text: n.text });
    }
    // drop comments that no longer introduce anything (followed only by whitespace/comments/end)
    const res = [];
    for (let a = 0; a < out.length; a++) {
      const n = out[a];
      if (n.type === 'comment') {
        let b = a + 1; while (b < out.length && (out[b].type === 'ws' || out[b].type === 'removed')) b++;
        if (b >= out.length || out[b].type === 'comment') { continue; }
      }
      if (n.type === 'removed') continue;
      res.push(n.text);
    }
    return res.join('').replace(/\n{3,}/g, '\n\n');
  };
  return { css: walk(src).trim() + '\n', removed };
}

function classesOf(css) {
  const set = new Set();
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const n of parse(noComments)) collect(n, set);
  return set;
  function collect(n, set) {
    if (n.type === 'rule') for (const m of n.prelude.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) set.add(m[1]);
    if (n.type === 'at' && n.nested) for (const c of parse(n.body)) collect(c, set);
  }
}
const read = (f) => fs.readFileSync(path.resolve(root, f), 'utf8');

const [cmd, ...args] = process.argv.slice(2);
const subjIdx = args.indexOf('--subject');
const subjectOnly = subjIdx >= 0 ? (args.splice(subjIdx, 1), true) : false;
const kfIdx = args.indexOf('--keyframes');
const kfRe = kfIdx >= 0 ? new RegExp(args.splice(kfIdx, 2)[1]) : null;

if (cmd === 'list') {
  const re = new RegExp(args[0]);
  const css = (args.slice(1).length ? args.slice(1) : fs.readdirSync(root).filter((f) => f.endsWith('.css'))).map((f) => ({ f, set: classesOf(read(f)) }));
  const all = new Set(css.flatMap((c) => [...c.set])); const hits = [...all].filter((c) => re.test(c)).sort();
  const src = SRC.filter((f) => fs.existsSync(path.join(root, f))).map((f) => ({ f, lines: read(f).split('\n') }));
  for (const c of hits) {
    const where = src.map(({ f, lines }) => { const n = lines.filter((l) => new RegExp(`(^|[^\\w-])${c}([^\\w-]|$)`).test(l)).length; return n ? `${f}:${n}` : ''; }).filter(Boolean).join(' ');
    console.log(c.padEnd(34), where || '(unused)');
  }
  console.log(`\n${hits.length} classes match`);
} else if (cmd === 'prune') {
  const [file, rx] = args; const re = new RegExp(rx);
  const { css, removed } = prune(read(file), re, kfRe, subjectOnly);
  fs.writeFileSync(path.resolve(root, file), css);
  console.log(`${file}: removed ${removed} selectors`);
} else if (cmd === 'dead') {
  const files = args.length ? args : ['style.css', 'premium.css'];
  const tokens = new Set(); for (const f of SRC) if (fs.existsSync(path.join(root, f))) for (const m of read(f).matchAll(/[A-Za-z_][A-Za-z0-9_-]*/g)) tokens.add(m[0]);
  for (const f of files) { const dead = [...classesOf(read(f))].filter((c) => !tokens.has(c)).sort(); console.log(`${f}: ${dead.length} dead classes`); if (process.env.VERBOSE) console.log(dead.join(' ')); }
} else { console.error('usage: css-prune.js list|prune|dead ...'); process.exit(2); }
