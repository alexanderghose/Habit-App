var express = require('express');
var router = express.Router();
const passport = require('passport');
const { route } = require('./habits');

/* GET home page. */
router.get('/', function(req, res, next) {
  req.logout();
  res.redirect('/users');
});

router.get('/auth/google', passport.authenticate(
  'google',
  { scope: ['profile', 'email'] }
));

router.get('/oauth2callback', function(req, res, next) {
  passport.authenticate('google', 
    function(err, user, info) {
      if (err) { return next(err); }
      if (!user) { 
        return res.redirect('/users'); 
      }
      req.logIn(user, function(err) {
        if (err) { 
          return next(err); 
        }
        console.log("resetting time zone")
        return res.redirect('/users');
      });
    }
  )(req, res, next);
});

router.get('/logout', function(req, res){
  req.logout();
  res.redirect('/users');
});

router.get('/debug', function(req, res){
  if (req.user) {
    res.render('debug.ejs', {user:req.user})
  } else {
    res.redirect('/users')
  }
});

module.exports = router;
