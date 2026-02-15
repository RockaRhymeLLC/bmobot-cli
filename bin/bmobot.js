#!/usr/bin/env node

/**
 * bmobot CLI — 30+ free developer APIs from your terminal.
 * https://bmobot.ai
 *
 * Zero dependencies. Uses Node.js built-in fetch (18+).
 *
 * Usage: bmobot <service> <action> [args...] [--flags]
 */

const VERSION = '1.0.0';
const BASE = 'https://{service}.bmobot.ai';

// ── ANSI Colors ─────────────────────────────────────────────

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

const noColor = process.env.NO_COLOR || !process.stdout.isTTY;
const color = (code, text) => noColor ? text : `${code}${text}${c.reset}`;

// ── Service Registry ────────────────────────────────────────

const SERVICES = {
  hash: {
    host: 'hash',
    desc: 'Hashing, HMAC, encoding, UUIDs, random strings',
    actions: {
      sha256:  { method: 'POST', path: '/hash', body: (a) => ({ input: a[0], algorithm: 'sha256' }), desc: 'SHA-256 hash' },
      sha512:  { method: 'POST', path: '/hash', body: (a) => ({ input: a[0], algorithm: 'sha512' }), desc: 'SHA-512 hash' },
      md5:     { method: 'POST', path: '/hash', body: (a) => ({ input: a[0], algorithm: 'md5' }), desc: 'MD5 hash' },
      hmac:    { method: 'POST', path: '/hmac', body: (a) => ({ input: a[0], key: a[1], algorithm: a[2] || 'sha256' }), desc: 'HMAC signature' },
      encode:  { method: 'POST', path: '/encode', body: (a, f) => ({ input: a[0], encoding: f.encoding || 'base64', action: f.decode ? 'decode' : 'encode' }), desc: 'Base64/hex/URL encode' },
      uuid:    { method: 'GET',  path: '/uuid', desc: 'Generate UUID v4' },
      random:  { method: 'POST', path: '/random', body: (a, f) => ({ length: parseInt(a[0] || '32'), charset: f.charset || 'alphanumeric' }), desc: 'Random string' },
    },
  },

  uuid: {
    host: 'uuid',
    desc: 'UUID/ULID generation, decoding, validation',
    actions: {
      v4:       { method: 'POST', path: '/generate', body: () => ({ version: 'v4' }), desc: 'Generate UUID v4' },
      v7:       { method: 'POST', path: '/generate', body: () => ({ version: 'v7' }), desc: 'Generate UUID v7' },
      ulid:     { method: 'POST', path: '/ulid', body: () => ({}), desc: 'Generate ULID' },
      decode:   { method: 'POST', path: '/decode', body: (a) => ({ uuid: a[0] }), desc: 'Decode UUID' },
      validate: { method: 'POST', path: '/validate', body: (a) => ({ uuid: a[0] }), desc: 'Validate UUID' },
      batch:    { method: 'POST', path: '/batch', body: (a) => ({ count: parseInt(a[0] || '5'), version: a[1] || 'v4' }), desc: 'Batch generate' },
    },
  },

  json: {
    host: 'json',
    desc: 'Format, minify, validate, diff, flatten, query JSON',
    actions: {
      format:   { method: 'POST', path: '/format', body: (a, f) => ({ json: readInput(a[0]), indent: parseInt(f.indent || '2') }), desc: 'Pretty-print JSON' },
      minify:   { method: 'POST', path: '/minify', body: (a) => ({ json: readInput(a[0]) }), desc: 'Minify JSON' },
      validate: { method: 'POST', path: '/validate', body: (a) => ({ json: readInput(a[0]) }), desc: 'Validate JSON' },
      diff:     { method: 'POST', path: '/diff', body: (a) => ({ a: readInput(a[0]), b: readInput(a[1]) }), desc: 'Diff two JSON docs' },
      flatten:  { method: 'POST', path: '/flatten', body: (a) => ({ json: readInput(a[0]) }), desc: 'Flatten nested JSON' },
      query:    { method: 'POST', path: '/query', body: (a) => ({ json: readInput(a[0]), path: a[1] }), desc: 'Query with path expr' },
      stats:    { method: 'POST', path: '/stats', body: (a) => ({ json: readInput(a[0]) }), desc: 'JSON structure stats' },
      merge:    { method: 'POST', path: '/merge', body: (a) => ({ sources: a.map(readInput) }), desc: 'Deep merge JSON docs' },
    },
  },

  qr: {
    host: 'qr',
    desc: 'Generate QR codes (PNG, SVG, base64, terminal)',
    actions: {
      generate: { method: 'POST', path: '/generate', body: (a, f) => ({
        text: a[0], format: f.format || 'terminal', size: parseInt(f.size || '256'),
        fg: f.fg, bg: f.bg, errorCorrection: f.ec,
      }), desc: 'Generate QR code' },
    },
    default: 'generate',
  },

  password: {
    host: 'password',
    desc: 'Generate passwords, passphrases, PINs, check strength',
    actions: {
      generate:   { method: 'GET', path: '/password', query: (a, f) => ({ length: f.length || '20', uppercase: f.upper, lowercase: f.lower, numbers: f.numbers, symbols: f.symbols }), desc: 'Generate password' },
      passphrase: { method: 'GET', path: '/passphrase', query: (a, f) => ({ words: f.words || '4', separator: f.sep || '-' }), desc: 'Generate passphrase' },
      pin:        { method: 'GET', path: '/pin', query: (a, f) => ({ length: f.length || '6' }), desc: 'Generate PIN' },
      strength:   { method: 'POST', path: '/strength', body: (a) => ({ password: a[0] }), desc: 'Check strength' },
      batch:      { method: 'POST', path: '/batch', body: (a, f) => ({ count: parseInt(a[0] || '5'), length: parseInt(f.length || '16') }), desc: 'Batch generate' },
    },
    default: 'generate',
  },

  cron: {
    host: 'cron',
    desc: 'Parse cron expressions, show next runs, presets',
    actions: {
      parse:    { method: 'GET', path: '/parse', query: (a) => ({ expression: a[0] }), desc: 'Parse cron expression' },
      next:     { method: 'GET', path: '/next', query: (a, f) => ({ expression: a[0], count: f.count || '5' }), desc: 'Next N run times' },
      validate: { method: 'GET', path: '/validate', query: (a) => ({ expression: a[0] }), desc: 'Validate expression' },
      presets:  { method: 'GET', path: '/presets', desc: 'Common cron presets' },
    },
    default: 'parse',
  },

  text: {
    host: 'text',
    desc: 'Case conversion, slug, count, extract, lorem, encode',
    actions: {
      case:    { method: 'POST', path: '/case', body: (a, f) => ({ text: readInput(a[0]), to: f.to || a[1] || 'camel' }), desc: 'Convert case' },
      slug:    { method: 'POST', path: '/slug', body: (a) => ({ text: a.join(' ') }), desc: 'Generate URL slug' },
      count:   { method: 'POST', path: '/count', body: (a) => ({ text: readInput(a[0]) }), desc: 'Word/char count' },
      extract: { method: 'POST', path: '/extract', body: (a, f) => ({ text: readInput(a[0]), type: f.type || 'emails' }), desc: 'Extract emails/URLs/etc' },
      lorem:   { method: 'POST', path: '/lorem', body: (a, f) => ({ type: a[0] || 'paragraphs', count: parseInt(f.count || '3') }), desc: 'Generate lorem ipsum' },
      reverse: { method: 'POST', path: '/reverse', body: (a, f) => ({ text: readInput(a[0]), mode: f.mode || 'characters' }), desc: 'Reverse text' },
    },
  },

  color: {
    host: 'color',
    desc: 'Convert, palette, contrast, mix, name colors',
    actions: {
      convert:  { method: 'GET', path: '/convert', query: (a) => ({ color: a[0] }), desc: 'Convert color formats' },
      palette:  { method: 'GET', path: '/palette', query: (a, f) => ({ color: a[0], type: f.type || 'complementary', count: f.count }), desc: 'Generate palette' },
      contrast: { method: 'GET', path: '/contrast', query: (a) => ({ foreground: a[0], background: a[1] || '#ffffff' }), desc: 'WCAG contrast ratio' },
      mix:      { method: 'GET', path: '/mix', query: (a, f) => ({ color1: a[0], color2: a[1], weight: f.weight }), desc: 'Mix two colors' },
      random:   { method: 'GET', path: '/random', desc: 'Random color' },
      name:     { method: 'GET', path: '/name', query: (a) => ({ color: a[0] }), desc: 'Name a color' },
      shades:   { method: 'GET', path: '/shades', query: (a, f) => ({ color: a[0], count: f.count || '10' }), desc: 'Generate shades' },
    },
  },

  regex: {
    host: 'regex',
    desc: 'Test, explain, replace, split, validate regex patterns',
    actions: {
      test:     { method: 'POST', path: '/test', body: (a, f) => ({ pattern: a[0], text: readInput(a[1]), flags: f.flags || 'g' }), desc: 'Test pattern' },
      explain:  { method: 'POST', path: '/explain', body: (a) => ({ pattern: a[0] }), desc: 'Explain pattern in English' },
      replace:  { method: 'POST', path: '/replace', body: (a, f) => ({ pattern: a[0], text: readInput(a[1]), replacement: a[2], flags: f.flags || 'g' }), desc: 'Find & replace' },
      validate: { method: 'POST', path: '/validate', body: (a) => ({ pattern: a[0] }), desc: 'Validate pattern' },
      library:  { method: 'GET', path: '/library', desc: 'Common patterns library' },
    },
  },

  jwt: {
    host: 'jwt',
    desc: 'Decode, verify, generate, inspect JWT tokens',
    actions: {
      decode:   { method: 'POST', path: '/decode', body: (a) => ({ token: a[0] }), desc: 'Decode JWT payload' },
      verify:   { method: 'POST', path: '/verify', body: (a) => ({ token: a[0], secret: a[1] }), desc: 'Verify JWT signature' },
      generate: { method: 'POST', path: '/generate', body: (a, f) => ({ payload: JSON.parse(a[0]), secret: a[1], algorithm: f.alg || 'HS256', expiresIn: f.exp }), desc: 'Generate JWT' },
      inspect:  { method: 'GET', path: '/inspect', query: (a) => ({ token: a[0] }), desc: 'Inspect JWT header' },
    },
  },

  semver: {
    host: 'semver',
    desc: 'Parse, compare, sort, bump semantic versions',
    actions: {
      parse:    { method: 'POST', path: '/parse', body: (a) => ({ version: a[0] }), desc: 'Parse version string' },
      compare:  { method: 'POST', path: '/compare', body: (a) => ({ a: a[0], b: a[1] }), desc: 'Compare two versions' },
      sort:     { method: 'POST', path: '/sort', body: (a) => ({ versions: a }), desc: 'Sort version list' },
      satisfies:{ method: 'POST', path: '/satisfies', body: (a) => ({ version: a[0], range: a[1] }), desc: 'Check range match' },
      bump:     { method: 'POST', path: '/bump', body: (a, f) => ({ version: a[0], type: a[1] || 'patch', preid: f.preid }), desc: 'Bump version' },
    },
  },

  csv: {
    host: 'csv',
    desc: 'Convert CSV to/from JSON, stats, filter, sort',
    actions: {
      'to-json':  { method: 'POST', path: '/to-json', body: (a) => ({ csv: readInput(a[0]) }), desc: 'CSV to JSON' },
      'from-json':{ method: 'POST', path: '/from-json', body: (a) => ({ json: readInput(a[0]) }), desc: 'JSON to CSV' },
      stats:      { method: 'POST', path: '/stats', body: (a) => ({ csv: readInput(a[0]) }), desc: 'CSV statistics' },
      filter:     { method: 'POST', path: '/filter', body: (a, f) => ({ csv: readInput(a[0]), column: f.column, value: f.value, operator: f.op }), desc: 'Filter rows' },
      sort:       { method: 'POST', path: '/sort', body: (a, f) => ({ csv: readInput(a[0]), column: f.column, direction: f.dir || 'asc' }), desc: 'Sort by column' },
    },
  },

  email: {
    host: 'email',
    desc: 'Validate email addresses, check MX, detect disposable',
    actions: {
      validate:   { method: 'GET', path: '/validate', query: (a) => ({ email: a[0] }), desc: 'Full validation' },
      syntax:     { method: 'GET', path: '/syntax', query: (a) => ({ email: a[0] }), desc: 'Syntax check only' },
      mx:         { method: 'GET', path: '/mx', query: (a) => ({ email: a[0] }), desc: 'MX record lookup' },
      disposable: { method: 'GET', path: '/disposable', query: (a) => ({ email: a[0] }), desc: 'Disposable check' },
      suggest:    { method: 'GET', path: '/suggest', query: (a) => ({ email: a[0] }), desc: 'Typo suggestion' },
    },
  },

  encode: {
    host: 'encode',
    desc: 'Base32, base58, morse, braille, NATO, punycode',
    actions: {
      base32:   { method: 'POST', path: '/base32', body: (a, f) => ({ text: a[0], action: f.decode ? 'decode' : 'encode' }), desc: 'Base32 encode/decode' },
      base58:   { method: 'POST', path: '/base58', body: (a, f) => ({ text: a[0], action: f.decode ? 'decode' : 'encode' }), desc: 'Base58 encode/decode' },
      morse:    { method: 'POST', path: '/morse', body: (a, f) => ({ text: a[0], action: f.decode ? 'decode' : 'encode' }), desc: 'Morse code' },
      braille:  { method: 'POST', path: '/braille', body: (a, f) => ({ text: a[0], action: f.decode ? 'decode' : 'encode' }), desc: 'Braille encoding' },
      nato:     { method: 'POST', path: '/nato', body: (a) => ({ text: a[0] }), desc: 'NATO phonetic alphabet' },
      punycode: { method: 'POST', path: '/punycode', body: (a, f) => ({ text: a[0], action: f.decode ? 'decode' : 'encode' }), desc: 'Punycode' },
    },
  },

  ip: {
    host: 'ip',
    desc: 'Validate IPs, CIDR calc, subnet, range check',
    actions: {
      validate: { method: 'POST', path: '/validate', body: (a) => ({ ip: a[0] }), desc: 'Validate IP address' },
      cidr:     { method: 'POST', path: '/cidr', body: (a) => ({ cidr: a[0] }), desc: 'CIDR calculator' },
      subnet:   { method: 'POST', path: '/subnet', body: (a) => ({ ip: a[0], mask: a[1] }), desc: 'Subnet info' },
      range:    { method: 'POST', path: '/range', body: (a) => ({ ip: a[0], cidr: a[1] }), desc: 'Check if IP in range' },
      info:     { method: 'POST', path: '/info', body: (a) => ({ ip: a[0] }), desc: 'IP info (type, class)' },
    },
  },

  time: {
    host: 'time',
    desc: 'Current time, convert timezones, diff, add, calendar',
    actions: {
      now:      { method: 'GET', path: '/now', query: (a) => ({ timezone: a[0] }), desc: 'Current time' },
      convert:  { method: 'POST', path: '/convert', body: (a) => ({ datetime: a[0], from: a[1], to: a[2] }), desc: 'Convert timezone' },
      diff:     { method: 'POST', path: '/diff', body: (a) => ({ start: a[0], end: a[1] }), desc: 'Time difference' },
      add:      { method: 'POST', path: '/add', body: (a) => ({ datetime: a[0], amount: parseInt(a[1]), unit: a[2] || 'days' }), desc: 'Add time' },
      calendar: { method: 'GET', path: '/calendar', query: (a) => ({ year: a[0], month: a[1] }), desc: 'Show calendar' },
    },
    default: 'now',
  },

  md: {
    host: 'md',
    desc: 'Markdown to HTML, extract links/TOC, frontmatter, stats',
    actions: {
      'to-html':    { method: 'POST', path: '/to-html', body: (a) => ({ markdown: readInput(a[0]) }), desc: 'Convert to HTML' },
      toc:          { method: 'POST', path: '/toc', body: (a) => ({ markdown: readInput(a[0]) }), desc: 'Extract TOC' },
      links:        { method: 'POST', path: '/links', body: (a) => ({ markdown: readInput(a[0]) }), desc: 'Extract links' },
      frontmatter:  { method: 'POST', path: '/frontmatter', body: (a) => ({ markdown: readInput(a[0]) }), desc: 'Parse frontmatter' },
      stats:        { method: 'POST', path: '/stats', body: (a) => ({ markdown: readInput(a[0]) }), desc: 'Document stats' },
      format:       { method: 'POST', path: '/format', body: (a) => ({ markdown: readInput(a[0]) }), desc: 'Auto-format' },
    },
  },

  yaml: {
    host: 'yaml',
    desc: 'YAML/TOML conversion, validation, formatting',
    actions: {
      'to-json':    { method: 'POST', path: '/yaml/to-json', body: (a) => ({ yaml: readInput(a[0]) }), desc: 'YAML to JSON' },
      'from-json':  { method: 'POST', path: '/json/to-yaml', body: (a) => ({ json: readInput(a[0]) }), desc: 'JSON to YAML' },
      validate:     { method: 'POST', path: '/yaml/validate', body: (a) => ({ yaml: readInput(a[0]) }), desc: 'Validate YAML' },
      format:       { method: 'POST', path: '/yaml/format', body: (a) => ({ yaml: readInput(a[0]) }), desc: 'Format YAML' },
      'toml-to-json':{ method: 'POST', path: '/toml/to-json', body: (a) => ({ toml: readInput(a[0]) }), desc: 'TOML to JSON' },
    },
  },

  diff: {
    host: 'diff',
    desc: 'Unified diff, word diff, patch, three-way merge',
    actions: {
      unified: { method: 'POST', path: '/unified', body: (a) => ({ a: readInput(a[0]), b: readInput(a[1]) }), desc: 'Unified diff' },
      word:    { method: 'POST', path: '/word', body: (a) => ({ a: readInput(a[0]), b: readInput(a[1]) }), desc: 'Word-level diff' },
      char:    { method: 'POST', path: '/char', body: (a) => ({ a: readInput(a[0]), b: readInput(a[1]) }), desc: 'Character-level diff' },
      stats:   { method: 'POST', path: '/stats', body: (a) => ({ a: readInput(a[0]), b: readInput(a[1]) }), desc: 'Diff statistics' },
      patch:   { method: 'POST', path: '/patch', body: (a) => ({ text: readInput(a[0]), patch: readInput(a[1]) }), desc: 'Apply patch' },
      merge:   { method: 'POST', path: '/merge', body: (a) => ({ base: readInput(a[0]), ours: readInput(a[1]), theirs: readInput(a[2]) }), desc: 'Three-way merge' },
    },
  },

  sql: {
    host: 'sql',
    desc: 'Format, minify, validate, highlight SQL',
    actions: {
      format:   { method: 'POST', path: '/format', body: (a, f) => ({ sql: readInput(a[0]), dialect: f.dialect }), desc: 'Format SQL' },
      minify:   { method: 'POST', path: '/minify', body: (a) => ({ sql: readInput(a[0]) }), desc: 'Minify SQL' },
      validate: { method: 'POST', path: '/validate', body: (a) => ({ sql: readInput(a[0]) }), desc: 'Validate SQL' },
      extract:  { method: 'POST', path: '/extract', body: (a) => ({ sql: readInput(a[0]) }), desc: 'Extract tables/columns' },
    },
  },

  status: {
    host: 'status',
    desc: 'HTTP status code lookup and search',
    actions: {
      lookup:   { method: 'GET', path: (a) => `/status/${a[0]}`, desc: 'Look up status code' },
      search:   { method: 'GET', path: '/search', query: (a) => ({ q: a.join(' ') }), desc: 'Search codes' },
      category: { method: 'GET', path: (a) => `/category/${a[0] || '4xx'}`, desc: 'Browse by category' },
      random:   { method: 'GET', path: '/random', desc: 'Random status code' },
    },
    default: 'lookup',
  },

  ascii: {
    host: 'ascii',
    desc: 'ASCII art text, boxes, tables, banners',
    actions: {
      figlet: { method: 'POST', path: '/figlet', body: (a, f) => ({ text: a.join(' '), font: f.font || 'standard' }), desc: 'Figlet text art' },
      box:    { method: 'POST', path: '/box', body: (a, f) => ({ text: a.join(' '), style: f.style || 'round' }), desc: 'Text in a box' },
      banner: { method: 'POST', path: '/banner', body: (a, f) => ({ text: a.join(' '), width: parseInt(f.width || '60') }), desc: 'Banner text' },
      table:  { method: 'POST', path: '/table', body: (a) => ({ data: JSON.parse(readInput(a[0])) }), desc: 'ASCII table' },
      tree:   { method: 'POST', path: '/tree', body: (a) => ({ data: JSON.parse(readInput(a[0])) }), desc: 'Tree diagram' },
    },
    default: 'figlet',
  },

  lorem: {
    host: 'lorem',
    desc: 'Lorem ipsum and placeholder text generation',
    actions: {
      paragraphs: { method: 'GET', path: '/paragraphs', query: (a) => ({ count: a[0] || '3' }), desc: 'Generate paragraphs' },
      sentences:  { method: 'GET', path: '/sentences', query: (a) => ({ count: a[0] || '5' }), desc: 'Generate sentences' },
      words:      { method: 'GET', path: '/words', query: (a) => ({ count: a[0] || '10' }), desc: 'Generate words' },
      lists:      { method: 'GET', path: '/lists', query: (a) => ({ items: a[0] || '5' }), desc: 'Generate lists' },
    },
    default: 'paragraphs',
  },

  glob: {
    host: 'glob',
    desc: 'Test, explain, generate glob patterns',
    actions: {
      test:     { method: 'POST', path: '/test', body: (a) => ({ pattern: a[0], paths: a.slice(1) }), desc: 'Test paths against pattern' },
      explain:  { method: 'POST', path: '/explain', body: (a) => ({ pattern: a[0] }), desc: 'Explain pattern' },
      generate: { method: 'POST', path: '/generate', body: (a) => ({ paths: a }), desc: 'Generate pattern from paths' },
      validate: { method: 'POST', path: '/validate', body: (a) => ({ pattern: a[0] }), desc: 'Validate pattern' },
    },
  },

  convert: {
    host: 'convert',
    desc: 'Number base, data size, length, weight, temperature',
    actions: {
      number: { method: 'POST', path: '/number', body: (a) => ({ value: a[0], from: parseInt(a[1] || '10'), to: parseInt(a[2] || '16') }), desc: 'Number base conversion' },
      data:   { method: 'POST', path: '/data-size', body: (a) => ({ value: parseFloat(a[0]), from: a[1], to: a[2] }), desc: 'Data size conversion' },
      length: { method: 'POST', path: '/length', body: (a) => ({ value: parseFloat(a[0]), from: a[1], to: a[2] }), desc: 'Length conversion' },
      weight: { method: 'POST', path: '/weight', body: (a) => ({ value: parseFloat(a[0]), from: a[1], to: a[2] }), desc: 'Weight conversion' },
      temp:   { method: 'POST', path: '/temperature', body: (a) => ({ value: parseFloat(a[0]), from: a[1], to: a[2] }), desc: 'Temperature conversion' },
    },
  },

  faker: {
    host: 'faker',
    desc: 'Generate realistic fake data for testing',
    actions: {
      person:  { method: 'POST', path: '/person', body: (a, f) => ({ count: parseInt(f.count || '1'), seed: f.seed ? parseInt(f.seed) : undefined }), desc: 'Fake person' },
      address: { method: 'POST', path: '/address', body: (a, f) => ({ count: parseInt(f.count || '1') }), desc: 'Fake address' },
      company: { method: 'POST', path: '/company', body: (a, f) => ({ count: parseInt(f.count || '1') }), desc: 'Fake company' },
      text:    { method: 'POST', path: '/text', body: (a, f) => ({ count: parseInt(f.count || '1') }), desc: 'Fake text' },
      finance: { method: 'POST', path: '/finance', body: (a, f) => ({ count: parseInt(f.count || '1') }), desc: 'Fake finance data' },
    },
    default: 'person',
  },

  meta: {
    host: 'meta',
    desc: 'Extract URL metadata (OG tags, favicons, etc)',
    actions: {
      fetch: { method: 'GET', path: '/meta', query: (a) => ({ url: a[0] }), desc: 'Fetch URL metadata' },
    },
    default: 'fetch',
  },

  ua: {
    host: 'ua',
    desc: 'Parse user agent strings',
    actions: {
      parse:   { method: 'POST', path: '/parse', body: (a) => ({ ua: a[0] || process.env.npm_config_user_agent }), desc: 'Parse user agent' },
      detect:  { method: 'POST', path: '/detect', body: (a) => ({ ua: a[0] }), desc: 'Detect features' },
      library: { method: 'GET', path: '/library', desc: 'Common UAs library' },
    },
    default: 'parse',
  },
};

