##### Reported sizes of the files in `/dist/assets` folder:

| File | Size | Gzip Size |
| ---- | -------------|------|
| dist/assets/react-CHdo91hT.svg | 4.13 kB | gzip:  2.05 kB |
| dist/assets/dev-Bx9V9zN2.css |  0.48 kB | gzip:  0.31 kB |
| dist/assets/index-BPvgi06w.css |  0.92 kB | gzip:  0.50 kB |
| dist/assets/index-BfVVFAQx.js |  0.93 kB | gzip:  0.53 kB |
| dist/assets/dev-BU6OOgR1.js |  0.99 kB | gzip:  0.52 kB |
| dist/assets/preset-fwREPr4w.js |  33.73 kB | gzip: 11.47 kB |
| dist/assets/react-B6atbj9n.js |  141.77 kB | gzip: 45.43 kB |

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
}
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
