const express = require('express');
const router = express.Router();
const Rule = require('../models/rule');

// Function to create AST from rule string (supports nested rules)
const parseRuleString = (ruleStr) => {
  // Tokenize the input string to handle operators, operands, and parentheses
  const tokenize = (str) => {
    return str.match(/(\(|\)|AND|OR|[a-zA-Z]+\s*[><=]\s*[\w\d'"]+)/g);
  };

  // Function to build an AST from the tokens
  const buildAST = (tokens) => {
    let stack = [];
    let current = { type: 'operator', value: null, left: null, right: null };

    tokens.forEach((token) => {
      if (token === '(') {
        // Push the current node onto the stack and start a new current node
        stack.push(current);
        current = { type: 'operator', value: null, left: null, right: null };
      } else if (token === ')') {
        // Pop from the stack and attach the current node as a child
        let node = current;
        current = stack.pop();
        if (!current.left) current.left = node;
        else current.right = node;
      } else if (token === 'AND' || token === 'OR') {
        // Set the current operator
        current.value = token;
      } else {
        // It's an operand (e.g., "age > 30")
        let operandNode = { type: 'operand', value: token };
        if (!current.left) current.left = operandNode;
        else current.right = operandNode;
      }
    });

    return current;
  };

  const tokens = tokenize(ruleStr);
  if (!tokens) {
    throw new Error('Invalid rule format');
  }
  const ast = buildAST(tokens);
  return ast;
};

// Function to evaluate AST against user data
// Function to evaluate AST against user data
const evaluateAST = (node, data) => {
  if (!node || !node.value) {
    return false; // In case the node is null, undefined, or doesn't have a value
  }

  if (node.type === 'operand') {
    // Extract field, operator, and value from the operand (e.g., "age > 30")
    const parts = node.value.split(/\s+/);
    if (parts.length < 3) {
      return false; // Invalid operand format, should be "field operator value"
    }

    let [field, operator, value] = parts;
    value = value ? value.replace(/['"]/g, '') : null; // Remove quotes if present

    if (!data.hasOwnProperty(field)) {
      return false; // If the data doesn't have the field, return false
    }

    // Perform the evaluation based on the operator
    switch (operator) {
      case '>':
        return data[field] > Number(value);
      case '<':
        return data[field] < Number(value);
      case '=':
        return data[field] == value;
      default:
        return false; // Unsupported operator
    }
  }

  if (node.type === 'operator') {
    // Recursively evaluate the left and right children
    const leftResult = evaluateAST(node.left, data);
    const rightResult = evaluateAST(node.right, data);

    // Evaluate based on the operator type (AND/OR)
    if (node.value === 'AND') {
      return leftResult && rightResult;
    } else if (node.value === 'OR') {
      return leftResult || rightResult;
    } else {
      return false; // Unsupported operator type
    }
  }

  return false; // If node type is not recognized
};


// POST: Create rule and store in MongoDB
router.post('/create', async (req, res) => {
  const { rule_string } = req.body;

  // Check if the rule_string is provided
  if (!rule_string) {
    return res.status(400).send('Rule string is required.');
  }

  try {
    // Parse the rule string to generate an AST or validate it
    const ast = parseRuleString(rule_string); // Ensure this function is working as expected

    // Create a new rule instance
    const newRule = new Rule({ rule_string, ast });

    // Save the rule to the database
    await newRule.save();

    // Respond with the created rule
    res.status(201).json(newRule);
  } catch (err) {
    console.error(err);
    res.status(400).send('Error creating rule: ' + err.message);
  }
});


// PUT: Update an existing rule
router.put('/update/:id', async (req, res) => {
  const { id } = req.params;
  const { rule_string } = req.body;
  
  try {
    // Parse the new rule string to create a new AST
    const ast = parseRuleString(rule_string);

    // Find the rule by ID and update it
    const updatedRule = await Rule.findByIdAndUpdate(id, { rule_string, ast }, { new: true });
    
    if (!updatedRule) {
      return res.status(404).send('Rule not found');
    }

    res.json(updatedRule);
  } catch (err) {
    console.error('Error updating rule:', err);
    res.status(500).send('Error updating rule');
  }
});


// GET: Fetch all rules
router.get('/all', async (req, res) => {
  try {
    const rules = await Rule.find();
    res.json(rules);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching rules');
  }
});

// Add route to fetch unique departments
router.get('/departments', async (req, res) => {
  try {
    const rules = await Rule.find();
    const departments = new Set();

    // Extract department values from rule strings
    rules.forEach(rule => {
      const match = rule.rule_string.match(/\bdepartment\s*=\s*['"](\w+)['"]/i);
      if (match) {
        departments.add(match[1]); // Add the department name to the set
      }
    });

    res.json(Array.from(departments)); // Convert the set to an array and send it as JSON
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).send('Error fetching departments');
  }
});


// POST: Evaluate rule with user data
router.post('/evaluate', async (req, res) => {
  const { ruleId, userData } = req.body;
  try {
    const rule = await Rule.findById(ruleId);
    if (!rule) return res.status(404).send('Rule not found');

    const result = evaluateAST(rule.ast, userData);
    res.json({ eligible: result });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error evaluating rule');
  }
});

module.exports = router;
