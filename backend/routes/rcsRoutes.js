const express = require("express");
const router = express.Router();

const { getExternalTemplates } = require("../services/rcsService");

// GET /api/rcs/templates?custId=7
router.get("/templates", async (req, res) => {
  try {
    const custId = Number(req.query.custId || 7);
    const data = await getExternalTemplates(custId);
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/rcs/templates/external?custId=7
router.get("/templates/external", async (req, res) => {
  try {
    const custId = req.query.custId || 7;
    const data = await getExternalTemplates(custId);

    // ? map to UI format
    const list = (data || []).map(t => ({
      id: t.Id,
      name: t.TemplateName,
      ...t
    }));

    return res.json({ success: true, data: list });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
