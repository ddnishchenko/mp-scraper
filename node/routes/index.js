var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  let model
  if (req.query.model) {
    model = `/bundle/showcase.html?m=${req.query.model}&play=1`
  }
  res.render('index', { title: 'Express', model });
});

module.exports = router;
