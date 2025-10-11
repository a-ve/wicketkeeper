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
  const { wicketkeeper_response } = req.body;

  console.log("Form payload:", req.body);

  if (!wicketkeeper_response) {
    return res.status(400).send("⚠️ Missing Wicketkeeper solution");
  }

  // optional, but you can catch this error earlier
  let token: string, nonce: string, response: string
  try {
    ({ token, nonce, response } = JSON.parse(wicketkeeper_response));
  } catch {
    return res.status(400).send("⚠️ Invalid Wicketkeeper payload");
  }

  // Post as json (content-type: application/json)
  const body = { token, nonce, response }; // all fields
  // const body = { response: wicketkeeper_response }; // or only response
  // Post as formData (content-type: application/x-www-form-urlencoded)
  // const body = new URLSearchParams({ token, nonce, response }); // all fields
  // const body = new URLSearchParams({ response: wicketkeeper_response }); // or only response
  let postResponse: any
  try {
    postResponse = await axios.post(VERIFY_URL, body);
    console.log(`verification response: ${JSON.stringify(postResponse.data)}`);
  } catch (err: any) {
    postResponse = err.response || { status: 500, data: err }
    console.error("Verification error:", err.response?.data || err.message);
  }
  if (postResponse.data.success) {
    return res.send("✅ Successful");
  }
  return res.status(postResponse.status).send(postResponse.data);
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
