var express = require('express'),
  router = express.Router(),
  Article = require('../models/article'),
  multiparty = require('multiparty'),
  azure = require('azure-storage'),
  uuid = require('node-uuid'),
  entityGen = azure.TableUtilities.entityGenerator;

module.exports = function (app) {
  app.use('/', router);
};

router.get('/', function (req, res, next) {

  var articles = [new Article(), new Article()];

  var photos = [];
  var blobSvc = azure.createBlobService();

  blobSvc.listBlobsSegmented('imagecontainer', null, function(error, result, response){
    if(!error){
      // result contains the entries
      result.entries.forEach(function(entry) {
        // http://sally.blob.core.windows.net/movies/MOV1.AVI
        photos.push("http://" + blobSvc.storageAccount + ".blob.core.windows.net/imagecontainer/"+ entry.name);
      });

      res.render('index', {
        title: 'Welcome to Mosaic Creator',
        articles: articles,
        images: photos
      });

    } else {
      console.log("Error listing the container", error);

      res.render('index', {
        title: 'Welcome to Mosaic Creator',
        articles: articles,
        images: []
      });
    }
  });
});


router.post('/upload', function (req, res) {

  var blobSvc = azure.createBlobService();
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
                var queueSvc = azure.createQueueService();
                var queueName = "imagesqueue";

                // Create the queue if it doesn't exist
                queueSvc.createQueueIfNotExists(queueName, function(error, result, response){
                  if(!error){
                     var urlToImage = "http://" + blobSvc.storageAccount + ".blob.core.windows.net/imagecontainer/"+ name;

                     queueSvc.createMessage(queueName, urlToImage.toString('ascii'), function(error, result, response){
                      if(!error){
                        
                        // Message inserted
                        console.log(result)
                        console.log(response)

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