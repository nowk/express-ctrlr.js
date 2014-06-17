
# express-ctrlr

[![Build Status](https://travis-ci.org/nowk/express-ctrlr.js.svg?branch=master)](https://travis-ci.org/nowk/express-ctrlr.js)
[![Code Climate](https://codeclimate.com/github/nowk/express-ctrlr.js.png)](https://codeclimate.com/github/nowk/express-ctrlr.js)
[![David DM](https://david-dm.org/nowk/express-ctrlr.js.png)](https://david-dm.org/nowk/express-ctrlr.js)

Controllers for express.js (4.x.x)

## Install

    npm install express-ctrlr

## Usage

Standard CRUD

    var express = require('express');
    var controller = require('express-ctrlr');
    var app = express();

    var postsCtrl = controller()
      .index(function(req, res, next) { ... })
      .new(function(req, res, next) { ... })
      .create(function(req, res, next) { ... })
      .show(function(req, res, next) { ... })
      .edit(function(req, res, next) { ... })
      .update(function(req, res, next) { ... })
      .patch(function(req, res, next) { ... })
      .destroy(function(req, res, next) { ... });

    app.use('/posts', postsCtrl.router());

Maps routes

    GET    /posts
    GET    /posts/new
    POST   /posts
    GET    /posts/:id
    GET    /posts/:id/edit
    PUT    /posts/:id
    PATCH  /posts/:id
    DELETE /posts/:id

---

Define your own actions

    var postsCtrl = controller()
      .action("/new", function(req, res, next) { ... });

    app.use('/posts', postsCtrl.router());

    // GET /posts/new

`action` defaults to the `GET` method. You can define the method `VERB` of choice.

    var postsCtrl = controller()
      .action("/", {method: 'POST'}, function(req, res, next) { ... });

    app.use('/posts', postsCtrl.router());

    // POST /posts

---

Before actions

    var postsCtrl = controller()
      .before(isAuthenticated())
      .before(csrf())
      .new(function(req, res, next) { ... })
      .create(function(req, res, next) { ... });

    app.use('/posts', postsCtrl.router());

    // /posts/* isAuthenticated()
    // /posts/* csrf()
    // GET  /posts/new
    // POST /posts

---

Order matters, kind of...

    var postsCtrl = controller()
      .create(function(req, res, next) { ... })
      .new(function(req, res, next) { ... })
      .before(isAuthenticated())
      .action("/", function(req, res, next) { ... })
      .before(csrf());

    app.use('/posts', postsCtrl.router());

Will map in this order

    // /posts/* isAuthenticated()
    // /posts/* csrf()
    // GET  /posts
    // GET  /posts/new
    // POST /posts

The mapping order is always

    1 before(s)               (then in the order they were defined)
    2 action(s)               (then in the order they were defined)
    3 <built in crud methods> (this order: index, new, create, show, edit, update, patch, destroy)

Built in crud method order

    1 index
    2 new
    3 create
    4 show
    5 edit
    6 update
    7 patch
    8 destroy

The built in crud methods will always maintain their defined map order regardless of their definition order.

    .show()
    .new()

Will still map as

    // GET /posts/new
    // GET /posts/:id

## License

MIT