// ── Helpers ─────────────────────────────────────────────────

import { readFileSync } from 'node:fs';

function readInput(val) {
  if (!val) return '';
  // If it starts with @, read from file
  if (val.startsWith('@')) {
    try {
      return readFileSync(val.slice(1), 'utf8');
    } catch (e) {
      die(`Cannot read file: ${val.slice(1)}`);
    }
  }
  // If it's "-", read from stdin (already captured)
  if (val === '-') return stdinData;
  return val;
}

function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, ...rest] = arg.slice(2).split('=');
      flags[key] = rest.length ? rest.join('=') : 'true';
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

function buildUrl(host, path, queryParams) {
  const base = BASE.replace('{service}', host);
  const url = new URL(path, base);
  if (queryParams) {
    for (const [k, v] of Object.entries(queryParams)) {
      if (v != null && v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

function die(msg) {
  console.error(color(c.red, `Error: ${msg}`));
  process.exit(1);
}

function formatOutput(data, flags) {
  if (flags.raw || flags.json) return JSON.stringify(data, null, flags.raw ? 0 : 2);

  // Smart formatting based on response shape
  if (typeof data === 'string') return data;
  if (data.result !== undefined) return typeof data.result === 'string' ? data.result : JSON.stringify(data.result, null, 2);
  if (data.output !== undefined) return typeof data.output === 'string' ? data.output : JSON.stringify(data.output, null, 2);
  if (data.hash) return data.hash;
  if (data.hmac) return data.hmac;
  if (data.uuid) return data.uuid;
  if (data.ulid) return data.ulid;
  if (data.password) return data.password;
  if (data.passphrase) return data.passphrase;
  if (data.pin) return data.pin;
  if (data.qr) return data.qr;
  if (data.encoded) return data.encoded;
  if (data.decoded) return data.decoded;
  if (data.formatted) return data.formatted;
  if (data.minified) return data.minified;
  if (data.html) return data.html;
  if (data.csv) return data.csv;
  if (data.yaml) return data.yaml;
  if (data.json) return typeof data.json === 'string' ? data.json : JSON.stringify(data.json, null, 2);
  if (data.art) return data.art;
  if (data.text) return data.text;
  if (data.slug) return data.slug;
  if (data.description) return data.description;
  if (data.valid !== undefined) return data.valid ? color(c.green, 'Valid') + (data.reason ? ` — ${data.reason}` : '') : color(c.red, 'Invalid') + (data.reason ? ` — ${data.reason}` : '');

  return JSON.stringify(data, null, 2);
}

// ── Stdin Capture ───────────────────────────────────────────

let stdinData = '';

async function captureStdin() {
  if (process.stdin.isTTY) return;
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  stdinData = Buffer.concat(chunks).toString('utf8');
}

// ── Help ────────────────────────────────────────────────────

function showHelp() {
  console.log(`
${color(c.bold + c.cyan, 'bmobot')} ${color(c.dim, `v${VERSION}`)} — 30+ free developer APIs from your terminal
${color(c.dim, 'https://bmobot.ai')}

${color(c.bold, 'Usage:')}
  bmobot <service> <action> [args...] [--flags]
  bmobot <service> --help

${color(c.bold, 'Services:')}
${Object.entries(SERVICES).map(([name, svc]) =>
  `  ${color(c.green, name.padEnd(10))} ${color(c.dim, svc.desc)}`
).join('\n')}

${color(c.bold, 'Examples:')}
  ${color(c.dim, '$')} bmobot hash sha256 "hello world"
  ${color(c.dim, '$')} bmobot uuid v4
  ${color(c.dim, '$')} bmobot json format @data.json
  ${color(c.dim, '$')} bmobot password generate --length=20
  ${color(c.dim, '$')} bmobot cron "*/5 * * * *"
  ${color(c.dim, '$')} bmobot color palette "#ff6600" --type=analogous
  ${color(c.dim, '$')} bmobot ascii "Hello World" --font=banner
  ${color(c.dim, '$')} cat file.json | bmobot json validate -

${color(c.bold, 'Global Flags:')}
  --json      Output raw JSON response
  --raw       Output minified JSON (for piping)
  --help      Show help for a service
  --version   Show version

${color(c.dim, 'All APIs are free, no auth required. Docs: https://bmobot.ai/apis')}
`);
}

function showServiceHelp(name, svc) {
  console.log(`
${color(c.bold + c.cyan, `bmobot ${name}`)} — ${svc.desc}

${color(c.bold, 'Actions:')}
${Object.entries(svc.actions).map(([action, def]) =>
  `  ${color(c.green, action.padEnd(14))} ${def.desc}`
).join('\n')}

${color(c.bold, 'Usage:')}
  bmobot ${name} <action> [args...] [--flags]

${color(c.dim, `API docs: https://${svc.host}.bmobot.ai/docs`)}
`);
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  await captureStdin();

  const rawArgs = process.argv.slice(2);
  const { flags, positional } = parseFlags(rawArgs);

  if (flags.version) {
    console.log(VERSION);
    return;
  }

  if (flags.help && positional.length === 0 || positional.length === 0) {
    showHelp();
    return;
  }

  const serviceName = positional[0];
  const service = SERVICES[serviceName];

  if (!service) {
    die(`Unknown service: ${serviceName}\nRun 'bmobot --help' to see available services.`);
  }

  if (flags.help) {
    showServiceHelp(serviceName, service);
    return;
  }

  // Determine action
  let actionName = positional[1] || service.default;
  let actionArgs = positional.slice(2);

  // If no action specified and service has a default, shift args
  if (!positional[1] && service.default) {
    actionArgs = positional.slice(1);
  }
  // If the "action" isn't a known action but the service has a default, treat it as an arg
  if (actionName && !service.actions[actionName] && service.default) {
    actionName = service.default;
    actionArgs = positional.slice(1);
  }

  if (!actionName) {
    showServiceHelp(serviceName, service);
    return;
  }

  const action = service.actions[actionName];
  if (!action) {
    die(`Unknown action: ${actionName}\nRun 'bmobot ${serviceName} --help' to see available actions.`);
  }

  // Build request
  let url, fetchOpts;

  // Resolve path (may be a string or a function for dynamic paths)
  const resolvedPath = typeof action.path === 'function' ? action.path(actionArgs, flags) : action.path;

  if (action.method === 'GET') {
    const queryParams = action.query ? action.query(actionArgs, flags) : {};
    url = buildUrl(service.host, resolvedPath, queryParams);
    fetchOpts = { method: 'GET', headers: { 'Accept': 'application/json' } };
  } else {
    const body = action.body ? action.body(actionArgs, flags) : {};
    url = buildUrl(service.host, resolvedPath);
    fetchOpts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
    };
  }

  // Execute request
  try {
    const res = await fetch(url, fetchOpts);
    const contentType = res.headers.get('content-type') || '';

    if (!res.ok) {
      const errText = contentType.includes('json') ? JSON.stringify(await res.json(), null, 2) : await res.text();
      die(`API error (${res.status}): ${errText}`);
    }

    // Handle non-JSON responses (QR PNG, etc)
    if (!contentType.includes('json')) {
      const text = await res.text();
      process.stdout.write(text);
      return;
    }

    const data = await res.json();
    console.log(formatOutput(data, flags));
  } catch (err) {
    if (err.cause?.code === 'ENOTFOUND') {
      die(`Cannot reach ${service.host}.bmobot.ai — check your internet connection`);
    }
    die(err.message);
  }
}

main();
