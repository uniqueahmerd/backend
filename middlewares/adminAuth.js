import jwt from "jsonwebtoken";

const adminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Extract token from "Bearer <token>"
    console.log("Authorization header:", req.headers.authorization);

    if (!token) {
      console.warn("Token is missing");
      return res
        .status(403)
        .json({ success: false, message: "Authorization token is required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY); // Verify token
    console.log("Decoded token:", decoded);

    // Verify the role and email from the decoded token
    if (decoded.role !== "admin" || decoded.email !== process.env.ADMIN_EMAIL) {
      console.warn("Invalid admin credentials");
      return res
        .status(403)
        .json({ success: false, message: "Access denied: Admins only" });
    }

    req.admin = decoded; // Attach admin details to the request
    next();
  } catch (error) {
    console.error("Authorization error:", error);
    return res
      .status(403)
      .json({ success: false, message: "Invalid or expired token" });
  }
};

export default adminAuth;
