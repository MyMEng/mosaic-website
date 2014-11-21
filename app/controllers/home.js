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
    res.render('index', {
      title: 'Welcome to Mosaic Creator',
      articles: articles
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
                // (...)

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
  res.send('OK');
});