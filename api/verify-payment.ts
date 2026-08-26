import crypto from "crypto";

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Missing required signature fields" });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    console.error("Razorpay API secret missing in backend");
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature === razorpay_signature) {
      return res.status(200).json({ success: true, message: "Payment verified successfully" });
    } else {
      return res.status(400).json({ success: false, error: "Invalid signature" });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(500).json({ error: "Failed to verify payment" });
  }
}
