var express = require('express'),
  router = express.Router(),
  Article = require('../models/article'),
  formidable = require('formidable'),
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
  var form = new formidable.IncomingForm();
  res.respond("OK");

  form.onPart = function(part){
    blobSvc.createContainerIfNotExists('imagecontainer', function(error, result, response){
      if(!error){

        blobSvc.createBlockBlobFromStream('imagecontainer', 'image1', part, function(error, result, response){
          if(!error){
              // Blob uploaded
          } else {
            console.log(error);
          }
        });
      } else {
        console.log(error);
      }
    });
  }

  form.parse(req);
  res.send('OK');
});