var express = require('express'),
  router = express.Router(),
  Article = require('../models/article'),
  multiparty = require('multiparty'),
  uuid = require('node-uuid'),
  google = require('googleapis'),

  azure = require('azure-storage'),
  queueSvc = azure.createQueueService(),              
  blobSvc = azure.createBlobService(),
  tableSvc = azure.createTableService(),

  entityGen = azure.TableUtilities.entityGenerator,
  OAuth2Client = google.auth.OAuth2,
  plus = google.plus('v1');

// Client ID and client secret are available at
// https://code.google.com/apis/console
var CLIENT_ID = process.env.CLIENT_ID;
var CLIENT_SECRET = process.env.CLIENT_SECRET;
var REDIRECT_URL = process.env.REDIRECT_URI;

// Oauth 2 client
var oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);

module.exports = function (app) {
  app.use('/', router);
};

router.get('/', function (req, res, next) {

  var photos = [];
  
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


  blobSvc.listBlobsSegmented('imagecontainer', null, function(error, result, response){
    if(!error){
      // result contains the entries
      result.entries.forEach(function(entry) {
        // http://sally.blob.core.windows.net/movies/MOV1.AVI
        photos.push("http://" + blobSvc.storageAccount + ".blob.core.windows.net/imagecontainer/"+ entry.name);
      });

      res.render('index', {
        title: 'Welcome to Mosaic Creator',
        images: photos,
        authUrl: url
      });

    } else {
      console.log("Error listing the container", error);

      res.render('index', {
        title: 'Welcome to Mosaic Creator',
        images: [],
        authUrl: url
      });
    }
  });
});

// Upload images to the blob
router.post('/upload', function (req, res) {

  var form = new multiparty.Form();
  
  // Handle form data
  form.on('part', function(part){
    if (part.filename) {

      var size = part.byteCount - part.byteOffset;
      var name = part.filename;

      // See if container exists
      blobSvc.createContainerIfNotExists('imagecontainer', function(error, result, response){
        if(!error){

          // If true, create blob
          blobSvc.createBlockBlobFromStream('imagecontainer', name, part, size, function(error){
            if(!error){
                // Blob uploaded
                // Make a request for analysis
                var queueName = "imagesqueue";

                // Create the queue if it doesn't exist
                queueSvc.createQueueIfNotExists(queueName, function(error, result, response){
                  if(!error){

                      queueSvc.createMessage(queueName, name.toString('ascii'), function(error, result, response){
                      if(!error){
                        
                        // Message inserted

                      } else {
                        console.log("Error inserting the message", error)
                      }
                    });
                  } else {
                    console.log("Error creating the queue", error)
                  }
                });

            } else {
              console.log(error);
            }
          });
        } else {
          console.log(error);
        }
      });
    }
  });

  form.parse(req);
  res.send('OK.. uploading');
});

router.get("/login", function(req,res) {
  

});

// Google OAuth 2 callback
router.get("/oauth2callback", function(req, res) {
  var code = req.query.code;

  oauth2Client.getToken(code, function(err, tokens) {
    // Now tokens contains an access_token and an optional refresh_token. Save them.
    if(!err) {
      console.log(tokens);
      oauth2Client.setCredentials(tokens);
      res.redirect("/");
    }
  });
});