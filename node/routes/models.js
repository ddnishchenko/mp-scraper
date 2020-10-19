var express = require('express');
var fs = require('fs');
var path = require('path');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/', function(req, res, next) {
    var dir = path.join(__dirname, '..', 'assets', 'img');
    res.send('respond with a resource');

    fs.writeFile();
});



module.exports = router;
