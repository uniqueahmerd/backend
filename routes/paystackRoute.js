app.post("/api/paystack/callback", async (req, res) => {
  const { reference } = req.body;

  try {
    // Verify the payment with Paystack
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (response.data.data.status === "success") {
      // Update the user's wallet balance
      const userId = response.data.data.metadata.userId;
      const amount = response.data.data.amount / 100; // Convert back to the original amount
      await userModel.findByIdAndUpdate(userId, {
        $inc: { wallet: amount },
      });

      res.status(200).json({ success: true, message: "Payment verified" });
    } else {
      res.status(400).json({ success: false, message: "Payment failed" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Verification error" });
  }
});
