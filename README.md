# spine-viewer

[![.github/workflows/deploy.yml](https://github.com/noobiesgs/spine-viewer/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/noobiesgs/spine-viewer/actions/workflows/deploy.yml)

All files will not be uploaded to the Internet and will be processed locally. 

This website is made for personal hobby use. 

This website is provided 'as is' and your use of this website is entirely at your own risk.

![main_ui](/docs/Snipaste_main_ui.png)

## Quick Start

https://noobiesgs.github.io/spine-viewer/


## About Source Code
### Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin).

### Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin) to make the TypeScript language service aware of `.vue` types.

If the standalone TypeScript plugin doesn't feel fast enough to you, Volar has also implemented a [Take Over Mode](https://github.com/johnsoncodehk/volar/discussions/471#discussioncomment-1361669) that is more performant. You can enable it by the following steps:

1. Disable the built-in TypeScript Extension
    1) Run `Extensions: Show Built-in Extensions` from VSCode's command palette
    2) Find `TypeScript and JavaScript Language Features`, right click and select `Disable (Workspace)`
2. Reload the VSCode window by running `Developer: Reload Window` from the command palette.

### Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

### Project Setup

```sh
pnpm install
```

#### Compile and Hot-Reload for Development

```sh
pnpm run dev
```

#### Type-Check, Compile and Minify for Production

```sh
pnpm run build
```

#### Lint with [ESLint](https://eslint.org/)

```sh
pnpm run lint
```
