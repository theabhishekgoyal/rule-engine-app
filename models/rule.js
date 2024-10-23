const mongoose = require('mongoose');

const nodeSchema = new mongoose.Schema({
  type: { type: String, required: true },  // operator or operand
  value: { type: String },                 // value if operand
  left: { type: mongoose.Schema.Types.Mixed }, // reference to left node (child)
  right: { type: mongoose.Schema.Types.Mixed }, // reference to right node (child)
});

const ruleSchema = new mongoose.Schema({
  rule_string: { type: String, required: true },
  ast: nodeSchema,  // store AST for each rule
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Rule', ruleSchema);
