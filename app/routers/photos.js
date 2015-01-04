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

var fs = require('fs');
// Handle uploads for the photo
router.post('/photos/:photoId/upload', function (req, res) {

  var photoId = req.params.photoId;

  console.log(photoId);

  // See how many files to expect
  var form = new multiparty.Form();

  var bytesReadSoFar = 0;

  var filesList = {};

  form.on('file', function(fieldname, file) {

    var filename = file.originalFilename;

    // Grab extension
    var re = /(?:\.([^.]+))?$/;
    var ext = re.exec(filename)[1];  
    // New random name
    var name = uuid.v4() + "." + ext;

    // Find size
    var size = file.size;

    bytesReadSoFar += size;

    console.log("Actual size for " + filename + " is " + size);
    
    // Open stream to the file
    var stream = fs.createReadStream(file.path);

    // Create blob
    blobSvc.createBlockBlobFromStream('smallimages', name, stream, size, function(error){
      if(error) {
        console.log("Error creating blob", error);
      } else {
        console.log("Upoaded", name, filename);
      }
    });

    console.log("Attempting to upload", {
      filename: filename,
      size: file.size,
    });

    if(bytesReadSoFar == form.totalFileSize) {
      // Go back to the photo
      res.redirect('/photos/' + photoId);
    }

  });

  form.parse(req);
});