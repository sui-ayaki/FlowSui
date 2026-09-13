# About FlowSUi

This project is built with React, TypeScript, and Vite.

## Usage & Commercial Projects

You are free to use, modify, and redistribute this software in accordance with the terms of the MIT License.

If you use this software in a public project, commercial product, plugin, or other published work, I would greatly appreciate it if you let me know.

There is no obligation to contact me, but I would genuinely love to see how my work is being used. I may also feature or share interesting projects with appropriate credit, with the author's permission.

If you use this project in a commercial product, you are not required to share any revenue with me under this license.

Please retain the original copyright notice and license when redistributing this software or substantial portions of it, as required by the MIT License.

## Maintenance

This project is provided as-is.

It may not receive regular updates or maintenance. Compatibility with future versions of the target software is not guaranteed.

## Contributing

Feel free to fork, modify, or build upon this project under the terms of the MIT License.

If you make improvements or fixes that you think would benefit the project, pull requests are very welcome. There is no guarantee that every contribution will be merged, but I would be happy to review them.


---

## Development

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

* [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
* [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific rules:

```js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
```

