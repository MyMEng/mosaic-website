var express = require('express'),
  router = express.Router(),
  uuid = require('node-uuid'),
  
  google = require('googleapis'),
  OAuth2Client = google.auth.OAuth2,
  
  azure = require('azure-storage'),
  queueSvc = azure.createQueueService(),              
  blobSvc = azure.createBlobService(),
  tableSvc = azure.createTableService(),
  User = require("../models/user"),
  UsersLists = require("../controllers/users");


// Client ID and client secret are available at
// https://code.google.com/apis/console
var CLIENT_ID = process.env.CLIENT_ID;
var CLIENT_SECRET = process.env.CLIENT_SECRET;
var REDIRECT_URL = process.env.REDIRECT_URI;
var oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);

// Initialize model
var userModel = new User(tableSvc, "users", "allusers");

// Set up controller
var users = new UsersLists(userModel);

module.exports = function (app) {
  app.use('/', router);
};

// All users
router.get('/users', function (req, res) {
  
  if(!req.session.user) {
    res.redirect("/login");
    return;
  }

	users.showUsers(req, res);
});


router.get("/login", function(req,res) {
  
  // generate a url that asks permissions for Google+ and Google Calendar scopes
  var scopes = [
    'https://www.googleapis.com/auth/plus.me',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  var url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // 'online' (default) or 'offline' (gets refresh_token)
    scope: scopes // If you only need one scope you can pass it as string
  });


  // Go to the generated url
  res.redirect(url);

});

router.get("/logout", function(req, res) {
  if(req.session.user) {
    req.session.user = null;
  }
  res.redirect("/");
});
