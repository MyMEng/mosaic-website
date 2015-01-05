var express = require('express'),
  router = express.Router();

var multiparty = require('multiparty');
var uuid = require('node-uuid');
var streamBuffers = require("stream-buffers");
// Azure
var azure = require('azure-storage'),
  queueSvc = azure.createQueueService(),              
  blobSvc = azure.createBlobService(),
  tableSvc = azure.createTableService();

var multer = require('multer');

var Photo = require("../models/photo")

// Initialize model
var photoModel = new Photo(tableSvc, "photos", "allphotos");

module.exports = function (app) {
  app.use('/', router);
};


// Show specific photo
router.get('/photos/:photoId', function (req, res) {
  
  var photoId = req.params.photoId;

  var photos = [];

  // Get photos from table
  var query = new azure.TableQuery()
      .where('parent eq ?', photoId)
      .and('userId eq ?', req.session.user.googleId._);

  photoModel.find(query, function(err, items) {
    if(err) {
      throw err;
    }

    // result contains the entries
    items.forEach(function(item) {
      // http://sally.blob.core.windows.net/movies/MOV1.AVI
      photos.push({
        url: "http://" + blobSvc.storageAccount + ".blob.core.windows.net/smallimages/"
        + item.RowKey._,
        name: item.RowKey._
        });
    });

    res.render("singlePhoto", {
      title: "Details of photo",
      photo: {
        url:  "http://" + blobSvc.storageAccount + ".blob.core.windows.net/imagecontainer/"
            + photoId,
        name: photoId
      },
      images: photos
    });

  });

});

var azureMulter = multer({
  inMemory: true,
  onError: function (error, next) {
    console.log(error)
    next(error)
  },
  onFileUploadComplete: function (file) {
  
    // Convert buffer to strema
    var stream = new streamBuffers.ReadableStreamBuffer();
    stream.put(file.buffer);

    // Create blob
    blobSvc.createBlockBlobFromStream('smallimages', file.name, stream, file.size, function(error){
      if(error) {
        console.log("Error creating blob", error);
      } else {
        console.log("Upoaded", file.name);
      }
    });
  }
});

// Handle uploads for the photo
router.post('/photos/:photoId/upload', azureMulter, function(req, res) {
    console.log("After upload")
  
  var photoId = req.params.photoId;

  if(req.files.minatures.length)
  {
    var fileCount = req.files.minatures.length;
    var filesReported = 0;

    req.files.minatures.forEach(function(file) {
      createTableAndSendToQueue(req, res, file, function() {
        filesReported++;

        if(filesReported == fileCount) {
          onUploadFinished(req, res);
        }
      });
    });

  } else {
    createTableAndSendToQueue(req, res, req.files.minatures, onUploadFinished);
  }
});

function onUploadFinished(req, res) {

  var photoId = req.params.photoId;

  res.redirect('/photos/' + photoId);
}

function createTableAndSendToQueue (req, res, file, callback) {

    var photoId = req.params.photoId;

    // Make a request for analysis
    var queueName = "smallimagesqueue";

    // Create the queue if it doesn't exist
    queueSvc.createQueueIfNotExists(queueName, function(error, result, response){
      
      if(error) {
        console.log("Error creating the queue", error);
        return;
      }

      var photoItem = {
        imageName: file.name,
        userId: req.session.user.googleId._,
        parent: photoId,
      };
        
      // Add entry to user photos
      photoModel.addItem(photoItem, function(err) {
        if(err) {
          console.log("Error inserting photo", err);
        }

        // Add message the queue
        queueSvc.createMessage(queueName, photoItem.imageName, function(error, result, response){
        
          if(error){
            console.log("Error inserting the message", error);
            return;
          }

          // Message inserted
          if(callback) {
            callback(req, res);
          }
        });
      });
    });
}