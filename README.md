# oh-my-fishu mono: several weekend projects

(of course, i bring that idea from pi-mono but for myself.)

## Structure

```
omfsh-mono/
├── packages/
│   ├── omfsh-agent/
│   └── omfsh-darwin/
├── package.json       # root workspace
├── bun.lock
└── tsconfig.json
```

## Usage

```bash
bun install
bun --filter omfsh-agent build
```
