const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");

exports.Login = async (req, res) => {
  console.log("Login request body:", req.body);
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        status: false,
        message: "Email and password are required",
      });
    }
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ status: false, message: "Invalid credentials" });
    }
    // Correct way to query for touristic site admin
    let touristicSite = null;
    if (user.role === "SITE_ADMIN") {
      touristicSite = await prisma.touristicSite.findFirst({
        where: {
          admin: {
            userId: user.id, // Query the admin relation properly
          },
        },
        include: {
          admin: {
            include: {
              user: true,
            },
          },
        },
      });
    }

    res.status(200).json({
      status: true,
      message: "Login successful",
      user: user,
      site: user.role === "SITE_ADMIN" ? touristicSite : null,
      isOk: true,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};
