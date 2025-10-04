const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");
//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
// POST /ai/symptom-check
router.post("/ask", aiController.symptomCheck);

module.exports = router;
