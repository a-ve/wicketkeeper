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

function fastProcessTask() {
  return function () {
    const sha256 = (text) => {
      const encoded = new TextEncoder().encode(text);
      return crypto.subtle.digest("SHA-256", encoded.buffer);
    };

    function uint8ArrayToHexString(arr) {
      return Array.from(arr)
        .map((c) => c.toString(16).padStart(2, "0"))
        .join("");
    }

    addEventListener("message", async (event) => {
      let data = event.data.data;
      let difficulty = event.data.difficulty;
      let nonce = event.data.nonce;
      const threads = event.data.threads;
      const threadId = nonce;
      let hash;

      while (true) {
        const currentHash = await sha256(data + nonce);
        const thisHash = new Uint8Array(currentHash);
        let valid = true;

        for (let j = 0; j < difficulty; j++) {
          const byteIndex = Math.floor(j / 2);
          const nibbleIndex = j % 2;
          const nibble =
            (thisHash[byteIndex] >> (nibbleIndex === 0 ? 4 : 0)) & 0x0f;
          if (nibble !== 0) {
            valid = false;
            break;
          }
        }

        if (valid) {
          hash = uint8ArrayToHexString(thisHash);
          break;
        }

        const old = nonce;
        nonce += threads;
        if ((nonce > old) | 1023 && (nonce >> 10) % threads === threadId) {
          postMessage(nonce);
        }
      }

      postMessage({ hash, data, difficulty, nonce });
    });
  }.toString();
}

function fastProcessMain(
  data,
  difficulty,
  signal = null,
  progressCallback = null,
  threads = navigator.hardwareConcurrency || 1
) {
  console.log("fast algo process main");
  return new Promise((resolve, reject) => {
    const blob = new Blob(["(", fastProcessTask(), ")()"], {
      type: "application/javascript",
    });
    const url = URL.createObjectURL(blob);
    const workers = [];

    const terminateAll = () => {
      workers.forEach((w) => w.terminate());
      URL.revokeObjectURL(url);
      if (signal) {
        signal.removeEventListener("abort", terminateAll);
        if (signal.aborted) reject(new Error("PoW aborted"));
      }
    };

    if (signal) signal.addEventListener("abort", terminateAll, { once: true });

    let resolved = false;
    for (let i = 0; i < threads; i++) {
      const w = new Worker(url);
      w.onmessage = (e) => {
        if (resolved) return;
        if (typeof e.data === "number") {
          progressCallback?.(e.data);
        } else {
          resolved = true;
          terminateAll();
          resolve(e.data);
        }
      };
      w.onerror = (err) => {
        if (resolved) return;
        resolved = true;
        terminateAll();
        reject(err);
      };
      w.postMessage({ data, difficulty, nonce: i, threads });
      workers.push(w);
    }
  });
}

/**
 * Performs a fast, multi-threaded proof-of-work solve.
 * @param {{challenge: string, difficulty: number}} opts
 * @returns {Promise<{nonce: string, response: string}>}
 */
export async function solver({ challenge, difficulty }) {
  console.log("Using FAST PoW solver");
  const result = await fastProcessMain(challenge, difficulty, null, null);
  return { nonce: result.nonce.toString(), response: result.hash };
}
