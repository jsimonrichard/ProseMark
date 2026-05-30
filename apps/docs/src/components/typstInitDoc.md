A _"What You See Is What You Mean"_ editor like **Typora** or **Obsidian**, built on top of [**CodeMirror 6**](https://codemirror.net/).

This page uses **`@prosemark/typst`** (not MathJax). Math bodies use **Typst** syntax inside `$…$` / `$$…$$`.

## Features

Basic formatting including _italics_, **bold text**, `code spans`, and ~~strike throughs~~.

### Typst math

Inline: Euler's identity $e^(i pi) + 1 = 0$.

Display:

$$
integral_(-infinity)^infinity e^(-x^2) dif x = sqrt(pi)
$$

### Code Fences (with Syntax Highlighting)

```jsx
export default function MyComponent() {
  return <div style="text-align: center">Some centered text</div>;
}
```

## Credits

Made by Simon Richard (https://jsimonrichard.com)
