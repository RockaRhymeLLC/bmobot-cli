# bmobot

> 30+ free developer APIs from your terminal. No API key required.

[![npm](https://img.shields.io/npm/v/bmobot)](https://www.npmjs.com/package/bmobot)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

```
$ bmobot hash sha256 "hello world"
b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9

$ bmobot uuid v4
67236d92-5221-4116-8a54-0a5b7a90bc8b

$ bmobot ascii "BMO"
 ____   __  __   ___
| __ ) |  \/  | / _ \
|  _ \ | |\/| || | | |
| |_) || |  | || |_| |
|____/ |_|  |_| \___/
```

## Install

```bash
npm install -g bmobot
```

Or use directly with npx:

```bash
npx bmobot hash sha256 "hello"
```

**Requirements:** Node.js 18+ (uses built-in `fetch`)

## Usage

```
bmobot <service> <action> [args...] [--flags]
```

### File Input

Use `@filename` to read input from a file:

```bash
bmobot json format @data.json
bmobot sql format @query.sql
bmobot md stats @README.md
```

### Pipe Input

Use `-` to read from stdin:

```bash
cat data.json | bmobot json validate -
echo "Hello World" | bmobot hash sha256 -
```

### Output Control

```bash
bmobot uuid v4 --json     # Full JSON response
bmobot uuid v4 --raw      # Minified JSON (for piping)
```

## Services

### Hashing & Crypto

```bash
bmobot hash sha256 "hello world"        # SHA-256
bmobot hash md5 "hello world"           # MD5
bmobot hash hmac "data" "secret-key"    # HMAC-SHA256
bmobot hash uuid                        # UUID v4
bmobot hash random 32                   # Random string
bmobot hash encode "hello" --encoding=base64
```

### UUID / ULID

```bash
bmobot uuid v4                          # UUID v4
bmobot uuid v7                          # UUID v7 (time-sorted)
bmobot uuid ulid                        # ULID
bmobot uuid decode <uuid>               # Decode UUID metadata
bmobot uuid batch 10                    # Generate 10 UUIDs
```

### JSON

```bash
bmobot json format @data.json           # Pretty-print
bmobot json minify @data.json           # Minify
bmobot json validate '{"a":1}'          # Validate
bmobot json diff @a.json @b.json        # Diff
bmobot json flatten @nested.json        # Flatten
bmobot json query @data.json "users[0].name"
```

### Passwords

```bash
bmobot password                         # Generate password
bmobot password --length=32             # Custom length
bmobot password passphrase              # Passphrase (4 words)
bmobot password pin --length=8          # PIN code
bmobot password strength "MyP@ss123"    # Check strength
```

### QR Codes

```bash
bmobot qr "https://bmobot.ai"          # Terminal QR code
bmobot qr "hello" --format=svg         # SVG output
bmobot qr "hello" --format=base64      # Base64 PNG
```

### Cron

```bash
bmobot cron "*/5 * * * *"              # Parse expression
bmobot cron next "0 9 * * 1-5"         # Next 5 runs
bmobot cron presets                     # Common presets
```

### Text

```bash
bmobot text case "hello world" upper    # HELLO WORLD
bmobot text case "hello world" camel    # helloWorld
bmobot text slug "Hello World!"         # hello-world
bmobot text count @article.md           # Word/char count
bmobot text extract @page.html --type=emails
bmobot text lorem paragraphs --count=3
```

### Colors

```bash
bmobot color convert "#ff6600"          # All formats
bmobot color palette "#ff6600"          # Complementary colors
bmobot color contrast "#000" "#fff"     # WCAG ratio
bmobot color mix "#ff0000" "#0000ff"    # Mix colors
bmobot color random                     # Random color
bmobot color name "#ff6600"             # Color name
```

### Regex

```bash
bmobot regex explain "^[a-zA-Z]+$"      # Plain English
bmobot regex test "\d+" "abc123def"      # Test pattern
bmobot regex validate "([a-z"            # Check syntax
bmobot regex library                     # Common patterns
```

### JWT

```bash
bmobot jwt decode <token>               # Decode payload
bmobot jwt verify <token> <secret>      # Verify signature
bmobot jwt generate '{"sub":"123"}' "secret" --exp=1h
```

### SemVer

```bash
bmobot semver parse "1.2.3-beta.1"      # Parse version
bmobot semver bump "1.2.3" minor        # 1.3.0
bmobot semver compare "1.0.0" "2.0.0"   # Compare
bmobot semver satisfies "1.2.3" "^1.0.0"
```

### Encoding

```bash
bmobot encode morse "hello"             # .... . .-.. .-.. ---
bmobot encode nato "BMO"                # Bravo Mike Oscar
bmobot encode braille "hello"           # Braille encoding
bmobot encode base32 "hello"            # Base32
bmobot encode morse --decode ".... .."  # Decode
```

### Email Validation

```bash
bmobot email validate "user@gmail.com"  # Full validation
bmobot email disposable "user@temp.com" # Disposable check
bmobot email suggest "user@gmial.com"   # Typo suggestion
bmobot email mx "user@example.com"      # MX lookup
```

### IP Tools

```bash
bmobot ip validate "192.168.1.1"        # Validate
bmobot ip cidr "10.0.0.0/24"            # CIDR calculator
bmobot ip info "8.8.8.8"                # IP info
```

### Time

```bash
bmobot time                             # Current time (UTC)
bmobot time now "America/New_York"      # Time in timezone
bmobot time diff "2026-01-01" "2026-12-31"
bmobot time add "2026-02-15" 30 days
```

### Conversions

```bash
bmobot convert number 255 10 16         # Decimal to hex: FF
bmobot convert temp 100 C F             # Celsius to Fahrenheit
bmobot convert length 1 miles km        # Miles to km
bmobot convert weight 1 kg lbs          # Kg to pounds
bmobot convert data 1 GB MB             # Data sizes
```

### More Services

```bash
bmobot csv to-json @data.csv            # CSV to JSON
bmobot yaml to-json @config.yaml        # YAML to JSON
bmobot md stats @README.md              # Markdown stats
bmobot sql format @query.sql            # Format SQL
bmobot diff unified @old.txt @new.txt   # Unified diff
bmobot ascii "Hello" --font=banner      # ASCII art
bmobot lorem words 20                   # Lorem ipsum
bmobot glob explain "**/*.ts"           # Explain glob
bmobot status 404                       # HTTP status info
bmobot faker person --count=5           # Fake test data
bmobot meta fetch "https://github.com"  # URL metadata
bmobot ua parse "Mozilla/5.0..."        # Parse user agent
```

## All Services

| Service | Description |
|---------|-------------|
| `hash` | SHA, MD5, HMAC, encoding, UUIDs, random |
| `uuid` | UUID v4/v7, ULID, decode, validate |
| `json` | Format, minify, validate, diff, flatten, query |
| `qr` | QR codes (terminal, SVG, PNG, base64) |
| `password` | Passwords, passphrases, PINs, strength check |
| `cron` | Parse expressions, next runs, presets |
| `text` | Case conversion, slug, count, extract, lorem |
| `color` | Convert, palette, contrast, mix, name |
| `regex` | Test, explain, replace, validate |
| `jwt` | Decode, verify, generate, inspect |
| `semver` | Parse, compare, sort, bump |
| `csv` | CSV to/from JSON, stats, filter, sort |
| `email` | Validate, MX, disposable, typo suggest |
| `encode` | Base32/58, morse, braille, NATO, punycode |
| `ip` | Validate, CIDR, subnet, range check |
| `time` | Current time, timezone convert, diff, add |
| `md` | Markdown to HTML, TOC, links, stats |
| `yaml` | YAML/TOML to/from JSON, validate |
| `diff` | Unified, word, char diff, patch, merge |
| `sql` | Format, minify, validate, extract |
| `status` | HTTP status code lookup, search |
| `ascii` | Figlet, box, banner, table, tree |
| `lorem` | Paragraphs, sentences, words, lists |
| `glob` | Test, explain, generate patterns |
| `convert` | Number base, data, length, weight, temp |
| `faker` | Person, address, company, finance |
| `meta` | URL metadata (OG, favicons, etc) |
| `ua` | User agent parsing, feature detection |

## API Documentation

All APIs are free and require no authentication.

- Browse: [bmobot.ai/apis](https://bmobot.ai/apis)
- Interactive playgrounds: `https://{service}.bmobot.ai`
- OpenAPI specs: `https://{service}.bmobot.ai/openapi.json`
- Swagger docs: `https://{service}.bmobot.ai/docs`

## License

MIT
