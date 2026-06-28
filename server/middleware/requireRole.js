// Usage: router.post("/", requireRole("manager"), handler)
// Usage: router.put("/:id", requireRole("manager", "worker"), handler)
module.exports = function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = req.user?.role === "worker" ? "worker" : "manager";
    if (!roles.includes(userRole)) {
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    }
    next();
  };
};
