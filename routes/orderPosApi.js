const express = require('express');
const router = express.Router();
const { validateSecret } = require('../Middlewares/tokenSecret')
const {StateOrders } = require('../Functions/functions')
const secret_name = 'orderPosApiToken'

// router.get('/orders', validateSecret(secret_name), async (req, res) => {
//     try {
//         const { orders, totalOrders } = await findStateOrders(req.query)
//         res.status(200).json({ orders, totalOrders });
//     } catch (err) {
//         res.status(500).json({ message: 'Internal server error' });
//     }
// });

router.post("/login", async (req, res) => {
    try {
      const { username, password } = req.body;
  
      // Find user
        let user = null
       if (username === 'admin') user = { _id: '43545345ddf'}
      if (!user) return res.status(400).json({ message: "Invalid credentials" });
  
      // Check password
    //   const isMatch = await bcrypt.compare(password, user.password);
    //   if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });
  
      // Generate JWT token
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET|| 'testJWTSecret');
  
      res.json({ token });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  router.get("/protected", authMiddleware, (req, res) => {
    res.json({ message: "This is a protected route" });
  });
  
  // Middleware to Verify JWT Token
  function authMiddleware(req, res, next) {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ message: "Access denied" });
  
    try {
      const verified = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET|| 'testJWTSecret');
      req.user = verified;
      next();
    } catch (error) {
      res.status(400).json({ message: "Invalid token" });
    }
  }





module.exports = router;
