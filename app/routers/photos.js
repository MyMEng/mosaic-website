var express = require('express'),
  router = express.Router();

var multiparty = require('multiparty');
var uuid = require('node-uuid');

// Azure
var azure = require('azure-storage'),
  queueSvc = azure.createQueueService(),              
  blobSvc = azure.createBlobService(),
  tableSvc = azure.createTableService();


module.exports = function (app) {
  app.use('/', router);
};


// Show specific photo
router.get('/photos/:photoId', function (req, res) {
  
  var photoId = req.params.photoId;

  res.render("singlePhoto", {
    title: "Details of photo",
  	photo: {
  		url:  "http://" + blobSvc.storageAccount + ".blob.core.windows.net/imagecontainer/"
          + photoId,
      name: photoId
  	}
  });
});

// Handle uploads for the photo
router.post('/photos/:photoId/upload', function (req, res) {

  var photoId = req.params.photoId;

  console.log(photoId);

  // See how many files to expect
  var form = new multiparty.Form();

  form.on('part', function(part) {

    console.log(part);

    // File size
    var size = part.byteCount - part.byteOffset;

    // Grab extension
    var re = /(?:\.([^.]+))?$/;
    var ext = re.exec(part.filename)[1];  
    // New random name
    var name = uuid.v4() + "." + ext;

  });


  form.parse(req);

  // Go back to the photo
  res.redirect('/photos/' + photoId);
});