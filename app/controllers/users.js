var express = require('express'),
  router = express.Router(),
  multiparty = require('multiparty'),
  uuid = require('node-uuid'),
  google = require('googleapis'),

  azure = require('azure-storage'),
  queueSvc = azure.createQueueService(),              
  blobSvc = azure.createBlobService(),
  tableSvc = azure.createTableService();


function UsersLists(user) {
  this.user = user;
}

UsersLists.prototype = {
  showTasks: function(req, res) {
    self = this;
    var query = new azure.TableQuery();
    self.user.find(query, function itemsFound(error, items) {
      res.render('index',{title: 'My ToDo List ', users: items});
    });
  },

  addTask: function(req,res) {
    var self = this      
    var item = req.body.item;
    self.user.addItem(item, function itemAdded(error) {
      if(error) {
        throw error;
      }
      res.redirect('/');
    });
  },
}

module.exports = function (app) {
  app.use('/', router);
};

router.get('/users', function (req, res, next) {
	res.send("Users!!");
});