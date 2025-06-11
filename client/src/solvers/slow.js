/*
 * This file contains a modified version of the proof-of-work solver from the Anubis project.
 * The original source can be found at: https://github.com/TecharoHQ/anubis
 *
 * The original work is licensed under the MIT License.
 * Copyright (c) 2025 Xe Iaso <me@xeiaso.net>
 *
 * ---
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2025 Xe Iaso <me@xeiaso.net>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

function slowProcessTask() {
  return function () {
    const sha256 = (text) => {
      const encoded = new TextEncoder().encode(text);
      return crypto.subtle.digest("SHA-256", encoded.buffer).then((buf) =>
        Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
      );
    };

    addEventListener("message", async (event) => {
      const data = event.data.data;
      const difficulty = event.data.difficulty;
      let nonce = 0;
      let hash;
      const prefix = "0".repeat(difficulty);

      do {
        if ((nonce & 1023) === 0 && nonce > 0) postMessage(nonce);
        hash = await sha256(data + nonce++);
      } while (!hash.startsWith(prefix));

      nonce--;
      postMessage({ hash, data, difficulty, nonce });
    });
  }.toString();
}

function slowProcessMain(
  data,
  difficulty,
  signal = null,
  progressCallback = null
) {
  console.log("slow algo process main");
  return new Promise((resolve, reject) => {
    const blob = new Blob(["(", slowProcessTask(), ")()"], {
      type: "application/javascript",
    });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    const terminate = () => {
      worker.terminate();
      URL.revokeObjectURL(url);
      if (signal) {
        signal.removeEventListener("abort", terminate);
        if (signal.aborted) reject(new Error("PoW aborted"));
      }
    };

    if (signal) signal.addEventListener("abort", terminate, { once: true });

    worker.onmessage = (e) => {
      if (typeof e.data === "number") {
        progressCallback?.(e.data);
      } else {
        terminate();
        resolve(e.data);
      }
    };
    worker.onerror = (err) => {
      terminate();
      reject(err);
    };

    worker.postMessage({ data, difficulty });
  });
}

/**
 * Performs a slow, single-threaded proof-of-work solve.
 * @param {{challenge: string, difficulty: number}} opts
 * @returns {Promise<{nonce: string, response: string}>}
 */
export async function solver({ challenge, difficulty }) {
  console.log("Using SLOW PoW solver");
  const result = await slowProcessMain(challenge, difficulty, null, null);
  return { nonce: result.nonce.toString(), response: result.hash };
}
