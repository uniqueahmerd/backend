import jwt from "jsonwebtoken";

const userAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res
        .status(403)
        .json({ success: false, message: "Not Authorized. Login Again." });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    return res
      .status(403)
      .json({ success: false, message: "Not Authorized. Login Again." });
  }
};

export default userAuth;
