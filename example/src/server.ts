import express, { Request, Response } from "express";
import path from "path";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 8081;

const publicDir = path.join(__dirname, "../public");
app.use(express.static(publicDir));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const VERIFY_URL =
  process.env.VERIFY_URL || "http://localhost:8080/v0/siteverify";

app.post("/submit", async (req: Request, res: Response) => {
  const { name, email, wicketkeeper_response } = req.body;

  console.log("Form payload:", req.body);

  if (!wicketkeeper_response) {
    return res.status(400).send("⚠️ Missing Wicketkeeper solution");
  }

  let solution: { token: string; nonce: number; response: string };
  try {
    solution = JSON.parse(wicketkeeper_response);
  } catch {
    return res.status(400).send("⚠️ Invalid Wicketkeeper payload");
  }

  try {
    const verifyRes = await axios.post(VERIFY_URL, solution, {
      headers: { "Content-Type": "application/json" },
    });

    console.log(`verification response: ${JSON.stringify(verifyRes.data)}`);

    if (!verifyRes.data || verifyRes.data.success !== true) {
      console.warn("Wicketkeeper verify failed:", verifyRes.data);
      return res.status(400).send("🚫 Wicketkeeper verification failed");
    }
  } catch (err: any) {
    console.error("Verification error:", err.response?.data || err.message);
    return res.status(500).send("❌ Verification service error");
  }

  console.log("✅ Form received:", { name, email });
  res.send(`Thanks, ${name}! We've received your email (${email}).`);
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
