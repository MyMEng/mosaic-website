var azure = require("azure-storage");

function UsersLists(user) {
  this.user = user;
}

UsersLists.prototype = {
  showUsers: function(req, res) {
    self = this;
    var query = new azure.TableQuery();
    self.user.find(query, function itemsFound(error, items) {
      res.render('users',{title: 'All users', users: items});
    });
  },

  addUser: function(req,res) {
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

module.exports = UsersLists;