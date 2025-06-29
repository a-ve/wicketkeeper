# Frontend Widget

::: tip Bundled Client Widgets in Docker
When you build and run Wicketkeeper using the provided `docker-compose.yaml`, you don't need to handle the client-side widget separately. Both the `fast` and `slow` versions are automatically built and included inside the final container.

The Go server is configured to serve them from a static path. You can include your desired version directly in your application's HTML:

```html
<!-- For the recommended multi-threaded solver -->
<script src="http://your-wicketkeeper-host/fast.js"></script>

<!-- Or for the single-threaded solver -->
<script src="http://your-wicketkeeper-host/slow.js"></script>
```

This is the easiest way to get started. You should only follow the manual client build process if you need to customize its source code or hardcode a different `CHALLENGE_URL` at build time.
:::

The Wicketkeeper frontend widget is a lightweight, dependency-free JavaScript module that handles the entire client-side Proof-of-Work (PoW) process. It is designed to be easy to integrate into any standard HTML form.

## Overview

The widget's responsibilities include:

1.  Rendering a user-facing button within your form.
2.  Fetching a PoW challenge from the Wicketkeeper server when the user interacts with it.
3.  Using Web Workers to solve the challenge efficiently in the background without freezing the browser.
4.  Placing the resulting solution into a hidden `<input>` field.
5.  Providing visual feedback to the user (loading, success, error states).

## Integration

Integrating the widget into your website involves two simple steps.

### Step 1: Build and Include the Script

First, you need to build the client script from the source. The build process bundles all necessary JavaScript and CSS into a single file.

1.  **Navigate to the `client` directory:**
    ```bash
    cd client/
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Build the script:**
    You must provide the URL of your Wicketkeeper server's challenge endpoint during the build.

    ```bash
    # Replace the URL with your actual production endpoint
    # You can use `npm run build:fast` or `npm run build:slow` to build the solver of your choice.
    CHALLENGE_URL='https://captcha.your-domain.com/v0/challenge' npm run build:fast
    ```

    This command creates the file `dist/fast.js`.

4.  **Include the script in your HTML:**
    Copy the generated client to your website's assets and include it with a `<script>` tag, preferably at the end of the `<body>`.

    ```html
    <script defer src="/path/to/fast-or-slow.js"></script>
    ```

### Step 2: Add the Widget to a Form

The script automatically finds and initializes any `<div>` element with the class `.wicketkeeper`.

Place this `div` inside your form where you want the captcha to appear.

```html
<form action="/submit" method="POST">
  <label for="name">Name:</label>
  <input type="text" id="name" name="name" required />

  <label for="email">Email:</label>
  <input type="email" id="email" name="email" required />

  <!-- Add the Wicketkeeper widget here -->
  <div class="wicketkeeper"></div>

  <button type="submit">Submit</button>
</form>
```

## Configuration

You can configure the widget using `data-*` attributes on the `<div>` element.

| Attribute            | Description                                                                                                | Default                                |
| :------------------- | :--------------------------------------------------------------------------------------------------------- | :------------------------------------- |
| `data-input-name`    | The `name` attribute for the hidden input field that will hold the solution JSON.                          | `wicketkeeper_solution`                |
| `data-challenge-url` | Overrides the challenge URL that was compiled into the script. Useful for testing or dynamic environments. | The `CHALLENGE_URL` set at build time. |

**Example with custom configuration:**

```html
<div
  class="wicketkeeper"
  data-input-name="my_captcha_response"
  data-challenge-url="http://localhost:8080/v0/challenge"
></div>
```

Upon successful completion, this widget would create a hidden input like this:
`<input type="hidden" name="my_captcha_response" value='{"token": "...", "nonce": ..., "response": "..."}'>`

## Customization

### Styling & Dark Mode

The widget's CSS is bundled directly into the JavaScript file. It includes styles for light and dark modes.

- **Automatic Dark Mode**: The widget respects the user's system preference via the `prefers-color-scheme: dark` media query.
- **Forced Dark Mode**: To force the dark theme regardless of user preference, add the `.wk-dark` class to the widget itself or any of its parent elements (like `<body>`).

```html
<!-- Force dark mode on a specific widget -->
<div class="wicketkeeper wk-dark"></div>

<!-- Force dark mode for the entire page -->
<body class="wk-dark">
  <form>
    <div class="wicketkeeper"></div>
  </form>
</body>
```

You can always override the default styles with your own CSS by targeting the `.wicketkeeper` classes with higher specificity.

### Solver Algorithm

The client can be built with two different PoW solver algorithms:

- **Fast (Recommended)**: A multi-threaded solver that uses Web Workers to parallelize the work, leveraging multiple CPU cores. This is the default and provides the best user experience.
  ```bash
  npm run build:fast
  ```
- **Slow**: A single-threaded solver that runs in a single Web Worker. It is less performant but may be used as a fallback.
  ```bash
  npm run build:slow
  ```

## JavaScript API

For advanced use cases, the widget exposes a global `window.wicketkeeperCaptcha` object.

### `wicketkeeperCaptcha.render(element, options)`

Manually renders a widget on a given DOM element. This is useful for single-page applications where elements are added to the DOM dynamically.

- `element`: The container `<div>` to render the widget in.
- `options` (optional): An object with configuration properties.
  - `inputName`: String, corresponds to `data-input-name`.
  - `endpoints.challenge`: String, corresponds to `data-challenge-url`.
  - `onSolved`: A callback function that receives the solution object.
  - `onError`: A callback function that receives an error object.

### `wicketkeeperCaptcha.reset(element)`

Manually resets a widget to its initial state.

- `element`: The widget's container `<div>` element that you want to reset.

```javascript
// Example of manual rendering and reset
const captchaContainer = document.getElementById("my-captcha");

wicketkeeperCaptcha.render(captchaContainer, {
  inputName: "my_solution",
  onSolved: (solution) => {
    console.log("Captcha solved!", solution);
  },
});

// To reset it later
document.getElementById("reset-button").addEventListener("click", () => {
  wicketkeeperCaptcha.reset(captchaContainer);
});
```
