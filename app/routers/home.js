var express = require('express'),
  router = express.Router(),
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

var User = require("../models/user")
var Photo = require("../models/photo")

// Initialize model
var userModel = new User(tableSvc, "users", "allusers");
var photoModel = new Photo(tableSvc, "photos", "allphotos");

// Client ID and client secret are available atvar azure = require('azure-storage');
var entityGen = azure.TableUtilities.entityGenerator;
var uuid = require('node-uuid');
// https://code.google.com/apis/console
var CLIENT_ID = process.env.CLIENT_ID;
var CLIENT_SECRET = process.env.CLIENT_SECRET;
var REDIRECT_URL = process.env.REDIRECT_URI;

// Oauth 2 client
var oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);

var app;

module.exports = function (app_) {
  app = app_;
  app.use('/', router);
};

router.get('/', function (req, res, next) {

  // Check if session is there
  if(req.session && req.session.user) {
    var photos = [];

    // Get photos from table
    var query = new azure.TableQuery()
        .where('PartitionKey eq ?', 'allphotos')
        .and('userId eq ?', req.session.user.googleId._);


    photoModel.find(query, function(err, items) {
      if(err) {
        throw err;
      }

      // result contains the entries
      items.forEach(function(item) {
        // http://sally.blob.core.windows.net/movies/MOV1.AVI
        photos.push({
          url: "http://" + blobSvc.storageAccount + ".blob.core.windows.net/imagecontainer/"
          + item.RowKey._,
          name: item.RowKey._
          });
      });

      res.render('index', {
        title: 'Mosaic Creator - Main',
        images: photos,
        user: req.session.user
      });

    });
    
  } else {
    // Go to landing page
    res.render('landing', {
      title: "Welcome to Mosaic Creator", user: null
    });
  }
});

// Upload images to the blob
router.post('/upload', function (req, res) {

  var form = new multiparty.Form();
  
  // Handle form data
  form.on('part', function(part){
    if (part.filename) {

      // File size
      var size = part.byteCount; //- part.byteOffset;
      
      // Grab extension
      var re = /(?:\.([^.]+))?$/;
      var ext = re.exec(part.filename)[1];  
      // New random name
      var name = uuid.v4() + "." + ext;

      // Make sure that the container exists
      blobSvc.createContainerIfNotExists('imagecontainer', function(error, result, response){
        
        if(!error) {

          // Create blob
          blobSvc.createBlockBlobFromStream('imagecontainer', name, part, size, function(error){
            if(error) {
              console.log("Error creating blob", error);
              
              return;
            }
            // Blob uploaded
            // Make a request for analysis
            var queueName = "imagesqueue";

            // Create 
            // Create the queue if it doesn't exist
            queueSvc.createQueueIfNotExists(queueName, function(error, result, response){
              

              if(error) {
                console.log("Error creating the queue", error);
                return;
              }

              var photoItem = {
                imageName: name,
                hue: -1,
                saturation: -1,
                value: -1,
                local: true,
                thumbnail: "",
                userId: req.session.user.googleId._
              };
              
              // Add entry to user photos
              photoModel.addItem(photoItem, function(err) {

                // Add message the queue
                queueSvc.createMessage(queueName, photoItem.imageName, function(error, result, response){
                
                if(error){
                  console.log("Error inserting the message", error);
                  return;
                }

                // Message inserted
                return;
              });
              

              });
            });
          });
        } else {
          console.log(error);
        }
      });
    }
  });

  form.parse(req);
  res.redirect('/');
});

// Google OAuth 2 callback
router.get("/oauth2callback", function(req, res) {
  var code = req.query.code;
  var self = this;

    oauth2Client.getToken(code, function(err, tokens) {
      // Now tokens contains an access_token and an optional refresh_token. Save them.
      if(!err) {
        oauth2Client.setCredentials(tokens);
        
        getUserProfile(oauth2Client, function(err, profile) {

          if(err) {
            console.log(err);
            res.redirect("/");
            return;
          } else {

            // Find user oc create in the database
            findOrCreateUser(profile, tokens, function(err, user) {
              if(err) {
                console.log(err);
                res.redirect("/");
                return;
              } else {
                // Set session
                req.session.user = user;
                app.locals = req.session.user;
                res.redirect("/");
              }
            });
          }

        });
        
      } else {
        console.log("Error getting token.");
      }
  });
  
});

function getUserProfile(oauth2Client, callback) {
  // retrieve user profile
  plus.people.get({ userId: 'me', auth: oauth2Client }, function(err, profile) {
    callback(err, profile);
  });
};

function findOrCreateUser(profile, tokens, callback) {

  // User query
  var query = new azure.TableQuery()
    .where('googleId eq ?', profile.id);

  userModel.find(query, function(err, results) {

    if(err) {
      callback(err, null);
      return;
    }

    if(results.length == 0) {

      var newUser = {
        email: profile.emails[0].value,
        googleId: profile.id,
        accessToken: tokens.access_token
      };

      userModel.addItem(newUser, function(err) {
        if(err) {
          throw err;
        }
         callback(null, newUser);
      });
    } else {
      callback(err, results[0]);
    }
  });
}