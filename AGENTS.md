# `AGENTS.md`: Development rules

## Prerequisites
Please read the `README.md` of each module in this project when you're starting:
- `@2na3k/omfsh-provider`: The centralized providers, and behavior of those providers
- `@2na3k/omfsh-darwin`: The core agent framework
- `@2na3k/omfsh-code`: The Claude Code of Fish

## Overall rules
- KEEP ALL THE SWEAR WORDS COMMENTS I HAVE

## Development loop
Must follow, only break the loop if user asked for it
```
1. Build features
2. Write unit test(s) for the change
3. Run unit tests and smoke tests (if needed)
4. Lint + format code (eslint)
```

## Answer style
- Keep it short and concise

## Planning mode
For the planning, after finalizing the plan, it should be put into `./plans` for further implementation 

## Typescript rules overall
- No `any` type using in the repo
- NEVER use inline import, no import("pkg").Type in type positions, no dynamic imports for types. Always use standard top-level imports.
- Check the deps in the `node_modules` when dealing with external dependencies, don't try to guess the interfaces.
- Stop using `createProvider` in the application.

## Front-end rules
