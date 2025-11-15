# ▌▌▌ wicketkeeper - client

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A client-side implementation for the **Wicketkeeper** proof-of-work (PoW) captcha system. This package provides a simple, embeddable widget that performs the PoW challenge in the user's browser, eliminating the need for traditional, often frustrating, captcha puzzles.

Wicketkeeper is designed to be a privacy-friendly and user-centric alternative to services like reCAPTCHA. It verifies the user's device by making it solve a small computational puzzle, proving that it's likely not a simple bot.

## How It Works

1.  **Placement**: The Wicketkeeper widget is placed within a form on your website.
2.  **User Interaction**: The user clicks the "Verify you are human" button.
3.  **Challenge Request**: The client fetches a unique cryptographic challenge from your server's challenge endpoint.
4.  **Proof-of-Work**: The user's browser, using Web Workers, finds a `nonce` that, when combined with the challenge, produces a hash with a specific number of leading zeros (the `difficulty`). This process is computationally intensive and difficult for simple bots to perform at scale.
5.  **Solution Handling**: Once solved, the client populates a hidden `<input>` field in your form with a JSON string containing the solution.
6.  **Server Verification**: Your form is submitted. Your server-side code then validates the solution to grant or deny the request. (Note: The server-side verification logic is not part of this client package).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- npm or yarn

### Installation & Building

1.  **Clone the repository and install dependencies:**

    ```bash
    git clone https://github.com/a-ve/wicketkeeper.git
    cd wicketkeeper/client
    npm install
    ```

2.  **Build the client script:**

    You can build the client with either the `fast` (default) or `slow` solver. The output will be a single file: `dist/fast.js` or `dist/slow.js`.

    - **For the fast, multi-threaded solver (Recommended):**

      ```bash
      npm run build:fast
      ```

    - **For the slow, single-threaded solver:**
      ```bash
      npm run build:slow
      ```

### Configuring the Challenge URL

The client needs to know where to fetch the PoW challenge. By default, it points to `http://localhost:8080/v0/challenge`. You should override this at build time with your own endpoint.

Pass the `CHALLENGE_URL` environment variable to the build script:

```bash
CHALLENGE_URL='https://api.your-domain.com/captcha/challenge' npm run build:fast
```

## Usage

After building the client, include it in your HTML file and add the widget to your form.

### 1. Include the Script

Place the script tag at the end of your `<body>`.

```html
<script src="path/to/dist/fast-or-slow.js"></script>
```

### 2. Add the Widget to Your Form

Add a `<div>` with the class `.wicketkeeper` inside your form. The script will automatically find and initialize it.

You can configure it using `data-*` attributes:

- `data-input-name`: (Optional) Sets the `name` attribute of the hidden input field. Defaults to `wicketkeeper_solution`.
- `data-challenge-url`: (Optional) Overrides the challenge URL that was compiled into the script. Useful for testing or dynamic environments.

**Example:**

```html
<form action="/submit-comment" method="post">
  <label for="comment">Your Comment:</label>
  <textarea id="comment" name="comment"></textarea>

  <!-- Wicketkeeper widget -->
  <div
    class="wicketkeeper"
    data-input-name="captcha_solution"
    data-challenge-url="http://localhost:8080/v0/challenge"
  ></div>

  <button type="submit">Post Comment</button>
</form>
```

## Customization

### Styling

The widget's CSS is bundled directly into the generated client. It includes support for dark mode via the `prefers-color-scheme: dark` media query.

To force dark mode, you can add the `.wk-dark` class to the widget or a parent element.

```html
<body class="wk-dark">
  <!-- All wicketkeeper widgets inside will use dark theme -->
  <div class="wicketkeeper"></div>
</body>

<!-- Or apply directly -->
<div class="wicketkeeper wk-dark"></div>
```

You can override the default styles with your own CSS by targeting the `.wicketkeeper` classes.

## Acknowledgements

The proof-of-work solver algorithms (`fast.js` and `slow.js`) are modified versions of the excellent work done in the [TecharoHQ/anubis](https://github.com/TecharoHQ/anubis) project.
